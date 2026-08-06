import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { resolveTenantBySlug, fetchTenantDetail } from '@/lib/tenants';
import type { SubscriptionRecord, TenantRecord } from '@/lib/api-types';
import { badge, money } from '@/lib/style';
import { useUiStore } from '@/store/useUiStore';
import { ErrorState, TableSkeleton } from '@/components/common';
import { OverviewTab } from './OverviewTab';
import { SubscriptionTab } from './SubscriptionTab';
import { StaffTab } from './StaffTab';
import { UsageTab } from './UsageTab';
import { AuditTab } from './AuditTab';
import { DangerTab } from './DangerTab';

type TabKey = 'overview' | 'subscription' | 'staff' | 'usage' | 'audit' | 'danger';
const TABS: [TabKey, string][] = [
  ['overview', 'Overview'], ['subscription', 'Subscription'], ['staff', 'Staff'],
  ['usage', 'Usage'], ['audit', 'Audit'], ['danger', 'Danger zone'],
];

export interface TenantTabProps {
  tenant: TenantRecord;
  subscription: SubscriptionRecord | null;
  reload: () => void;
}

export function TenantDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const openImpModal = useUiStore((s) => s.openImpModal);
  const [tab, setTab] = useState<TabKey>('overview');

  const [state, setState] = useState<'loading' | 'error' | 'notfound' | 'ready'>('loading');
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);

  const load = useCallback(() => {
    if (!slug) return;
    setState('loading');
    resolveTenantBySlug(slug)
      .then((t) => {
        if (!t) {
          setState('notfound');
          return null;
        }
        return fetchTenantDetail(t._id);
      })
      .then((detail) => {
        if (!detail) return;
        setTenant(detail.tenant);
        setSubscription(detail.subscription);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') return <TableSkeleton rows={6} />;
  if (state === 'notfound') {
    return <ErrorState title="Tenant not found" body={`No tenant with slug "${slug}" exists.`} req={`GET /tenants?search=${slug}`} actions={<button onClick={() => navigate('/tenants')} style={{ height: 27, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 12 }}>Back to tenants</button>} />;
  }
  if (state === 'error' || !tenant) {
    return <ErrorState title="Could not load this tenant" body="The Control Plane API didn't respond." req={`GET /tenants/:id`} actions={<button onClick={load} style={{ height: 27, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 12 }}>Retry</button>} />;
  }

  const canImpersonate = role === 'superadmin' || role === 'support';
  const canBill = role === 'superadmin' || role === 'billing';
  const tabProps: TenantTabProps = { tenant, subscription, reload: load };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button onClick={() => navigate('/tenants')} style={{ height: 26, padding: '0 9px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--tx2)', fontSize: 11.5 }}>← Tenants</button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.01em' }}>{tenant.name}</span>
            <span style={badge(tenant.status)}>{tenant.status}</span>
            <code style={{ color: 'var(--tx3)' }}>{tenant.slug}</code>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--tx3)', flexWrap: 'wrap' }}>
            <span>Plan <code style={{ color: 'var(--tx2)' }}>{tenant.planId ?? '—'}</code></span>
            <span>Deployment <code style={{ color: 'var(--tx2)' }}>{tenant.deployment}</code></span>
            {subscription && <span>Cycle <code style={{ color: 'var(--tx2)' }}>{subscription.billingCycle}</code></span>}
            <span>Tenant id <code style={{ color: 'var(--tx2)' }}>{tenant.tenantId}</code></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {canImpersonate && <button onClick={() => openImpModal(tenant._id)} style={{ height: 28, padding: '0 11px', borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500 }}>Log in as…</button>}
          {canBill && <button onClick={() => setTab('subscription')} style={{ height: 28, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--tx2)', fontSize: 12 }}>Invoices</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--line)' }}>
        {TABS.map(([key, label]) => {
          const on = tab === key;
          const dz = key === 'danger';
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ height: 30, padding: '0 11px', border: 0, borderBottom: '2px solid ' + (on ? (dz ? 'var(--danger)' : 'var(--accent)') : 'transparent'), background: 'transparent', color: on ? (dz ? 'var(--danger)' : 'var(--tx)') : 'var(--tx3)', fontSize: 12.5, fontWeight: on ? 600 : 400, marginBottom: -1 }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab {...tabProps} />}
      {tab === 'subscription' && <SubscriptionTab {...tabProps} />}
      {tab === 'staff' && <StaffTab {...tabProps} />}
      {tab === 'usage' && <UsageTab {...tabProps} />}
      {tab === 'audit' && <AuditTab {...tabProps} />}
      {tab === 'danger' && <DangerTab {...tabProps} />}
    </div>
  );
}
