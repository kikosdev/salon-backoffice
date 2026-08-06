import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { InvoiceRecord, Paginated, TenantRecord, TenantStatusApi } from '@/lib/api-types';
import { badge, btnGhost, btnPrimary, chip, invBadge, money } from '@/lib/style';
import { Card, EmptyState, ErrorState, Field, TableSkeleton, inputStyle } from '@/components/common';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/Modal';
import { useUiStore } from '@/store/useUiStore';

type BTab = 'invoices' | 'dunning' | 'recon';
type MpMethod = 'transfer' | 'cash' | 'card';
type LoadState = 'loading' | 'error' | 'ready';

const MPM: Record<MpMethod, string> = {
  transfer: 'Bank transfer — the default for Tunisian clients. Capture the BIAT/STB reference.',
  cash: 'Cash collected in person. Capture the receipt number issued to the owner.',
  card: 'Card paid over the phone or at the salon terminal.',
};

// [Prompt 8] Le mock avait 4 étapes de dunning liées à un montant fabriqué — le backend
// n'expose que le STATUT tenant réel (`GET /tenants?status=X`), pas un montant en retard par
// étape (nécessiterait N+1 appels invoices par tenant, disproportionné pour cet écran).
const DUNNING_GROUPS: { status: TenantStatusApi; title: string; note: string }[] = [
  { status: 'past_due', title: 'Past due', note: 'payment window missed, still fully functional' },
  { status: 'suspended', title: 'Suspended', note: 'access blocked, awaiting payment' },
  { status: 'churned', title: 'Churned', note: 'subscription ended' },
];

export function BillingPage() {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const flash = useUiStore((s) => s.flash);
  // [Prompt 8] `BillingController` est gardé au niveau CLASSE (`@AdminRole('superadmin','billing')`
  // sur TOUT `/invoices/*`) — `support` reçoit 403 sur la liste elle-même, pas seulement
  // mark-paid. Masqué en amont plutôt que de tenter l'appel et échouer.
  const canSee = role === 'superadmin' || role === 'billing';
  const [tab, setTab] = useState<BTab>('invoices');

  const [state, setState] = useState<LoadState>('loading');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [dunningState, setDunningState] = useState<LoadState>('loading');
  const [dunningTenants, setDunningTenants] = useState<Record<string, TenantRecord[]>>({});

  const [mp, setMp] = useState<InvoiceRecord | null>(null);
  const [mpMethod, setMpMethod] = useState<MpMethod>('transfer');
  const [mpRef, setMpRef] = useState('');
  const [mpBusy, setMpBusy] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  useEffect(() => {
    if (!canSee || tab !== 'invoices') return;
    let cancelled = false;
    setState('loading');
    apiGet<Paginated<InvoiceRecord>>('/invoices?limit=100')
      .then((res) => {
        if (!cancelled) {
          setInvoices(res.items);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [canSee, tab, reloadKey]);

  useEffect(() => {
    if (!canSee || tab !== 'dunning') return;
    let cancelled = false;
    setDunningState('loading');
    Promise.all(DUNNING_GROUPS.map((g) => apiGet<Paginated<TenantRecord>>(`/tenants?status=${g.status}&limit=50`)))
      .then((results) => {
        if (cancelled) return;
        const byStatus: Record<string, TenantRecord[]> = {};
        DUNNING_GROUPS.forEach((g, i) => { byStatus[g.status] = results[i].items; });
        setDunningTenants(byStatus);
        setDunningState('ready');
      })
      .catch(() => {
        if (!cancelled) setDunningState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [canSee, tab]);

  function openMarkPaid(inv: InvoiceRecord) {
    setMp(inv);
    setMpRef('');
    setMpMethod('transfer');
    setMpError(null);
  }
  async function confirmMp() {
    if (!mp || mpRef.trim().length < 2 || mpBusy) return;
    setMpBusy(true);
    setMpError(null);
    try {
      await apiPost(`/invoices/${mp._id}/mark-paid`, { method: mpMethod, reference: mpRef.trim() });
      flash(`Invoice #${mp.number} marked paid · ${mpMethod}`);
      setMp(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setMpError(err instanceof ApiError ? err.message : 'Could not mark this invoice as paid.');
    } finally {
      setMpBusy(false);
    }
  }

  if (!canSee) {
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '40px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: 12.5, color: 'var(--tx3)' }}>Billing is limited to superadmin and billing operators.</span>
      </div>
    );
  }

  const collected = invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + i.total, 0);
  const outstanding = invoices.filter((i) => i.status === 'draft' || i.status === 'sent').reduce((a, i) => a + i.total, 0);
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((a, i) => a + i.total, 0);
  const billSummary = [{ k: 'Collected', v: money(collected) }, { k: 'Outstanding', v: money(outstanding) }, { k: 'Overdue', v: money(overdue) }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1400 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 3, padding: 2, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6 }}>
          {(['invoices', 'dunning', 'recon'] as BTab[]).map((b) => (
            <button key={b} onClick={() => setTab(b)} style={chip(tab === b)}>{b === 'recon' ? 'Reconciliation' : b[0].toUpperCase() + b.slice(1)}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {tab === 'invoices' && billSummary.map((s) => (
          <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{s.k}</span>
            <code style={{ fontSize: 13, fontWeight: 600 }}>{s.v}</code>
          </div>
        ))}
      </div>

      {tab === 'invoices' && (
        <Card>
          {state === 'loading' && <TableSkeleton />}
          {state === 'error' && <ErrorState title="Could not load invoices" body="The Control Plane API didn't respond." req="GET /invoices" actions={<button onClick={() => setReloadKey((k) => k + 1)} style={btnPrimary(true)}>Retry</button>} />}
          {state === 'ready' && invoices.length === 0 && <EmptyState title="No invoices yet" body="Invoices are generated automatically 3 days before each tenant's billing period ends." />}
          {state === 'ready' && invoices.length > 0 && (
            <table>
              <thead><tr><th>Number</th><th>Tenant</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th>Issued</th><th>Due</th><th style={{ width: '1%' }}></th></tr></thead>
              <tbody>
                {invoices.map((i) => {
                  const payable = i.status === 'draft' || i.status === 'sent' || i.status === 'overdue';
                  return (
                    <tr key={i._id}>
                      <td><code style={{ color: 'var(--tx2)' }}>#{i.number}</code></td>
                      <td><code style={{ color: 'var(--tx2)', fontSize: 11 }}>{i.tenantId}</code></td>
                      <td style={{ textAlign: 'right' }}><code>{money(i.total, i.currency)}</code></td>
                      <td><span style={invBadge(i.status)}>{i.status}</span></td>
                      <td><code style={{ color: 'var(--tx3)' }}>{new Date(i.issuedAt).toLocaleDateString()}</code></td>
                      <td><code style={{ color: 'var(--tx3)' }}>{new Date(i.dueAt).toLocaleDateString()}</code></td>
                      <td>
                        {payable ? (
                          <button onClick={() => openMarkPaid(i)} style={{ height: 22, padding: '0 8px', borderRadius: 4, fontSize: 11, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontWeight: 500 }}>Mark paid</button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{i.paymentMethod ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'dunning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dunningState === 'loading' && <TableSkeleton />}
          {dunningState === 'error' && <ErrorState title="Could not load dunning tenants" body="The Control Plane API didn't respond." req="GET /tenants?status=..." />}
          {dunningState === 'ready' && DUNNING_GROUPS.map((g) => {
            const rows = dunningTenants[g.status] ?? [];
            return (
              <Card key={g.status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ ...badge(g.status), fontWeight: 700 }}>{g.status}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{g.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{g.note}</span>
                  <span style={{ flex: 1 }} />
                  <code style={{ fontSize: 11.5, fontWeight: 600 }}>{rows.length} accounts</code>
                </div>
                {rows.length > 0 && (
                  <table>
                    <thead><tr><th>Tenant</th><th>Owner</th><th style={{ width: '1%' }}></th></tr></thead>
                    <tbody>
                      {rows.map((t) => (
                        <tr key={t._id}>
                          <td><div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}><span style={{ fontWeight: 500 }}>{t.name}</span><code style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{t.slug}</code></div></td>
                          <td style={{ color: 'var(--tx2)' }}>{t.owner.email}</td>
                          <td><button onClick={() => navigate('/tenants/' + t.slug)} style={btnGhost()}>Open</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'recon' && (
        <Card>
          <EmptyState
            title="Payment reconciliation isn't available yet"
            body="No payment gateway is integrated — Konnect, Flouci and Stripe exist as scaffolding only (Sprint 4). Every payment recorded today is manual, via Mark paid on an invoice."
          />
        </Card>
      )}

      {mp && (
        <Modal onClose={() => !mpBusy && setMp(null)}>
          <ModalHeader title={`Mark #${mp.number} as paid`} subtitle={`${mp.tenantId} · ${money(mp.total, mp.currency)}`} />
          <ModalBody>
            {mpError && <div style={{ padding: '8px 10px', borderRadius: 5, background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)', fontSize: 11.5, color: 'var(--danger)' }}>{mpError}</div>}
            <Field label="Payment method">
              <div style={{ display: 'flex', gap: 4 }}>
                {(['transfer', 'cash', 'card'] as MpMethod[]).map((m) => (
                  <button key={m} onClick={() => setMpMethod(m)} style={{ ...chip(mpMethod === m), flex: 1 }}>{m === 'transfer' ? 'Bank transfer' : m[0].toUpperCase() + m.slice(1)}</button>
                ))}
              </div>
            </Field>
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{MPM[mpMethod]}</span>
            <Field label="Reference">
              <input value={mpRef} onChange={(e) => setMpRef(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} placeholder={mpMethod === 'transfer' ? 'BIAT-88213' : mpMethod === 'cash' ? 'REC-0042' : 'auth code'} />
            </Field>
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setMp(null)} style={btnGhost()} disabled={mpBusy}>Cancel</button>
            <span style={{ flex: 1 }} />
            <button onClick={confirmMp} style={btnPrimary(mpRef.trim().length > 1 && !mpBusy)}>{mpBusy ? 'Confirming…' : 'Confirm payment'}</button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
