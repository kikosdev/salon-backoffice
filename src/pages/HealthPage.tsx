import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { HealthStatus } from '@/lib/api-types';
import { badge } from '@/lib/style';
import { Card, ErrorState, TableSkeleton } from '@/components/common';

type LoadState = 'loading' | 'error' | 'ready';

/**
 * [Prompt 8] Le mock affichait une grille de 4 "services" et un tableau de latence/erreurs
 * par tenant — AUCUN équivalent côté backend : `GET /health` (public, sans garde) ne
 * renvoie que `{status, mongo, dpReachable}`. Pas d'APM, pas de métriques par requête, pas
 * de télémétrie par tenant dans ce projet à ce stade. Affiche honnêtement ce qui existe
 * plutôt que de fabriquer des chiffres plausibles.
 */
export function HealthPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiGet<HealthStatus>('/health')
      .then((h) => {
        if (!cancelled) {
          setHealth(h);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state === 'loading') return <TableSkeleton rows={3} />;
  if (state === 'error' || !health) {
    return <ErrorState title="Could not reach the Control Plane" body="GET /health didn't respond — the API itself may be down." req="GET /health" actions={<button onClick={() => setReloadKey((k) => k + 1)} style={{ height: 27, padding: '0 10px', borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12 }}>Retry</button>} />;
  }

  const rows = [
    { name: 'Control Plane API', ok: health.status === 'ok' },
    { name: 'MongoDB (salonos_admin)', ok: health.mongo },
    { name: 'Data Plane reachability', ok: health.dpReachable },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.name} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.ok ? 'var(--s-active-fg)' : 'var(--danger)', animation: r.ok ? undefined : 'pul 1.6s ease-in-out infinite' }} />
              <code style={{ fontSize: 12, color: 'var(--tx)' }}>{r.name}</code>
              <span style={{ flex: 1 }} />
              <span style={badge(r.ok ? 'active' : 'past_due')}>{r.ok ? 'healthy' : 'down'}</span>
            </div>
          </div>
        ))}
      </div>

      <Card title="What isn't monitored yet">
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--tx3)' }}>
            This project doesn't have per-request telemetry (latency, error rate, requests/min) or per-tenant health
            monitoring yet — <code style={{ color: 'var(--tx2)' }}>GET /health</code> only reports the three checks
            above. A dashboard with real per-tenant metrics would need an APM integration that hasn't been built.
          </span>
        </div>
      </Card>
    </div>
  );
}
