import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { PlanRecord, UsageSnapshotRecord } from '@/lib/api-types';
import { bar, pctStyle } from '@/lib/style';
import { Card, EmptyState, TableSkeleton } from '@/components/common';
import type { TenantTabProps } from './index';

export function UsageTab({ tenant }: TenantTabProps) {
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

  if (loading) return <Card title="Usage vs plan limits"><TableSkeleton rows={4} /></Card>;
  if (!snapshot) {
    return (
      <Card title="Usage vs plan limits">
        <EmptyState title="No usage snapshot yet" body="The hourly usage collector hasn't run for this tenant yet — check back within the hour." />
      </Card>
    );
  }

  const UB: [string, number, number | undefined, string][] = [
    ['Staff seats', snapshot.staffCount, plan?.limits.staffMax, ''],
    ['Locations', snapshot.locationCount, plan?.limits.locationsMax, ''],
    ['Appointments / month', snapshot.appointmentsMonth, plan?.limits.appointmentsMonth, ''],
  ];
  const usageBars = UB.map(([label, value, lim, unit]) => {
    const unlimited = lim === undefined || lim === -1;
    const pct = !unlimited && lim ? Math.round((value / lim) * 100) : 0;
    return { label, value: value.toLocaleString('en-US') + ' / ' + (unlimited ? 'unlimited' : lim!.toLocaleString('en-US')) + (unit ? ' ' + unit : ''), pct: unlimited ? 0 : pct };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Card title="Usage vs plan limits">
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {usageBars.map((u) => (
            <div key={u.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{u.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ fontSize: 11.5, color: 'var(--tx2)' }}>{u.value}</code>
                  <code style={pctStyle(u.pct)}>{u.pct}%</code>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
                <div style={bar(u.pct || 4)} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px' }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>
          SMS credits ({snapshot.smsMonth}) and storage ({snapshot.storageMb} MB) are collected but not yet tracked for real by the Data Plane — both always read 0 until that tracking ships. Not used for any quota alert.
        </span>
      </div>
    </div>
  );
}
