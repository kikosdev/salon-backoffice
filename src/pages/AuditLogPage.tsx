import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { AuditLogEntry, Paginated } from '@/lib/api-types';
import { Card, ErrorState, TableSkeleton, EmptyState, selectStyle } from '@/components/common';

type LoadState = 'loading' | 'error' | 'ready';

export function AuditLogPage() {
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [state, setState] = useState<LoadState>('loading');
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    const params = new URLSearchParams();
    if (adminId.trim()) params.set('adminId', adminId.trim());
    if (action.trim()) params.set('action', action.trim());
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '50');

    apiGet<Paginated<AuditLogEntry>>(`/audit?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.items);
        setNextCursor(res.nextCursor);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, action, cursor, reloadKey]);

  function resetPage() {
    setCursorStack([]);
    setCursor(undefined);
  }
  function goNext() {
    if (!nextCursor) return;
    setCursorStack((s) => [...s, cursor ?? '']);
    setCursor(nextCursor);
  }
  function goPrev() {
    setCursorStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setCursor(prev || undefined);
      return s.slice(0, -1);
    });
  }

  // Actions distinctes vues sur la page courante — pas de catalogue séparé côté backend.
  const distinctActions = Array.from(new Set(rows.map((r) => r.action))).sort();

  const ex = expanded ? rows.find((r) => r._id === expanded) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1200 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={adminId}
          onChange={(e) => { setAdminId(e.target.value); resetPage(); }}
          placeholder="Filter by admin id…"
          style={{ height: 28, padding: '0 9px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx)', width: 200 }}
        />
        <select value={action} onChange={(e) => { setAction(e.target.value); resetPage(); }} style={selectStyle}>
          <option value="">All actions</option>
          {distinctActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <code style={{ fontSize: 11, color: 'var(--tx3)', alignSelf: 'center' }}>append-only · immutable</code>
      </div>

      <Card>
        {state === 'loading' && <TableSkeleton />}
        {state === 'error' && <ErrorState title="Could not load the audit log" body="The Control Plane API didn't respond." req="GET /audit" actions={<button onClick={() => setReloadKey((k) => k + 1)} style={{ height: 27, padding: '0 10px', borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12 }}>Retry</button>} />}
        {state === 'ready' && rows.length === 0 && <EmptyState title="No matching entries" body="Try clearing the filters." />}
        {state === 'ready' && rows.length > 0 && (
          <>
            <table>
              <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Tenant</th><th style={{ width: '1%' }}></th></tr></thead>
              <tbody>
                {rows.map((a) => {
                  const dangerish = a.action.toUpperCase().includes('SUSPEND') || a.action.toUpperCase().includes('CHURN');
                  const impersonation = a.action.toUpperCase().includes('IMPERSONATION');
                  const hasDiff = a.before !== undefined || a.after !== undefined || !!a.reason;
                  return (
                    <tr key={a._id}>
                      <td><code style={{ color: 'var(--tx3)' }}>{new Date(a.at).toLocaleString()}</code></td>
                      <td style={{ color: 'var(--tx2)' }}>{a.adminEmail}</td>
                      <td style={{ color: dangerish ? 'var(--danger)' : impersonation ? 'var(--s-provisioning-fg)' : 'var(--tx)', fontWeight: 500 }}>{a.action.toLowerCase()}</td>
                      <td><code style={{ color: 'var(--tx2)' }}>{a.tenantId ?? '—'}</code></td>
                      <td>
                        {hasDiff && (
                          <button onClick={() => setExpanded((e) => (e === a._id ? null : a._id))} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>
                            {expanded === a._id ? 'Hide' : 'Detail'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ex && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ex.reason && <div style={{ fontSize: 11.5 }}><code style={{ color: 'var(--tx3)' }}>reason</code> <span style={{ color: 'var(--tx2)' }}>{ex.reason}</span></div>}
                {ex.before !== undefined && <div style={{ fontSize: 11.5 }}><code style={{ color: 'var(--tx3)' }}>before</code> <code style={{ color: 'var(--tx2)' }}>{JSON.stringify(ex.before)}</code></div>}
                {ex.after !== undefined && <div style={{ fontSize: 11.5 }}><code style={{ color: 'var(--s-active-fg)' }}>after</code> <code style={{ color: 'var(--tx2)' }}>{JSON.stringify(ex.after)}</code></div>}
                <div style={{ fontSize: 10.5, color: 'var(--tx3)' }}>ip {ex.ip} · {ex.userAgent}</div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, padding: '8px 12px', borderTop: '1px solid var(--line)', background: 'var(--panel2)' }}>
              <button onClick={goPrev} disabled={cursorStack.length === 0} style={{ height: 24, padding: '0 9px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel)', color: cursorStack.length === 0 ? 'var(--tx3)' : 'var(--tx2)', fontSize: 11 }}>Previous</button>
              <button onClick={goNext} disabled={!nextCursor} style={{ height: 24, padding: '0 9px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel)', color: !nextCursor ? 'var(--tx3)' : 'var(--tx2)', fontSize: 11 }}>Next</button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
