import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { PlanRecord, UsageSnapshotRecord } from '@/lib/api-types';
import { Card, KVRow, TableSkeleton } from '@/components/common';
import type { TenantTabProps } from './index';

export function OverviewTab({ tenant }: TenantTabProps) {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<UsageSnapshotRecord | null>(null);
  const [plan, setPlan] = useState<PlanRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiGet<UsageSnapshotRecord[]>(`/tenants/${tenant._id}/usage-history`).catch(() => []),
      tenant.planId ? apiGet<PlanRecord>(`/plans/${tenant.planId}`).catch(() => null) : Promise.resolve(null),
    ]).then(([snapshots, p]) => {
      if (cancelled) return;
      setSnapshot(snapshots[0] ?? null); // trié desc par collectedAt côté backend
      setPlan(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tenant._id, tenant.planId]);

  const overviewRows: [string, string][] = [
    ['Owner', tenant.owner.name], ['Owner email', tenant.owner.email], ['Owner phone', tenant.owner.phone],
    ['Tenant id', tenant.tenantId], ['Slug', tenant.slug], ['Country', tenant.country],
    ['Timezone', tenant.timezone], ['Currency', tenant.currency], ['Deployment', tenant.deployment],
    ['Created', new Date(tenant.createdAt).toLocaleString()],
  ];

  const daysSinceLastAppt = snapshot?.lastAppointmentCreatedAt
    ? Math.floor((Date.now() - new Date(snapshot.lastAppointmentCreatedAt).getTime()) / 86_400_000)
    : null;

  const quickStats = [
    { label: 'Staff', value: snapshot ? `${snapshot.staffCount} / ${plan && plan.limits.staffMax !== -1 ? plan.limits.staffMax : '∞'}` : '—', note: 'seats used' },
    { label: 'Locations', value: snapshot ? `${snapshot.locationCount} / ${plan && plan.limits.locationsMax !== -1 ? plan.limits.locationsMax : '∞'}` : '—', note: 'branches' },
    { label: 'Appointments', value: snapshot ? snapshot.appointmentsMonth.toLocaleString('en-US') : '—', note: 'this month' },
    { label: 'Last appointment', value: daysSinceLastAppt === null ? 'never' : daysSinceLastAppt === 0 ? 'today' : `${daysSinceLastAppt}d ago`, note: snapshot ? `collected ${new Date(snapshot.collectedAt).toLocaleDateString()}` : 'not yet collected' },
  ];

  // Lifecycle réel : Created (toujours), trialEndsAt/suspendedAt/churnedAt sont les seules
  // dates réellement posées par le backend — pas de "Renewal" fictif (aucun champ pour ça).
  const lifecycle: { label: string; date: string; on: boolean }[] = [
    { label: 'Created', date: new Date(tenant.createdAt).toLocaleDateString(), on: true },
  ];
  if (tenant.trialEndsAt) lifecycle.push({ label: 'Trial ends', date: new Date(tenant.trialEndsAt).toLocaleDateString(), on: tenant.status === 'trial' });
  if (tenant.suspendedAt) lifecycle.push({ label: 'Suspended', date: new Date(tenant.suspendedAt).toLocaleDateString(), on: tenant.status === 'suspended' });
  if (tenant.churnedAt) lifecycle.push({ label: 'Churned', date: new Date(tenant.churnedAt).toLocaleDateString(), on: tenant.status === 'churned' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Card title="Owner & account">
        <div style={{ padding: '2px 0' }}>
          {overviewRows.map(([k, v]) => <KVRow key={k} k={k} v={v} />)}
          {tenant.provisionError && <KVRow k="Provision error" v={tenant.provisionError} />}
        </div>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <TableSkeleton rows={2} />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {quickStats.map((s) => (
                <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--tx3)' }}>{s.label}</span>
                  <code style={{ fontSize: 16, fontWeight: 600 }}>{s.value}</code>
                  <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{s.note}</span>
                </div>
              ))}
            </div>
            {!snapshot && (
              <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>No usage snapshot collected yet — the hourly collector hasn't run for this tenant.</span>
            )}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Lifecycle</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {lifecycle.map((l) => (
                  <div key={l.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ height: 4, borderRadius: 2, background: l.on ? 'var(--accent)' : 'var(--line)' }} />
                    <span style={{ fontSize: 11, fontWeight: l.on ? 600 : 400, color: l.on ? 'var(--tx)' : 'var(--tx3)' }}>{l.label}</span>
                    <code style={{ fontSize: 10, color: 'var(--tx3)' }}>{l.date}</code>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
