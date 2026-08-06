import { useEffect, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../Modal';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { StartImpersonationResult, TenantDetailResponse, TenantRecord } from '@/lib/api-types';
import { btnPrimary } from '@/lib/style';
import { useUiStore } from '@/store/useUiStore';

/**
 * [Prompt 8] Le mock laissait choisir parmi 3 "utilisateurs" fictifs (owner/desk/manager) —
 * sans équivalent réel : `InternalService.impersonate()` (DP) impersonne TOUJOURS le compte
 * owner du tenant, jamais un utilisateur choisi (`targetUserId` est purement informatif côté
 * CP, jamais transmis au DP — voir la docstring de `ImpersonationSession.targetUserId`,
 * Prompt 5). Le sélecteur est donc retiré, pas redessiné en un sélecteur à une seule
 * option factice.
 */
export function ImpersonateModal() {
  const tenantId = useUiStore((s) => s.impModalTenantId);
  const close = useUiStore((s) => s.closeImpModal);
  const startImpersonation = useUiStore((s) => s.startImpersonation);
  const flash = useUiStore((s) => s.flash);

  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }
    setError(null);
    apiGet<TenantDetailResponse>(`/tenants/${tenantId}`)
      .then((detail) => setTenant(detail.tenant))
      .catch(() => setError('Could not load this tenant.'));
  }, [tenantId]);

  if (!tenantId) return null;
  const reasonOk = reason.trim().length >= 10;

  async function confirm() {
    if (!reasonOk || !tenantId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost<StartImpersonationResult>(`/tenants/${tenantId}/impersonate`, { reason: reason.trim() });
      const now = new Date();
      startImpersonation({
        sessionId: result.sessionId,
        tenantMongoId: tenantId,
        tenantSlug: tenant?.slug ?? tenantId,
        tenantName: tenant?.name ?? tenant?.slug ?? tenantId,
        redirectUrl: result.redirectUrl,
        reason: reason.trim(),
        startedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + result.expiresInMinutes * 60_000).toISOString(),
      });
      flash(`Impersonation session started for ${tenant?.name ?? tenantId}`);
      close();
      setReason('');
      window.open(result.redirectUrl, '_blank', 'noopener');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the session.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => !busy && close()} width={460}>
      <ModalHeader
        title={`Log in as the owner of ${tenant?.name ?? '…'}`}
        subtitle="You will be signed into the tenant app as the account owner. Requires a reason of at least 10 characters."
      />
      <ModalBody>
        {error && <div style={{ padding: '8px 10px', borderRadius: 5, background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)', fontSize: 11.5, color: 'var(--danger)' }}>{error}</div>}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>Reason (required, visible to all admins)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why are you logging in as this tenant's owner?"
            style={{ padding: 9, borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx)', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10.5, color: reasonOk ? 'var(--s-active-fg)' : 'var(--tx3)' }}>{reasonOk ? 'a real DP session token will be issued, expires in 15 minutes' : 'a reason of at least 10 characters is required'}</span>
            <span style={{ fontSize: 10.5, color: reasonOk ? 'var(--s-active-fg)' : 'var(--tx3)' }}>{reason.trim().length}</span>
          </div>
        </label>
      </ModalBody>
      <ModalFooter>
        <button onClick={close} disabled={busy} style={{ height: 28, padding: '0 11px', borderRadius: 5, fontSize: 12, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)' }}>Cancel</button>
        <span style={{ flex: 1 }} />
        <button onClick={confirm} style={btnPrimary(reasonOk && !busy)}>{busy ? 'Starting…' : 'Log in as owner'}</button>
      </ModalFooter>
    </Modal>
  );
}
