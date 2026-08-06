import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useUiStore } from '@/store/useUiStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { initials } from '@/lib/style';

interface NavItem {
  to: string;
  label: string;
  d: string;
  count?: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

function useNavGroups(): NavGroup[] {
  const operators = useDataStore((s) => s.operators);
  const teamCount = operators.filter((o) => o.status !== 'disabled').length;
  return [
    {
      label: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', d: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z' },
        { to: '/health', label: 'Health', d: 'M2 8.5h3l1.5-4 2 8 1.5-4h3' },
      ],
    },
    {
      label: 'Accounts',
      items: [
        { to: '/tenants', label: 'Tenants', d: 'M3 14V3h6v11M9 7h4v7M5 5.5h2M5 8h2M5 10.5h2' },
        { to: '/provision', label: 'Provisioning', d: 'M8 3.5v9M3.5 8h9' },
        { to: '/plans', label: 'Plans & flags', d: 'M2.5 5h11M2.5 11h11M6 3v4M10.5 9v4' },
      ],
    },
    {
      label: 'Revenue',
      items: [{ to: '/billing', label: 'Billing', d: 'M4 2.5h8v11l-2-1.2-2 1.2-2-1.2-2 1.2zM6 5.5h4M6 8h4' }],
    },
    {
      label: 'Trust',
      items: [
        { to: '/team', label: 'Operators', d: 'M6 7.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM2 13.5c0-2.1 1.8-3.4 4-3.4s4 1.3 4 3.4M11 5.2a1.9 1.9 0 110 3.8M12.2 13.5c0-1.5-.5-2.5-1.6-3', count: String(teamCount) },
        { to: '/impersonation', label: 'Impersonation', d: 'M8 8.5a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5zM3 14c0-2.5 2.2-4 5-4s5 1.5 5 4' },
        { to: '/audit', label: 'Audit log', d: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01' },
      ],
    },
  ];
}

export function Sidebar() {
  const navGroups = useNavGroups();
  const role = useUiStore((s) => s.role);
  const lockSession = useAuthStore((s) => s.lockSession);
  const signOut = useAuthStore((s) => s.signOut);
  const admin = useAuthStore((s) => s.admin);
  const profile = useDataStore((s) => s.profile);
  const navigate = useNavigate();
  // Pas de `name` dans le JWT (`AccessClaims` = {sub,email,role}, le CP n'a pas de
  // `GET /auth/me`) — affiche l'email réel plutôt qu'un nom fictif du mock.
  const displayName = admin?.email ?? profile.name;

  return (
    <aside style={{ width: 214, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderRight: '1px solid var(--line)' }}>
      <div style={{ height: 46, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>S</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>SalonOS</span>
          <span style={{ fontSize: 10, color: 'var(--tx3)', letterSpacing: '.04em' }}>CONTROL PLANE</span>
        </div>
      </div>
      <nav style={{ flex: 1, overflow: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {navGroups.map((g) => (
          <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ padding: '0 8px 5px', fontSize: 10, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--tx3)' }}>{g.label}</div>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 27, padding: '0 8px', borderRadius: 5, border: 0,
                  background: isActive ? 'var(--accent)' : 'transparent', color: isActive ? '#fff' : 'var(--tx2)', fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon d={it.d} style={{ opacity: 0.85 }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                    {it.count && <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: isActive ? 'rgba(255,255,255,.8)' : 'var(--tx3)' }}>{it.count}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ flex: 'none', borderTop: '1px solid var(--line)', padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/profile')} title="My account" style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', background: 'var(--panel2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--tx2)' }}>
            {initials(displayName)}
          </button>
          <button onClick={() => navigate('/profile')} title="My account" style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.2, background: 'transparent', border: 0, padding: 0, textAlign: 'left' }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tx)' }}>{displayName}</span>
            <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{role}</span>
          </button>
          <button onClick={lockSession} title="Lock session" style={{ width: 22, height: 22, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx3)' }}>
            <Icon size={11} d="M5.8 7V5.4a2.2 2.2 0 014.4 0V7" style={{}} />
          </button>
          <button onClick={signOut} title="Sign out" style={{ width: 22, height: 22, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx3)' }}>
            <Icon size={11} d="M9.5 3.5H12.5v9H9.5M9 8H3.5M5.6 5.8 3.4 8l2.2 2.2" style={{}} />
          </button>
        </div>
      </div>
    </aside>
  );
}
