import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import type { ImpersonationSessionRecord, Paginated } from '@/lib/api-types';
import { Card, EmptyState, ErrorState, TableSkeleton } from '@/components/common';
import { useUiStore } from '@/store/useUiStore';

type LoadState = 'loading' | 'error' | 'ready';

export function ImpersonationPage() {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const imp = useUiStore((s) => s.imp);
  const endImpersonation = useUiStore((s) => s.endImpersonation);
  // [Prompt 8] `GET /impersonations` est `superadmin`+`support` UNIQUEMENT côté backend —
  // `billing` en est exclu même pour la LECTURE (pas seulement le déclenchement), matrice
  // Prompt 5 : "lire la liste des sessions n'est pas une préoccupation facturation."
  const canSee = role === 'superadmin' || role === 'support';

  const [state, setState] = useState<LoadState>('loading');
  const [rows, setRows] = useState<ImpersonationSessionRecord[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canSee) return;
    let cancelled = false;
    setState('loading');
    apiGet<Paginated<ImpersonationSessionRecord>>('/impersonations?limit=50')
      .then((res) => {
        if (!cancelled) {
          setRows(res.items);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [canSee, reloadKey]);

  if (!canSee) {
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '40px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: 12.5, color: 'var(--tx3)' }}>Impersonation is limited to superadmin and support operators.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1200 }}>
      {imp ? (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)', borderRadius: 6, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>Active session</span>
          <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Logged in as the owner of <code style={{ color: 'var(--tx)' }}>{imp.tenantName}</code></span>
          <span style={{ flex: 1 }} />
          <a href={imp.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ height: 26, display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11.5, textDecoration: 'none' }}>Reopen tenant app</a>
          <button onClick={() => navigate('/tenants/' + imp.tenantSlug)} style={{ height: 26, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11.5 }}>Open tenant</button>
          <button onClick={() => endImpersonation()} style={{ height: 26, padding: '0 10px', borderRadius: 5, border: '1px solid var(--danger-bd)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 11.5, fontWeight: 600 }}>End session</button>
        </div>
      ) : (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '13px 14px' }}>
          <span style={{ fontSize: 12, color: 'var(--tx3)' }}>No active impersonation session. Use "Log in as…" from a tenant page to start one.</span>
        </div>
      )}

      <Card title="Impersonation history · visible to superadmin and support">
        {state === 'loading' && <TableSkeleton rows={5} />}
        {state === 'error' && <ErrorState title="Could not load history" body="The Control Plane API didn't respond." req="GET /impersonations" actions={<button onClick={() => setReloadKey((k) => k + 1)} style={{ height: 27, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 12 }}>Retry</button>} />}
        {state === 'ready' && rows.length === 0 && <EmptyState title="No impersonation sessions yet" body="Every session, once started, is logged here permanently." />}
        {state === 'ready' && rows.length > 0 && (
          <table>
            <thead><tr><th>Started</th><th>Admin</th><th>Tenant</th><th>Ended</th><th>Reason</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td><code style={{ color: 'var(--tx3)' }}>{new Date(r.startedAt).toLocaleString()}</code></td>
                  <td style={{ color: 'var(--tx2)' }}>{r.adminEmail}</td>
                  <td><code style={{ color: 'var(--tx2)' }}>{r.tenantId}</code></td>
                  <td>{r.endedAt ? <code style={{ color: 'var(--tx3)' }}>{new Date(r.endedAt).toLocaleString()}</code> : <span style={{ color: 'var(--s-active-fg)', fontSize: 11, fontWeight: 600 }}>active</span>}</td>
                  <td style={{ color: 'var(--tx2)', whiteSpace: 'normal', maxWidth: 360 }}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
