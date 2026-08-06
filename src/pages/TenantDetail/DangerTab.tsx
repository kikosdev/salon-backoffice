import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { PlanRecord } from '@/lib/api-types';
import { btnDanger, btnGhost, btnPrimary, chip, money } from '@/lib/style';
import { inputStyle } from '@/components/common';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/Modal';
import { useUiStore } from '@/store/useUiStore';
import type { TenantTabProps } from './index';

type DangerKey = 'plan' | 'suspend' | 'reactivate' | 'churn';

export function DangerTab({ tenant, reload }: TenantTabProps) {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const flash = useUiStore((s) => s.flash);
  const [open, setOpen] = useState<DangerKey | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [reason, setReason] = useState('');
  const [newPlan, setNewPlan] = useState(tenant.planId ?? '');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [Prompt 8, correction] Le mock restreignait tout à `superadmin` — le VRAI backend
  // autorise `superadmin`+`billing` sur suspend/reactivate/churn/change-plan ("cycle de vie
  // contractuel" / "Plans & tarifs", `TenantsController`). L'UI doit refléter ça, pas être
  // plus restrictive que l'API qu'elle appelle.
  const canDanger = role === 'superadmin' || role === 'billing';

  useEffect(() => {
    if (open === 'plan') apiGet<PlanRecord[]>('/plans').then(setPlans).catch(() => {});
  }, [open]);

  const needsReason: DangerKey[] = ['suspend', 'churn'];
  const actions: { key: DangerKey; title: string; desc: string; cta: string; danger: boolean; show: boolean }[] = [
    { key: 'plan', title: 'Change plan', desc: 'Moves the subscription immediately. Blocked if current usage exceeds the new plan\'s staff/location limits.', cta: 'Change plan', danger: false, show: true },
    { key: 'suspend', title: 'Suspend tenant', desc: 'Blocks all tenant logins and the public booking page. Data is retained.', cta: 'Suspend', danger: true, show: tenant.status !== 'suspended' && tenant.status !== 'churned' },
    { key: 'reactivate', title: 'Reactivate tenant', desc: 'Restores access for a suspended tenant.', cta: 'Reactivate', danger: false, show: tenant.status === 'suspended' },
    { key: 'churn', title: 'Mark as churned', desc: 'Ends the subscription and archives the workspace.', cta: 'Churn tenant', danger: true, show: tenant.status !== 'churned' },
  ];

  function openAction(key: DangerKey) {
    setOpen(key);
    setSlugInput('');
    setReason('');
    setNewPlan(tenant.planId ?? '');
    setError(null);
  }

  const slugMatch = slugInput === tenant.slug;
  const reasonOk = !needsReason.includes(open as DangerKey) || reason.trim().length >= 10;
  // Réactiver ne détruit rien — pas de confirmation par slug (même logique que le SKILL :
  // "reactivate n'en a délibérément pas besoin, action restauratrice").
  const confirmReady = open === 'reactivate' ? true : slugMatch && reasonOk && (open !== 'plan' || newPlan.length > 0);

  async function confirm() {
    if (!open || !confirmReady || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (open === 'suspend') await apiPost(`/tenants/${tenant._id}/suspend`, { reason: reason.trim() });
      else if (open === 'reactivate') await apiPost(`/tenants/${tenant._id}/reactivate`);
      else if (open === 'churn') await apiPost(`/tenants/${tenant._id}/churn`, { reason: reason.trim() });
      else if (open === 'plan') await apiPost(`/tenants/${tenant._id}/change-plan`, { planId: newPlan });

      flash(`${actions.find((a) => a.key === open)?.cta} · ${tenant.slug}`);
      setOpen(null);
      reload();
      if (open === 'churn') navigate('/tenants');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!canDanger) {
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '40px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: 12.5, color: 'var(--tx3)' }}>Only superadmin and billing operators can perform lifecycle actions on a tenant.</span>
      </div>
    );
  }

  const current = open ? actions.find((a) => a.key === open) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {actions.filter((a) => a.show).map((a) => (
        <div key={a.key} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</span>
            <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{a.desc}</span>
          </div>
          <button onClick={() => openAction(a.key)} style={a.danger ? btnDanger(true) : btnGhost()}>{a.cta}</button>
        </div>
      ))}

      {current && (
        <Modal onClose={() => !busy && setOpen(null)}>
          <ModalHeader
            title={current.key === 'plan' ? `Change plan for ${tenant.name}` : `${current.title} — ${tenant.name}?`}
            subtitle={current.key === 'churn' ? `This ends the subscription for ${tenant.name}.` : current.desc}
          />
          <ModalBody>
            {error && <div style={{ padding: '8px 10px', borderRadius: 5, background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)', fontSize: 11.5, color: 'var(--danger)' }}>{error}</div>}

            {current.key === 'plan' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>New plan</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {plans.map((p) => (
                    <button key={p.code} onClick={() => setNewPlan(p.code)} style={{ ...chip(newPlan === p.code), flex: '1 0 30%' }}>
                      {p.code} · {money(p.priceMonthly, p.currency)}
                    </button>
                  ))}
                </div>
              </label>
            )}

            {needsReason.includes(current.key) && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>Reason (required, at least 10 characters)</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} style={{ padding: 9, borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx)', resize: 'vertical', fontFamily: 'inherit' }} />
              </label>
            )}

            {current.key !== 'reactivate' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>Type <code style={{ color: 'var(--tx)' }}>{tenant.slug}</code> to confirm</span>
                <input value={slugInput} onChange={(e) => setSlugInput(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} placeholder={tenant.slug} />
                <span style={{ fontSize: 10.5, color: slugMatch ? 'var(--s-active-fg)' : 'var(--tx3)' }}>
                  {slugMatch ? 'slug matches — action unlocked' : 'the confirm button stays disabled until the slug matches exactly'}
                </span>
              </label>
            )}
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setOpen(null)} style={btnGhost()} disabled={busy}>Cancel</button>
            <span style={{ flex: 1 }} />
            <button onClick={confirm} style={current.danger ? btnDanger(confirmReady && !busy) : btnPrimary(confirmReady && !busy)}>{busy ? 'Working…' : current.cta}</button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
