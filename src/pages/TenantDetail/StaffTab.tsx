import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { PlanRecord, UsageSnapshotRecord } from '@/lib/api-types';
import { Card, TableSkeleton } from '@/components/common';
import type { TenantTabProps } from './index';

/**
 * [Prompt 8] Le mock avait un CRUD complet (add/edit/disable/remove staff) — SANS
 * équivalent côté `salonos-admin` : le personnel appartient au Data Plane (`salon-backend`),
 * pas au Control Plane, qui n'expose qu'un COMPTE (`usage-history`), jamais la liste
 * nominative. Plutôt que de garder une UI qui semblerait fonctionner sans jamais rien
 * persister nulle part, ce tab affiche honnêtement ce qui existe réellement : le compte de
 * sièges utilisés/limite, et où gérer le personnel pour de vrai.
 */
export function StaffTab({ tenant }: TenantTabProps) {
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
      setSnapshot(snapshots[0] ?? null);
      setPlan(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tenant._id, tenant.planId]);

  const limit = plan && plan.limits.staffMax !== -1 ? plan.limits.staffMax : null;
  const used = snapshot?.staffCount ?? null;
  const pct = used !== null && limit ? Math.round((used / limit) * 100) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Card title="Staff seats">
        {loading ? (
          <TableSkeleton rows={1} />
        ) : (
          <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <code style={{ fontSize: 22, fontWeight: 600 }}>{used ?? '—'}</code>
              <span style={{ fontSize: 13, color: 'var(--tx3)' }}>/ {limit ?? '∞'} seats used</span>
            </div>
            {pct !== null && (
              <div style={{ width: 220, height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
                <div style={{ width: Math.min(100, pct) + '%', height: '100%', borderRadius: 3, background: pct >= 95 ? 'var(--danger)' : pct >= 80 ? 'var(--s-past_due-fg)' : 'var(--accent)' }} />
              </div>
            )}
            {!snapshot && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>No usage snapshot collected yet.</span>}
          </div>
        )}
      </Card>
      <div style={{ background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 6, padding: '12px 14px' }}>
        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>
          Individual staff members (add, edit, disable) are managed from the tenant's own app, not the Control Plane —
          <code style={{ color: 'var(--tx2)' }}> salonos-admin</code> only tracks the aggregate seat count shown above.
        </span>
      </div>
    </div>
  );
}
