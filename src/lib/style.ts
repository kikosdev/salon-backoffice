import type { CSSProperties } from 'react';
import type { TenantStatus } from './types';

export function money(n: number, cur = 'TND'): string {
  const d = cur === 'TND' ? 3 : 2;
  const [whole, frac] = n.toFixed(d).split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + frac + ' ' + cur;
}

export function badge(status: TenantStatus | string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    height: 19,
    padding: '0 7px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    fontFamily: 'var(--mono)',
    color: `var(--s-${status}-fg)`,
    background: `var(--s-${status}-bg)`,
    border: `1px solid var(--s-${status}-bd)`,
    animation: status === 'provisioning' ? 'pul 1.7s ease-in-out infinite' : undefined,
  };
}

const INV_BADGE_MAP: Record<string, TenantStatus> = {
  paid: 'active',
  sent: 'trial',
  overdue: 'past_due',
  draft: 'churned',
  void: 'churned',
};
export function invBadge(status: string): CSSProperties {
  return badge(INV_BADGE_MAP[status] || 'churned');
}

export function chip(active: boolean): CSSProperties {
  return {
    height: 24,
    padding: '0 9px',
    borderRadius: 4,
    border: '1px solid ' + (active ? 'var(--accent)' : 'transparent'),
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--tx2)',
    fontSize: 11.5,
    fontWeight: active ? 600 : 400,
    whiteSpace: 'nowrap',
  };
}

export function softChip(overrides?: CSSProperties): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    height: 18,
    padding: '0 6px',
    borderRadius: 3,
    fontSize: 10.5,
    fontFamily: 'var(--mono)',
    color: 'var(--tx2)',
    background: 'var(--panel2)',
    border: '1px solid var(--line)',
    ...overrides,
  };
}

export function btnPrimary(ok: boolean): CSSProperties {
  return {
    height: 28,
    padding: '0 11px',
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid ' + (ok ? 'var(--accent)' : 'var(--line)'),
    background: ok ? 'var(--accent)' : 'var(--panel)',
    color: ok ? '#fff' : 'var(--tx3)',
    cursor: ok ? 'pointer' : 'not-allowed',
  };
}

export function btnDanger(ok: boolean): CSSProperties {
  return {
    height: 28,
    padding: '0 11px',
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid ' + (ok ? 'var(--danger-bd)' : 'var(--line)'),
    background: ok ? 'var(--danger-bg)' : 'var(--panel)',
    color: ok ? 'var(--danger)' : 'var(--tx3)',
    cursor: ok ? 'pointer' : 'not-allowed',
  };
}

export function btnGhost(): CSSProperties {
  return {
    height: 28,
    padding: '0 10px',
    borderRadius: 5,
    fontSize: 12,
    border: '1px solid var(--line)',
    background: 'var(--panel2)',
    color: 'var(--tx2)',
  };
}

export function silentStyle(d: number): CSSProperties {
  const c = d >= 14 ? 'var(--danger)' : d >= 7 ? 'var(--s-past_due-fg)' : 'var(--tx2)';
  return { color: c, fontWeight: d >= 7 ? 600 : 400 };
}

export function pctStyle(p: number): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    minWidth: 34,
    textAlign: 'right',
    color: p >= 95 ? 'var(--danger)' : p >= 80 ? 'var(--s-past_due-fg)' : 'var(--tx2)',
  };
}

export function bar(p: number, color?: string): CSSProperties {
  return {
    width: Math.min(100, p) + '%',
    height: '100%',
    borderRadius: 3,
    background: color || (p >= 95 ? 'var(--danger)' : p >= 80 ? 'var(--s-past_due-fg)' : 'var(--accent)'),
  };
}

export function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}
