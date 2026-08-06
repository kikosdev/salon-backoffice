import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import type { Paginated, TenantRecord } from '@/lib/api-types';
import { badge } from '@/lib/style';
import { useUiStore } from '@/store/useUiStore';

const TITLES: Record<string, [string, string]> = {
  dashboard: ['Dashboard', 'platform health at a glance'],
  tenants: ['Tenants', 'accounts'],
  provision: ['Provisioning', 'create a new tenant'],
  plans: ['Plans & entitlements', 'plans & feature flags'],
  billing: ['Billing', 'invoices & dunning'],
  impersonation: ['Impersonation', 'sessions & history'],
  audit: ['Audit log', 'append-only'],
  health: ['Health', 'live'],
  team: ['Operators', 'who can run the control plane'],
  profile: ['My account', 'profile, security & notifications'],
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [q, setQ] = useState('');
  const [qOpen, setQOpen] = useState(false);
  const [hits, setHits] = useState<TenantRecord[]>([]);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const toggleDensity = useUiStore((s) => s.toggleDensity);
  const theme = useUiStore((s) => s.theme);
  const density = useUiStore((s) => s.density);

  const segment = location.pathname.split('/')[1] || 'dashboard';
  let title = TITLES[segment] ?? ['SalonOS', ''];
  if (segment === 'tenants' && params.slug) {
    title = [params.slug, 'tenant detail'];
  }

  // [Prompt 8] Recherche debouncée sur le vrai endpoint — le mock filtrait un tableau
  // en mémoire, ici on interroge `GET /tenants?search=` (limité à qOpen pour éviter
  // un appel réseau à chaque frappe hors focus).
  useEffect(() => {
    if (!qOpen) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ limit: '6' });
      if (q.trim()) params.set('search', q.trim());
      apiGet<Paginated<TenantRecord>>(`/tenants?${params.toString()}`)
        .then((res) => {
          if (!cancelled) setHits(res.items);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, qOpen]);

  return (
    <header style={{ flex: 'none', height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: 'var(--panel)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 150 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title[0]}</span>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{title[1]}</span>
      </div>
      <div style={{ flex: 1, maxWidth: 420, position: 'relative' }}>
        <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.5} style={{ position: 'absolute', left: 9, top: 8, color: 'var(--tx3)' }}>
          <circle cx={7} cy={7} r={4.2} />
          <path d="M10.2 10.2 13.5 13.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setQOpen(true); }}
          onFocus={() => setQOpen(true)}
          placeholder="Search tenants by name, slug or owner email…"
          style={{ width: '100%', height: 28, padding: '0 9px 0 27px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx)' }}
        />
        {qOpen && (
          <div style={{ position: 'absolute', top: 33, left: 0, right: 0, zIndex: 40, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, boxShadow: '0 12px 32px rgba(0,0,0,.35)', overflow: 'hidden' }}>
            <div style={{ padding: '6px 10px', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--tx3)', borderBottom: '1px solid var(--line2)' }}>
              {q.trim() ? hits.length + ' matches for “' + q + '”' : 'Recent tenants'}
            </div>
            {hits.map((r) => (
              <button
                key={r.slug}
                onClick={() => { navigate('/tenants/' + r.slug); setQOpen(false); setQ(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', background: 'transparent', border: 0, borderBottom: '1px solid var(--line2)', textAlign: 'left' }}
              >
                <span style={badge(r.status)}>{r.status}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--tx)' }}>{r.name}</span>
                <code style={{ color: 'var(--tx3)' }}>{r.slug}</code>
              </button>
            ))}
            {hits.length === 0 && (
              <div style={{ padding: '10px', fontSize: 11.5, color: 'var(--tx3)' }}>No tenants found.</div>
            )}
            <button onClick={() => setQOpen(false)} style={{ width: '100%', padding: '6px 10px', background: 'var(--panel2)', border: 0, textAlign: 'left', fontSize: 11, color: 'var(--tx3)' }}>
              Esc to dismiss
            </button>
          </div>
        )}
      </div>
      <span style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 9px', height: 24, borderRadius: 12, background: 'var(--panel2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--tx2)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--s-active-fg)' }} />
        All systems nominal
      </div>
      <button onClick={toggleDensity} style={{ height: 28, padding: '0 9px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11.5 }}>
        {density === 'compact' ? 'Compact' : 'Roomy'}
      </button>
      <button onClick={toggleTheme} style={{ height: 28, padding: '0 9px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11.5 }}>
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
    </header>
  );
}
