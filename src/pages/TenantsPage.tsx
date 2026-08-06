import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import type { Paginated, PlanRecord, TenantRecord, TenantStatusApi } from '@/lib/api-types';
import { badge, btnPrimary, chip, softChip } from '@/lib/style';
import { useUiStore } from '@/store/useUiStore';
import { EmptyState, ErrorState, TableSkeleton, selectStyle } from '@/components/common';

type LoadState = 'loading' | 'error' | 'ready';
const STATUSES: TenantStatusApi[] = ['active', 'trial', 'past_due', 'suspended', 'provisioning', 'churned'];
const PAGE_SIZE = 20;

export function TenantsPage() {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const openImpModal = useUiStore((s) => s.openImpModal);
  const canImpersonate = role === 'superadmin' || role === 'support';

  const [fStatus, setFStatus] = useState<'all' | TenantStatusApi>('all');
  const [fPlan, setFPlan] = useState<'all' | string>('all');
  const [q, setQ] = useState('');
  const [plans, setPlans] = useState<PlanRecord[]>([]);

  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<TenantRecord[]>([]);
  const [cursorStack, setCursorStack] = useState<string[]>([]); // curseurs des pages PRÉCÉDENTES, pour "Previous"
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    apiGet<PlanRecord[]>('/plans').then(setPlans).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    const params = new URLSearchParams();
    if (fStatus !== 'all') params.set('status', fStatus);
    if (fPlan !== 'all') params.set('planId', fPlan);
    if (q.trim()) params.set('search', q.trim());
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(PAGE_SIZE));

    apiGet<Paginated<TenantRecord>>(`/tenants?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
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
  }, [fStatus, fPlan, q, cursor, reloadKey]);

  function resetToFirstPage() {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 1500 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 3, padding: 2, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6 }}>
          <button onClick={() => { setFStatus('all'); resetToFirstPage(); }} style={chip(fStatus === 'all')}>All</button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => { setFStatus(s); resetToFirstPage(); }} style={chip(fStatus === s)}>{s.replace('_', ' ')}</button>
          ))}
        </div>
        <select value={fPlan} onChange={(e) => { setFPlan(e.target.value); resetToFirstPage(); }} style={selectStyle}>
          <option value="all">All plans</option>
          {plans.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
        </select>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); resetToFirstPage(); }}
          placeholder="Search name or slug…"
          style={{ height: 28, padding: '0 9px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx)', minWidth: 200 }}
        />
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/provision')} style={{ height: 28, padding: '0 11px', borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500 }}>New tenant</button>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, overflowX: 'auto', overflowY: 'hidden' }}>
        {state === 'loading' && <TableSkeleton />}
        {state === 'error' && (
          <ErrorState
            title="Could not load the tenant index"
            body="The Control Plane API didn't respond."
            req="GET /tenants"
            actions={<button onClick={() => setReloadKey((k) => k + 1)} style={btnPrimary(true)}>Retry</button>}
          />
        )}
        {state === 'ready' && items.length === 0 && (
          <EmptyState
            title="No tenants match these filters"
            body="Try clearing the status filter or the search term."
            actions={<button onClick={() => { setFStatus('all'); setFPlan('all'); setQ(''); resetToFirstPage(); }} style={{ height: 27, padding: '0 10px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 12 }}>Clear filters</button>}
          />
        )}
        {state === 'ready' && items.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Tenant</th><th>Status</th><th>Plan</th>
                  <th>Deploy</th><th>Country</th><th>Created</th><th style={{ width: '1%' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <button onClick={() => navigate('/tenants/' + r.slug)} style={{ background: 'transparent', border: 0, padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                        <span style={{ fontWeight: 500, color: 'var(--tx)' }}>{r.name}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{r.owner.email}</span>
                      </button>
                    </td>
                    <td><span style={badge(r.status)}>{r.status}</span></td>
                    <td style={{ color: 'var(--tx2)' }}>{r.planId ?? '—'}</td>
                    <td><span style={softChip(r.deployment === 'dedicated' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {})}>{r.deployment}</span></td>
                    <td style={{ color: 'var(--tx2)' }}>{r.country}</td>
                    <td><code style={{ color: 'var(--tx3)' }}>{new Date(r.createdAt).toLocaleDateString()}</code></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        {canImpersonate && <button onClick={() => openImpModal(r._id)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Log in as</button>}
                        <button onClick={() => navigate('/tenants/' + r.slug)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Open</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--line)', background: 'var(--panel2)' }}>
              <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{items.length} shown · server-side pagination</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button onClick={goPrev} disabled={cursorStack.length === 0} style={{ height: 24, padding: '0 9px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel)', color: cursorStack.length === 0 ? 'var(--tx3)' : 'var(--tx2)', fontSize: 11 }}>Previous</button>
                <button onClick={goNext} disabled={!nextCursor} style={{ height: 24, padding: '0 9px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel)', color: !nextCursor ? 'var(--tx3)' : 'var(--tx2)', fontSize: 11 }}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
