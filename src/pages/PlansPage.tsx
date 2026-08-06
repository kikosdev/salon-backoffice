import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api';
import type { FeatureFlagRecord, PlanRecord } from '@/lib/api-types';
import { money } from '@/lib/style';
import { Card, EmptyState, Field, TableSkeleton, Toggle, inputStyle } from '@/components/common';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/Modal';
import { btnGhost, btnPrimary } from '@/lib/style';
import { useUiStore } from '@/store/useUiStore';

const MROWS: [string, (p: PlanRecord) => string | number | boolean, 'money' | 'bool' | undefined][] = [
  ['price / month', (p) => money(p.priceMonthly, p.currency), 'money'],
  ['staffMax', (p) => (p.limits.staffMax === -1 ? '∞' : p.limits.staffMax), undefined],
  ['locationsMax', (p) => (p.limits.locationsMax === -1 ? '∞' : p.limits.locationsMax), undefined],
  ['appointmentsMonth', (p) => (p.limits.appointmentsMonth === -1 ? '∞' : p.limits.appointmentsMonth.toLocaleString('en-US')), undefined],
  ['smsQuota', (p) => (p.limits.smsQuota === -1 ? '∞' : p.limits.smsQuota.toLocaleString('en-US')), undefined],
  ['pos', (p) => p.features.pos, 'bool'],
  ['ecommerce', (p) => p.features.ecommerce, 'bool'],
  ['mobileApp', (p) => p.features.mobileApp, 'bool'],
  ['analytics', (p) => p.features.analytics, 'bool'],
  ['customDomain', (p) => p.features.customDomain, 'bool'],
  ['api', (p) => p.features.api, 'bool'],
];

export function PlansPage() {
  const role = useUiStore((s) => s.role);
  const flash = useUiStore((s) => s.flash);
  const canEditFlags = role === 'superadmin';

  const [plansState, setPlansState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [flagsState, setFlagsState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [flags, setFlags] = useState<FeatureFlagRecord[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [create, setCreate] = useState<{ key: string; description: string; defaultOn: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlansState('loading');
    apiGet<PlanRecord[]>('/plans').then((p) => { setPlans(p.sort((a, b) => a.sortOrder - b.sortOrder)); setPlansState('ready'); }).catch(() => setPlansState('error'));
  }, [reloadKey]);

  useEffect(() => {
    setFlagsState('loading');
    apiGet<FeatureFlagRecord[]>('/flags').then((f) => { setFlags(f); setFlagsState('ready'); }).catch(() => setFlagsState('error'));
  }, [reloadKey]);

  async function toggleFlag(flag: FeatureFlagRecord) {
    if (!canEditFlags || busy) return;
    setBusy(true);
    try {
      await apiPatch(`/flags/${flag.key}`, { defaultOn: !flag.defaultOn });
      flash(`${flag.key} · defaultOn ${!flag.defaultOn}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Could not update the flag.');
    } finally {
      setBusy(false);
    }
  }

  async function removeOverride(flagKey: string, tenantId: string) {
    if (!canEditFlags || busy) return;
    setBusy(true);
    try {
      await apiDelete(`/flags/${flagKey}/overrides/${tenantId}`);
      flash('Override removed');
      setReloadKey((k) => k + 1);
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Could not remove the override.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCreate() {
    if (!create || create.key.trim().length < 2 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost('/flags', { key: create.key.trim(), description: create.description.trim() || create.key.trim(), defaultOn: create.defaultOn });
      flash(`Flag "${create.key.trim()}" created`);
      setCreate(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the flag.');
    } finally {
      setBusy(false);
    }
  }

  const overrides = flags.flatMap((f) => f.overrides.map((o) => ({ flag: f.key, tenantId: o.tenantId, on: o.on })));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1400 }}>
      <Card title="Plans">
        {plansState === 'loading' && <TableSkeleton rows={3} />}
        {plansState === 'error' && <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--tx3)' }}>Could not load plans.</div>}
        {plansState === 'ready' && (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Entitlement</th>
                  {plans.map((p) => <th key={p.code} style={{ textAlign: 'right' }}>{p.code}</th>)}
                </tr>
              </thead>
              <tbody>
                {MROWS.map(([key, fn, kind]) => (
                  <tr key={key}>
                    <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: kind === 'bool' ? 'var(--tx2)' : 'var(--tx)', fontWeight: kind === 'money' ? 600 : 400 }}>{key}</code></td>
                    {plans.map((p) => {
                      const v = fn(p);
                      if (kind === 'bool') {
                        return <td key={p.code} style={{ textAlign: 'right' }}><span style={{ display: 'inline-flex', fontFamily: 'var(--mono)', fontSize: 11, color: v ? 'var(--s-active-fg)' : 'var(--tx3)' }}>{v ? 'on' : 'off'}</span></td>;
                      }
                      return <td key={p.code} style={{ textAlign: 'right' }}><code style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--tx)', fontWeight: kind === 'money' ? 600 : 400 }}>{v}</code></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Feature flags" action={canEditFlags && <button onClick={() => setCreate({ key: '', description: '', defaultOn: false })} style={{ height: 24, padding: '0 9px', borderRadius: 5, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>New flag</button>}>
        {flagsState === 'loading' && <TableSkeleton rows={3} />}
        {flagsState === 'error' && <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--tx3)' }}>Could not load flags.</div>}
        {flagsState === 'ready' && flags.length === 0 && <EmptyState title="No feature flags yet" body="Flags let you roll out a behavior change to specific tenants before a full release." />}
        {flagsState === 'ready' && flags.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {flags.map((f) => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: '1px solid var(--line2)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <code style={{ fontSize: 12, color: 'var(--tx)' }}>{f.key}</code>
                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{f.description}</span>
                </div>
                <code style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{f.rolloutPercent !== undefined ? `${f.rolloutPercent}% rollout` : `${f.overrides.length} override(s)`}</code>
                <Toggle on={f.defaultOn} onClick={() => toggleFlag(f)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Per-tenant overrides · ${overrides.length}`}>
        {flagsState === 'ready' && overrides.length === 0 && <EmptyState title="No overrides" body="Tenant-specific flag overrides show up here." />}
        {flagsState === 'ready' && overrides.length > 0 && (
          <table>
            <thead><tr><th>Tenant id</th><th>Flag</th><th>Value</th><th style={{ width: '1%' }}></th></tr></thead>
            <tbody>
              {overrides.map((o, i) => (
                <tr key={i}>
                  <td><code style={{ color: 'var(--tx2)' }}>{o.tenantId}</code></td>
                  <td>{o.flag}</td>
                  <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: o.on ? 'var(--s-active-fg)' : 'var(--tx3)' }}>{String(o.on)}</code></td>
                  <td>{canEditFlags && <button onClick={() => removeOverride(o.flag, o.tenantId)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--danger-bd)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 11 }}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {create && (
        <Modal onClose={() => !busy && setCreate(null)}>
          <ModalHeader title="New feature flag" subtitle="superadmin only — engineering/ops domain." />
          <ModalBody>
            {error && <div style={{ padding: '8px 10px', borderRadius: 5, background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)', fontSize: 11.5, color: 'var(--danger)' }}>{error}</div>}
            <Field label="Key"><input value={create.key} onChange={(e) => setCreate({ ...create, key: e.target.value })} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} placeholder="mute-quota-warnings" /></Field>
            <Field label="Description"><input value={create.description} onChange={(e) => setCreate({ ...create, description: e.target.value })} style={inputStyle} /></Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Toggle on={create.defaultOn} onClick={() => setCreate({ ...create, defaultOn: !create.defaultOn })} />
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Default on</span>
            </label>
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setCreate(null)} style={btnGhost()} disabled={busy}>Cancel</button>
            <span style={{ flex: 1 }} />
            <button onClick={submitCreate} style={btnPrimary(create.key.trim().length > 1 && !busy)}>{busy ? 'Creating…' : 'Create'}</button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
