import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { Paginated, PlanRecord, TenantRecord } from '@/lib/api-types';
import type { Deployment } from '@/lib/types';
import { btnGhost, btnPrimary, chip } from '@/lib/style';
import { Field, inputStyle, selectStyle } from '@/components/common';

type SlugState = 'idle' | 'checking' | 'taken' | 'free';
type PvState = 'form' | 'running' | 'done' | 'failed';

export function ProvisioningPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [owner, setOwner] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('TN');
  const [tz, setTz] = useState('Africa/Tunis');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [plan, setPlan] = useState('');
  const [dep, setDep] = useState<Deployment>('saas');
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [pv, setPv] = useState<PvState>('form');
  const [result, setResult] = useState<TenantRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const slugTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    apiGet<PlanRecord[]>('/plans').then((list) => { setPlans(list); if (!plan && list[0]) setPlan(list.find((p) => p.code === 'starter')?.code ?? list[0].code); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(slugTimer.current), []);

  // [Prompt 8] Pas de vérification de disponibilité dédiée côté backend — `POST /tenants`
  // rejette lui-même un slug déjà pris (409). Ce check est un indice best-effort (via
  // `search`), PAS une garantie : la vraie source de vérité reste la réponse du submit.
  function checkSlug(candidate: string) {
    clearTimeout(slugTimer.current);
    if (candidate.length <= 2) {
      setSlugState('idle');
      return;
    }
    setSlugState('checking');
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await apiGet<Paginated<TenantRecord>>(`/tenants?search=${encodeURIComponent(candidate)}&limit=10`);
        setSlugState(res.items.some((t) => t.slug === candidate) ? 'taken' : 'free');
      } catch {
        setSlugState('idle');
      }
    }, 500);
  }

  function onName(v: string) {
    setName(v);
    const derived = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setSlug(derived);
    checkSlug(derived);
  }
  function onSlug(v: string) {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
    checkSlug(cleaned);
  }

  const pvReady = name.length > 1 && slug.length > 2 && slugState !== 'taken' && owner.length > 1 && email.includes('@') && phone.length > 3;

  async function submit() {
    if (!pvReady) return;
    setPv('running');
    setErrorMsg(null);
    try {
      const created = await apiPost<TenantRecord>('/tenants', {
        slug,
        name,
        country,
        timezone: tz,
        planId: plan || undefined,
        deployment: dep,
        owner: { name: owner, email, phone },
      });
      setResult(created);
      setPv(created.provisionError ? 'failed' : 'done');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Provisioning failed.');
      setPv('failed');
    }
  }

  async function retry() {
    if (!result) return;
    setPv('running');
    setErrorMsg(null);
    try {
      const updated = await apiPost<TenantRecord>(`/tenants/${result._id}/retry-provision`);
      setResult(updated);
      setPv(updated.provisionError ? 'failed' : 'done');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Retry failed.');
      setPv('failed');
    }
  }

  const slugPill = slugState === 'checking' ? ['checking…', 'var(--tx3)'] : slugState === 'taken' ? ['likely taken', 'var(--danger)'] : slugState === 'free' ? ['looks available', 'var(--s-active-fg)'] : ['', 'var(--tx3)'];

  if (pv === 'running' || pv === 'done' || pv === 'failed') {
    return (
      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Provisioning {slug || 'new-tenant'}</span>
            <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
              {pv === 'running' ? 'Calling the Control Plane — provisioning is synchronous, this usually takes a few seconds.' : pv === 'done' ? 'Complete — the tenant record and Data Plane workspace both exist.' : 'Provisioning did not complete.'}
            </span>
          </div>

          {pv === 'running' && (
            <div style={{ height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ width: '60%', height: '100%', background: 'var(--accent)', animation: 'shim 1.2s linear infinite', backgroundSize: '320px 100%' }} />
            </div>
          )}

          {pv === 'done' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Status: <code style={{ color: 'var(--s-active-fg)' }}>{result.status}</code></span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigate('/tenants/' + result.slug)} style={btnPrimary(true)}>Open tenant</button>
                <button onClick={() => { setPv('form'); setResult(null); setName(''); setSlug(''); setOwner(''); setEmail(''); setPhone(''); setSlugState('idle'); }} style={btnGhost()}>Provision another</button>
              </div>
            </div>
          )}

          {pv === 'failed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>{result?.provisionError ?? errorMsg ?? 'Provisioning failed for an unknown reason.'}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {result ? (
                  <button onClick={retry} style={btnPrimary(true)}>Retry provisioning</button>
                ) : (
                  <button onClick={submit} style={btnPrimary(true)}>Retry</button>
                )}
                <button onClick={() => { setPv('form'); setErrorMsg(null); }} style={btnGhost()}>Edit details</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Create tenant</span>
        <Field label="Salon name"><input value={name} onChange={(e) => onName(e.target.value)} style={inputStyle} placeholder="Salon Yasmine" /></Field>
        <div style={{ position: 'relative' }}>
          <Field label="Slug" hint={slugState === 'taken' ? 'a tenant with this slug may already exist' : 'becomes ' + (slug || 'your-slug') + '.salonos.tn'}>
            <input value={slug} onChange={(e) => onSlug(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} />
          </Field>
          <code style={{ position: 'absolute', right: 8, top: 25, fontSize: 10.5, color: slugPill[1] }}>{slugPill[0]}</code>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Owner name"><input value={owner} onChange={(e) => setOwner(e.target.value)} style={inputStyle} /></Field>
          <Field label="Owner email"><input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Owner phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} /></Field>
          <Field label="Country">
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...selectStyle, height: 31, width: '100%' }}>
              <option value="TN">Tunisia</option><option value="FR">France</option><option value="AE">UAE</option>
            </select>
          </Field>
        </div>
        <Field label="Timezone">
          <select value={tz} onChange={(e) => setTz(e.target.value)} style={{ ...selectStyle, height: 31, width: '100%' }}>
            <option value="Africa/Tunis">Africa/Tunis</option><option value="Europe/Paris">Europe/Paris</option><option value="Asia/Dubai">Asia/Dubai</option>
          </select>
        </Field>
        <Field label="Plan">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {plans.map((p) => <button key={p.code} onClick={() => setPlan(p.code)} style={{ ...chip(plan === p.code), flex: '1 0 30%' }}>{p.code}</button>)}
          </div>
        </Field>
        <Field label="Deployment">
          <div style={{ display: 'flex', gap: 4 }}>
            {(['saas', 'dedicated'] as Deployment[]).map((p) => <button key={p} onClick={() => setDep(p)} style={{ ...chip(dep === p), flex: 1 }}>{p}</button>)}
          </div>
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
          <button onClick={submit} style={btnPrimary(pvReady)}>Create tenant</button>
          <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{pvReady ? 'ready' : 'name, slug, and owner name/email/phone required'}</span>
        </div>
      </div>
    </div>
  );
}
