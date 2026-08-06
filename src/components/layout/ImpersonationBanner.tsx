import { useEffect, useState } from 'react';
import { useUiStore } from '@/store/useUiStore';

function formatRemaining(expiresAt: string): string {
  const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const totalSecs = Math.floor(ms / 1000);
  return Math.floor(totalSecs / 60) + ':' + String(totalSecs % 60).padStart(2, '0');
}

/** [Prompt 8] Bannière ROUGE permanente (demande explicite) — le mock utilisait la couleur
 *  "provisioning" (violet). Le compte à rebours vient de `expiresAt`, un vrai timestamp
 *  renvoyé par `POST /tenants/:id/impersonate` (`startedAt + expiresInMinutes`), pas un
 *  compteur local qui dériverait du vrai TTL du token DP. */
export function ImpersonationBanner() {
  const imp = useUiStore((s) => s.imp);
  const endImpersonation = useUiStore((s) => s.endImpersonation);
  const flash = useUiStore((s) => s.flash);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!imp) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [imp]);

  if (!imp) return null;
  const clock = formatRemaining(imp.expiresAt);
  const expired = new Date(imp.expiresAt).getTime() <= Date.now();

  return (
    <div
      style={{
        flex: 'none', display: 'flex', alignItems: 'center', gap: 12, height: 34, padding: '0 14px',
        background: 'var(--danger-bg)', borderBottom: '1px solid var(--danger-bd)', color: 'var(--danger)', fontSize: 12,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, letterSpacing: '.03em' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pul 1.6s ease-in-out infinite' }} />
        IMPERSONATION ACTIVE
      </span>
      <span style={{ color: 'var(--tx2)' }}>Logged in as the owner of</span>
      <code style={{ color: 'var(--tx)' }}>{imp.tenantName}</code>
      <span style={{ color: 'var(--tx2)' }}>({imp.tenantSlug})</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: 'var(--tx2)' }}>{expired ? 'Token expired' : 'Session ends in'}</span>
      {!expired && <code style={{ color: 'var(--tx)', fontVariantNumeric: 'tabular-nums' }}>{clock}</code>}
      <a href={imp.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ height: 22, display: 'flex', alignItems: 'center', padding: '0 9px', borderRadius: 4, border: '1px solid currentColor', color: 'inherit', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
        Reopen tenant app
      </a>
      <button
        onClick={() => { endImpersonation(); flash('Impersonation session ended'); }}
        style={{ height: 22, padding: '0 9px', borderRadius: 4, border: '1px solid currentColor', background: 'transparent', color: 'inherit', fontSize: 11, fontWeight: 600 }}
      >
        End session
      </button>
    </div>
  );
}
