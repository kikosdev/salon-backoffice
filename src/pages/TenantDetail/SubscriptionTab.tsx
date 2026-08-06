import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { InvoiceRecord, Paginated } from '@/lib/api-types';
import { invBadge, money } from '@/lib/style';
import { Card, EmptyState, KVRow, TableSkeleton } from '@/components/common';
import type { TenantTabProps } from './index';

export function SubscriptionTab({ tenant, subscription }: TenantTabProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiGet<Paginated<InvoiceRecord>>(`/invoices?tenantId=${encodeURIComponent(tenant.tenantId)}&limit=10`)
      .then((res) => {
        if (!cancelled) {
          setInvoices(res.items);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.tenantId]);

  const subRows: [string, string][] = subscription
    ? [
        ['Plan', tenant.planId ?? '—'],
        ['Subscription status', subscription.status],
        ['Billing cycle', subscription.billingCycle],
        ['Current period start', new Date(subscription.currentPeriodStart).toLocaleDateString()],
        ['Current period end', new Date(subscription.currentPeriodEnd).toLocaleDateString()],
        ['Provider', subscription.provider],
        ['Dunning stage', subscription.dunningStage ?? 'none'],
        ['Cancel at period end', subscription.cancelAtPeriodEnd ? 'yes' : 'no'],
      ]
    : [['Subscription', 'No subscription record for this tenant yet.']];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Card title="Subscription">
        <div>{subRows.map(([k, v]) => <KVRow key={k} k={k} v={v} />)}</div>
      </Card>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 600 }}>Invoice history</div>
        {state === 'loading' && <TableSkeleton rows={3} />}
        {state === 'error' && <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--tx3)' }}>Could not load invoices.</div>}
        {state === 'ready' && invoices.length === 0 && <EmptyState title="No invoices yet" body="Invoices are generated automatically 3 days before the billing period ends." />}
        {state === 'ready' && invoices.length > 0 && (
          <table>
            <thead><tr><th>Number</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th>Due</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i._id}>
                  <td><code style={{ color: 'var(--tx2)' }}>#{i.number}</code></td>
                  <td style={{ textAlign: 'right' }}><code>{money(i.total, i.currency)}</code></td>
                  <td><span style={invBadge(i.status)}>{i.status}</span></td>
                  <td><code style={{ color: 'var(--tx3)' }}>{new Date(i.dueAt).toLocaleDateString()}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
