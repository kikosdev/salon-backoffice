import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import type { AtRiskEntry, AuditLogEntry, MetricsOverview, MrrHistoryPoint, Paginated, UpsellEntry } from '@/lib/api-types';
import { bar, money, pctStyle, silentStyle } from '@/lib/style';
import { useUiStore } from '@/store/useUiStore';
import { Card, EmptyState, ErrorState, TableSkeleton } from '@/components/common';

type LoadState = 'loading' | 'error' | 'ready';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function activityColor(action: string): string {
  const a = action.toUpperCase();
  if (a.includes('SUSPEND') || a.includes('CHURN')) return 'var(--danger)';
  if (a.includes('PAID')) return 'var(--s-active-fg)';
  if (a.includes('IMPERSONATION')) return 'var(--s-provisioning-fg)';
  return 'var(--accent)';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const openImpModal = useUiStore((s) => s.openImpModal);
  const canImpersonate = role === 'superadmin' || role === 'support';
  // [Prompt 6/7] /metrics/* est superadmin+billing UNIQUEMENT côté backend (support exclu,
  // domaine "facturation") — masqué ici plutôt que tenté-puis-403 (point 4 du Prompt 8).
  const canSeeMetrics = role === 'superadmin' || role === 'billing';

  const [metricsState, setMetricsState] = useState<LoadState>('loading');
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [mrrHistory, setMrrHistory] = useState<MrrHistoryPoint[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskEntry[]>([]);
  const [upsell, setUpsell] = useState<UpsellEntry[]>([]);
  const [metricsReloadKey, setMetricsReloadKey] = useState(0);

  const [auditState, setAuditState] = useState<LoadState>('loading');
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [auditReloadKey, setAuditReloadKey] = useState(0);

  useEffect(() => {
    if (!canSeeMetrics) return;
    let cancelled = false;
    setMetricsState('loading');
    Promise.all([
      apiGet<MetricsOverview>('/metrics/overview'),
      apiGet<MrrHistoryPoint[]>('/metrics/mrr-history?months=12'),
      apiGet<AtRiskEntry[]>('/metrics/at-risk'),
      apiGet<UpsellEntry[]>('/metrics/upsell'),
    ])
      .then(([o, h, r, u]) => {
        if (cancelled) return;
        setOverview(o);
        setMrrHistory(h);
        setAtRisk(r);
        setUpsell(u);
        setMetricsState('ready');
      })
      .catch(() => {
        if (!cancelled) setMetricsState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeMetrics, metricsReloadKey]);

  useEffect(() => {
    let cancelled = false;
    setAuditState('loading');
    apiGet<Paginated<AuditLogEntry>>('/audit?limit=6')
      .then((res) => {
        if (!cancelled) {
          setActivity(res.items);
          setAuditState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setAuditState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [auditReloadKey]);

  const totalTenants = overview ? Object.values(overview.byPlan).reduce((a, b) => a + b, 0) : 0;
  const prevMrr = mrrHistory.length >= 2 ? mrrHistory[mrrHistory.length - 2].mrr : null;
  const mrrDeltaPct = overview && prevMrr && prevMrr > 0 ? ((overview.mrr - prevMrr) / prevMrr) * 100 : null;

  const stats = overview
    ? [
        { label: 'MRR', value: money(overview.mrr), delta: mrrDeltaPct !== null ? `${mrrDeltaPct >= 0 ? '+' : ''}${mrrDeltaPct.toFixed(1)}%` : null, up: (mrrDeltaPct ?? 0) >= 0, note: 'vs last month' },
        { label: 'ARR', value: money(overview.arr), delta: mrrDeltaPct !== null ? `${mrrDeltaPct >= 0 ? '+' : ''}${mrrDeltaPct.toFixed(1)}%` : null, up: (mrrDeltaPct ?? 0) >= 0, note: 'annualised' },
        { label: 'Active tenants', value: String(overview.activeCount), delta: null, up: true, note: `of ${totalTenants} accounts` },
        { label: 'Trials in progress', value: String(overview.trialCount), delta: null, up: true, note: 'currently on trial' },
        { label: 'Monthly churn', value: `${overview.churnRatePct.toFixed(1)}%`, delta: null, up: overview.churnRatePct === 0, note: `${overview.churnedThisMonth} churned this month` },
      ]
    : [];

  const chartMax = Math.max(1, ...mrrHistory.map((p) => p.mrr));
  const yTicks = [1, 0.75, 0.5, 0.25].map((f) => money(chartMax * f));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1500 }}>
      {!canSeeMetrics && (
        <div style={{ padding: '9px 12px', borderRadius: 6, background: 'var(--panel2)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--tx3)' }}>
          Revenue metrics (MRR/ARR, at-risk, upsell) are limited to superadmin and billing roles.
        </div>
      )}

      {canSeeMetrics && metricsState === 'loading' && <TableSkeleton rows={3} />}
      {canSeeMetrics && metricsState === 'error' && (
        <ErrorState title="Couldn't load metrics" body="The Control Plane API didn't respond." req="GET /metrics/overview" actions={<button onClick={() => setMetricsReloadKey((k) => k + 1)} style={{ height: 26, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11.5 }}>Retry</button>} />
      )}

      {canSeeMetrics && metricsState === 'ready' && overview && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--tx3)' }}>{s.label}</span>
                <code style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.02em' }}>{s.value}</code>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  {s.delta && <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: s.up ? 'var(--s-active-fg)' : 'var(--s-past_due-fg)' }}>{s.delta}</span>}
                  <span style={{ color: 'var(--tx3)' }}>{s.note}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 12 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>MRR trend</span>
                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>last {mrrHistory.length} months</span>
                </div>
              </div>
              {mrrHistory.every((p) => p.mrr === 0) ? (
                <EmptyState title="No revenue yet" body="MRR lights up once an invoice is marked paid (Billing)." />
              ) : (
                <div style={{ padding: '14px 12px 10px', display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 150, paddingBottom: 17, alignItems: 'flex-end', minWidth: 44 }}>
                    {yTicks.map((y) => <code key={y} style={{ fontSize: 10, color: 'var(--tx3)' }}>{y}</code>)}
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                      <div style={{ height: 1, background: 'var(--line2)' }} />
                      <div style={{ height: 1, background: 'var(--line2)' }} />
                      <div style={{ height: 1, background: 'var(--line2)' }} />
                      <div style={{ height: 1, background: 'var(--line)' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, position: 'relative' }}>
                      {mrrHistory.map((p, i) => (
                        <div key={p.period} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', gap: 5 }} title={p.period + ' · ' + money(p.mrr)}>
                          <div style={{ height: (p.mrr / chartMax) * 100 + '%', borderRadius: '3px 3px 0 0', background: i === mrrHistory.length - 1 ? 'var(--accent)' : 'var(--barc)' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, paddingTop: 5 }}>
                      {mrrHistory.map((p) => <code key={p.period} style={{ flex: 1, textAlign: 'center', fontSize: 9.5, color: 'var(--tx3)' }}>{new Date(p.period + '-01').toLocaleDateString('en', { month: 'short' })}</code>)}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <RecentActivityCard state={auditState} activity={activity} onRetry={() => setAuditReloadKey((k) => k + 1)} navigate={navigate} />
          </div>

          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>At-risk tenants</span>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>no appointment in 7+ days (or never) · sorted by days of silence</span>
              </div>
              {atRisk.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, padding: '0 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: 'var(--s-past_due-fg)', background: 'var(--s-past_due-bg)', border: '1px solid var(--s-past_due-bd)' }}>
                  {atRisk.length} need a call
                </span>
              )}
            </div>
            {atRisk.length === 0 ? (
              <EmptyState title="No at-risk tenants" body="Every active tenant has had a recent appointment." />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Tenant</th>
                    <th style={{ textAlign: 'right' }}>Days silent</th>
                    <th>Last appointment</th>
                    <th style={{ width: '1%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((r) => (
                    <tr key={r.tenantMongoId}>
                      <td><div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}><span style={{ fontWeight: 500 }}>{r.name}</span><code style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{r.slug}</code></div></td>
                      <td style={{ textAlign: 'right' }}><code style={silentStyle(r.daysSinceLastAppointment ?? 999)}>{r.daysSinceLastAppointment !== null ? `${r.daysSinceLastAppointment}d` : 'never'}</code></td>
                      <td style={{ color: 'var(--tx2)', fontSize: 12 }}>{r.lastAppointmentCreatedAt ? new Date(r.lastAppointmentCreatedAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          {canImpersonate && <button onClick={() => openImpModal(r.slug)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Log in as</button>}
                          <button onClick={() => navigate('/tenants/' + r.slug)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Open</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Upsell candidates</span>
              <span style={{ fontSize: 11, color: 'var(--tx3)' }}>at 80%+ of staff or location limit</span>
            </div>
            {upsell.length === 0 ? (
              <EmptyState title="No upsell candidates" body="No tenant is currently within 80% of a plan limit." />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '26%' }}>Tenant</th><th>Plan</th><th>Pressure</th><th style={{ width: '1%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {upsell.map((u) => (
                    <tr key={u.tenantMongoId}>
                      <td><div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}><span style={{ fontWeight: 500 }}>{u.name}</span><code style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{u.slug}</code></div></td>
                      <td><code style={{ color: 'var(--tx2)' }}>{u.planId}</code></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {u.triggers.map((t) => (
                            <div key={t.dimension} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <code style={{ fontSize: 11, color: 'var(--tx2)', minWidth: 76 }}>{t.dimension} {t.usage}/{t.limit}</code>
                              <div style={{ width: 74, height: 5, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}><div style={bar(t.usagePct)} /></div>
                              <code style={pctStyle(t.usagePct)}>{Math.round(t.usagePct)}%</code>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td><button onClick={() => navigate('/tenants/' + u.slug)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!canSeeMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <RecentActivityCard state={auditState} activity={activity} onRetry={() => setAuditReloadKey((k) => k + 1)} navigate={navigate} />
        </div>
      )}
    </div>
  );
}

function RecentActivityCard({ state, activity, onRetry, navigate }: { state: LoadState; activity: AuditLogEntry[]; onRetry: () => void; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <Card
      title="Recent activity"
      action={<button onClick={() => navigate('/audit')} style={{ background: 'transparent', border: 0, color: 'var(--accent)', fontSize: 11, padding: 0 }}>Full audit log</button>}
    >
      {state === 'loading' && <TableSkeleton rows={4} />}
      {state === 'error' && <ErrorState title="Couldn't load activity" body="The Control Plane API didn't respond." req="GET /audit?limit=6" actions={<button onClick={onRetry} style={{ height: 26, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11.5 }}>Retry</button>} />}
      {state === 'ready' && activity.length === 0 && <EmptyState title="No activity yet" body="Admin actions will show up here as they happen." />}
      {state === 'ready' && activity.length > 0 && (
        <div style={{ padding: '4px 12px 8px', overflow: 'auto', maxHeight: 238 }}>
          {activity.map((a) => (
            <div key={a._id} style={{ display: 'flex', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--line2)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flex: 'none', background: activityColor(a.action) }} />
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11.5, color: 'var(--tx)' }}>
                  <span style={{ fontWeight: 600 }}>{a.adminEmail}</span> {a.action.replace(/_/g, ' ').toLowerCase()} {a.tenantId && <code style={{ color: 'var(--tx2)' }}>{a.tenantId}</code>}
                </div>
                <code style={{ fontSize: 10, color: 'var(--tx3)' }}>{relativeTime(a.at)}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
