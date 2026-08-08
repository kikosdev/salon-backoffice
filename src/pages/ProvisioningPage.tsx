import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import type { OwnerLookupApi, OwnerOwnershipApi, Paginated, PlanRecord, TenantRecord } from '@/lib/api-types';
import type { Deployment } from '@/lib/types';
import { btnGhost, btnPrimary, chip } from '@/lib/style';
import { Field, inputStyle, selectStyle } from '@/components/common';

type SlugState = 'idle' | 'checking' | 'taken' | 'free';
type PvState = 'form' | 'running' | 'done' | 'failed';

/**
 * [P5 owner multi-salon] État du lookup owner. CINQ valeurs, pas trois — les deux dernières
 * sont des issues MÉTIER distinctes, et `error` n'est pas une absence de compte :
 *   'new'                → aucun compte, création classique
 *   'owner-existing'     → déjà owner d'au moins un salon → rattachement proposé
 *   'account-not-owner'  → le compte existe mais n'est owner de RIEN → promotion proposée
 *   'error'              → le lookup a échoué (réseau/serveur). Surtout PAS "email libre" :
 *                          confondre les deux ferait créer un doublon de compte sur une
 *                          simple coupure réseau.
 */
type OwnerState = 'idle' | 'checking' | 'new' | 'owner-existing' | 'account-not-owner' | 'error';

/** Décision de l'opérateur face à un compte existant. `null` = pas encore tranché : tant
 *  qu'elle l'est, la création reste bloquée — jamais de rattachement implicite (décision 8). */
type AttachChoice = 'attach' | 'declined' | null;

function ownershipLabel(o: OwnerOwnershipApi): string {
  return o.locationLabel ? `${o.salonName} — ${o.locationLabel}` : o.salonName;
}

export function ProvisioningPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.admin?.role);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [owner, setOwner] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('TN');
  const [tz, setTz] = useState('Africa/Tunis');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [plan, setPlan] = useState('');
  const [dep, setDep] = useState<Deployment>('saas');
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [ownerState, setOwnerState] = useState<OwnerState>('idle');
  const [lookup, setLookup] = useState<OwnerLookupApi | null>(null);
  const [attachChoice, setAttachChoice] = useState<AttachChoice>(null);
  const [pv, setPv] = useState<PvState>('form');
  const [result, setResult] = useState<TenantRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const slugTimer = useRef<ReturnType<typeof setTimeout>>();
  const ownerTimer = useRef<ReturnType<typeof setTimeout>>();
  /** Anti-course : seule la réponse du DERNIER lookup lancé a le droit d'écrire l'état.
   *  Sans ça, une réponse lente sur un email déjà réécrit écraserait la bonne. */
  const lookupSeq = useRef(0);

  useEffect(() => {
    apiGet<PlanRecord[]>('/plans').then((list) => { setPlans(list); if (!plan && list[0]) setPlan(list.find((p) => p.code === 'starter')?.code ?? list[0].code); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { clearTimeout(slugTimer.current); clearTimeout(ownerTimer.current); }, []);

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

  /**
   * [P5] Lookup owner — même forme que `checkSlug` (debounce 500ms via ref, pastille d'état),
   * mais PAS la même source : `checkSlug` détourne `GET /tenants?search=`, qui ne filtre que
   * `name`/`slug` et ignore complètement `owner.email`. On passe donc par le vrai endpoint
   * `GET /owners/lookup` (passe-plat CP → DP), seul capable de répondre sur une identité.
   */
  function checkOwner(candidate: string) {
    clearTimeout(ownerTimer.current);
    setAttachChoice(null);
    setLookup(null);
    if (!candidate.includes('@') && candidate.replace(/\D/g, '').length < 6) {
      setOwnerState('idle');
      return;
    }
    setOwnerState('checking');
    const seq = ++lookupSeq.current;
    ownerTimer.current = setTimeout(async () => {
      try {
        const res = await apiGet<OwnerLookupApi>(`/owners/lookup?identifier=${encodeURIComponent(candidate)}`);
        if (seq !== lookupSeq.current) return;
        setLookup(res);
        if (!res.exists) setOwnerState('new');
        else if ((res.ownerships?.length ?? 0) > 0) setOwnerState('owner-existing');
        else setOwnerState('account-not-owner');
      } catch {
        if (seq !== lookupSeq.current) return;
        // Panne réseau/serveur ≠ "cet email est libre". On le dit, et on bloque la création
        // plutôt que de laisser créer un compte en double sur une incertitude.
        setLookup(null);
        setOwnerState('error');
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
  function onEmail(v: string) {
    setEmail(v);
    checkOwner(v.trim());
  }

  const attaching = attachChoice === 'attach' && !!lookup?.userId;
  const needsDecision = (ownerState === 'owner-existing' || ownerState === 'account-not-owner') && attachChoice === null;
  const blockedByOwner = needsDecision || ownerState === 'checking' || ownerState === 'error' || attachChoice === 'declined';
  // En rattachement, nom et téléphone viennent du compte existant : ils ne sont plus saisis,
  // donc plus exigés.
  const contactReady = attaching ? true : owner.length > 1 && phone.length > 3;
  const pvReady = name.length > 1 && slug.length > 2 && slugState !== 'taken' && email.includes('@') && contactReady && !blockedByOwner;

  function resetForm() {
    setPv('form'); setResult(null); setName(''); setSlug(''); setLocationLabel('');
    setOwner(''); setEmail(''); setPhone(''); setSlugState('idle');
    setOwnerState('idle'); setLookup(null); setAttachChoice(null);
  }

  async function submit() {
    if (!pvReady) return;
    setPv('running');
    setErrorMsg(null);
    try {
      const created = await apiPost<TenantRecord>('/tenants', {
        slug,
        name,
        locationLabel: locationLabel.trim() || undefined,
        country,
        timezone: tz,
        planId: plan || undefined,
        deployment: dep,
        // [Décision 8] Le rattachement passe par l'identité RÉSOLUE (`ownerUserId`), jamais
        // par le seul email : côté DP, un email connu sans ce flag reste un 409.
        ...(attaching ? { attachToExistingOwner: true, ownerUserId: lookup!.userId } : {}),
        owner: {
          name: attaching ? (owner.trim() || lookup!.ownerships?.[0]?.salonName || 'Owner') : owner,
          email,
          phone: attaching ? (phone.trim() || '—') : phone,
        },
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
  const ownerPill =
    ownerState === 'checking' ? ['checking…', 'var(--tx3)']
    : ownerState === 'new' ? ['new account', 'var(--s-active-fg)']
    : ownerState === 'owner-existing' ? ['existing owner', 'var(--accent)']
    : ownerState === 'account-not-owner' ? ['account exists', 'var(--accent)']
    : ownerState === 'error' ? ['lookup failed', 'var(--danger)']
    : ['', 'var(--tx3)'];

  // Créer un tenant est `@AdminRole('superadmin')` côté API. On masque l'écran plutôt que de
  // laisser un support/billing remplir un formulaire pour se prendre un 403 au submit.
  if (role && role !== 'superadmin') {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Provisioning is restricted</span>
          <span style={{ fontSize: 12, color: 'var(--tx3)' }}>
            Creating a tenant requires the <code>superadmin</code> role. Your account is <code>{role}</code>.
          </span>
        </div>
      </div>
    );
  }

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
              {result.attachToExistingOwner && (
                <span data-testid="attached-note" style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
                  Attached to the existing owner account — no new account was created, no welcome email sent.
                </span>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigate('/tenants/' + result.slug)} style={btnPrimary(true)}>Open tenant</button>
                <button onClick={resetForm} style={btnGhost()}>Provision another</button>
              </div>
            </div>
          )}

          {pv === 'failed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span data-testid="provision-error" style={{ fontSize: 12, color: 'var(--danger)' }}>{result?.provisionError ?? errorMsg ?? 'Provisioning failed for an unknown reason.'}</span>
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
        <Field label="Salon name"><input data-testid="f-name" value={name} onChange={(e) => onName(e.target.value)} style={inputStyle} placeholder="Salon Yasmine" /></Field>
        <div style={{ position: 'relative' }}>
          <Field label="Slug" hint={slugState === 'taken' ? 'a tenant with this slug may already exist' : 'becomes ' + (slug || 'your-slug') + '.salonos.tn'}>
            <input data-testid="f-slug" value={slug} onChange={(e) => onSlug(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} />
          </Field>
          <code style={{ position: 'absolute', right: 8, top: 25, fontSize: 10.5, color: slugPill[1] }}>{slugPill[0]}</code>
        </div>

        {/* [P4/P5] Libellé d'emplacement — purement d'affichage, mais c'est LE champ qui rend
            deux salons homonymes distinguables. Fortement recommandé dès qu'un rattachement
            est détecté, puisque le même propriétaire réutilise souvent le même nom. */}
        <Field
          label="Location label"
          hint={ownerState === 'owner-existing' ? 'strongly recommended — this owner already runs a salon, names are often identical' : 'optional — e.g. Ezzahra. Shown next to the salon name to tell same-name salons apart'}
        >
          <input data-testid="f-location-label" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} style={inputStyle} placeholder="Ezzahra" />
        </Field>

        <div style={{ position: 'relative' }}>
          <Field label="Owner email">
            <input
              data-testid="f-email"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              onBlur={() => email.trim() && ownerState === 'idle' && checkOwner(email.trim())}
              style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </Field>
          <code data-testid="owner-pill" style={{ position: 'absolute', right: 8, top: 25, fontSize: 10.5, color: ownerPill[1] }}>{ownerPill[0]}</code>
        </div>

        {/* ── Les trois issues du lookup, chacune avec sa formulation et son choix ── */}

        {ownerState === 'owner-existing' && lookup && (
          <div data-testid="owner-existing-banner" style={{ border: '1px solid var(--line)', background: 'var(--panel2)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Existing owner</span>
            <span style={{ fontSize: 11.5, color: 'var(--tx2)' }}>This email already owns:</span>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {lookup.ownerships!.map((o) => (
                <li key={o.tenantId} data-testid="ownership-item" style={{ fontSize: 11.5, color: 'var(--tx)' }}>{ownershipLabel(o)}</li>
              ))}
            </ul>
            {attachChoice === null && (
              <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                <button data-testid="btn-attach" onClick={() => setAttachChoice('attach')} style={btnPrimary(true)}>Attach to this owner</button>
                <button data-testid="btn-decline" onClick={() => setAttachChoice('declined')} style={btnGhost()}>Different owner — cancel</button>
              </div>
            )}
            {attachChoice === 'attach' && <span data-testid="attach-confirmed" style={{ fontSize: 11.5, color: 'var(--s-active-fg)' }}>This salon will be attached to the existing account. No new account, no welcome email.</span>}
            {attachChoice === 'declined' && <span data-testid="attach-declined" style={{ fontSize: 11.5, color: 'var(--danger)' }}>Cancelled — use a different owner email to create a new account.</span>}
          </div>
        )}

        {ownerState === 'account-not-owner' && lookup && (
          <div data-testid="not-owner-banner" style={{ border: '1px solid var(--line)', background: 'var(--panel2)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Account exists — not an owner</span>
            <span style={{ fontSize: 11.5, color: 'var(--tx2)' }}>
              This email already has an account, but it does not own any salon. Promote it to owner of this new salon?
            </span>
            {attachChoice === null && (
              <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                <button data-testid="btn-promote" onClick={() => setAttachChoice('attach')} style={btnPrimary(true)}>Promote to owner</button>
                <button data-testid="btn-decline" onClick={() => setAttachChoice('declined')} style={btnGhost()}>Cancel</button>
              </div>
            )}
            {attachChoice === 'attach' && <span data-testid="attach-confirmed" style={{ fontSize: 11.5, color: 'var(--s-active-fg)' }}>The existing account will become the owner of this salon. No new account, no welcome email.</span>}
            {attachChoice === 'declined' && <span data-testid="attach-declined" style={{ fontSize: 11.5, color: 'var(--danger)' }}>Cancelled — use a different owner email to create a new account.</span>}
          </div>
        )}

        {ownerState === 'error' && (
          <div data-testid="lookup-error" style={{ border: '1px solid var(--danger-bd)', background: 'var(--danger-bg)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>Owner lookup failed</span>
            <span style={{ fontSize: 11.5, color: 'var(--tx2)' }}>
              The Control Plane could not check this email. This does <b>not</b> mean the address is free — provisioning is blocked until the check succeeds.
            </span>
            <button data-testid="btn-retry-lookup" onClick={() => checkOwner(email.trim())} style={{ ...btnGhost(), alignSelf: 'flex-start' }}>Retry lookup</button>
          </div>
        )}

        {/* En rattachement, nom et téléphone appartiennent au compte existant : on ne les
            re-saisit pas (une valeur divergente écraserait le profil du nouveau salon avec
            des données inventées ici). */}
        {attaching ? (
          <div data-testid="owner-fields-locked" style={{ fontSize: 11.5, color: 'var(--tx3)', border: '1px dashed var(--line)', borderRadius: 6, padding: '8px 10px' }}>
            Owner name and phone come from the existing account — not re-entered here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Owner name"><input data-testid="f-owner" value={owner} onChange={(e) => setOwner(e.target.value)} style={inputStyle} /></Field>
            <Field label="Owner phone"><input data-testid="f-phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} /></Field>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Country">
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...selectStyle, height: 31, width: '100%' }}>
              <option value="TN">Tunisia</option><option value="FR">France</option><option value="AE">UAE</option>
            </select>
          </Field>
          <Field label="Timezone">
            <select value={tz} onChange={(e) => setTz(e.target.value)} style={{ ...selectStyle, height: 31, width: '100%' }}>
              <option value="Africa/Tunis">Africa/Tunis</option><option value="Europe/Paris">Europe/Paris</option><option value="Asia/Dubai">Asia/Dubai</option>
            </select>
          </Field>
        </div>
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
          <button data-testid="btn-create" onClick={submit} style={btnPrimary(pvReady)}>
            {attaching ? 'Create & attach' : 'Create tenant'}
          </button>
          <span data-testid="ready-hint" style={{ fontSize: 10.5, color: 'var(--tx3)' }}>
            {ownerState === 'checking' ? 'checking owner email…'
              : ownerState === 'error' ? 'owner lookup failed — cannot continue'
              : needsDecision ? 'decide what to do with the existing account first'
              : attachChoice === 'declined' ? 'use a different owner email'
              : pvReady ? 'ready'
              : attaching ? 'name, slug, and owner email required'
              : 'name, slug, and owner name/email/phone required'}
          </span>
        </div>
      </div>
    </div>
  );
}
