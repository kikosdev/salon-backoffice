import { useState } from 'react';
import { AUDIT } from '@/lib/mockData';
import { badge, btnPrimary, chip, initials } from '@/lib/style';
import { Card, Field, Toggle, inputStyle, selectStyle } from '@/components/common';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';

type ProfTab = 'profile' | 'security' | 'notifications';

const SESSIONS: [string, string, string, boolean][] = [
  ['Chrome 141 · macOS', 'Tunis, TN · 41.226.18.204', 'now', true],
  ['Safari 19 · iPhone', 'Tunis, TN · 41.226.18.204', '2 h ago', false],
  ['Chrome 140 · Windows', 'Sousse, TN · 197.14.62.9', 'yesterday', false],
  ['Firefox 131 · Linux', 'Paris, FR · 92.184.104.11', '9 days ago', false],
];

const NOTIF_DEFS: [string, string, string][] = [
  ['dunning', 'Invoice becomes overdue', 'One email per tenant entering the dunning sequence.'],
  ['provisionFail', 'Provisioning fails', 'Immediate email + Slack for any failed tenant creation.'],
  ['churn', 'Tenant churns or is suspended', 'Sent to you and the supervisor on lifecycle changes.'],
  ['impersonation', 'Someone impersonates a tenant', 'Keeps the team honest — every session, all admins.'],
  ['weekly', 'Weekly MRR digest', 'Monday 08:00 Africa/Tunis, revenue and churn summary.'],
];

export function ProfilePage() {
  const role = useUiStore((s) => s.role);
  const flash = useUiStore((s) => s.flash);
  const profile = useDataStore((s) => s.profile);
  const saveProfile = useDataStore((s) => s.saveProfile);
  const notif = useDataStore((s) => s.notif);
  const toggleNotif = useDataStore((s) => s.toggleNotif);

  const [tab, setTab] = useState<ProfTab>('profile');
  const [draft, setDraft] = useState(profile);
  const [pwCur, setPwCur] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const pwStrong = pwNext.length >= 12 && /[A-Z]/.test(pwNext) && /[0-9]/.test(pwNext);
  const pwMatch = pwNext.length > 0 && pwNext === pwConfirm;
  const pwOkAll = pwCur.length >= 8 && pwStrong && pwMatch;

  function save() {
    if (!dirty) return;
    saveProfile(draft);
    flash('Profile updated');
  }

  const pwRules = [
    { label: 'At least 12 characters', ok: pwNext.length >= 12 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(pwNext) },
    { label: 'One number', ok: /[0-9]/.test(pwNext) },
    { label: 'Both entries match', ok: pwMatch },
  ];

  const mfaRows = [
    { k: 'Authenticator app', v: 'Enrolled 2024-02-01 · Aegis', state: 'active' as const },
    { k: 'Recovery codes', v: '8 of 10 unused · last generated 2025-11-02', state: 'trial' as const },
    { k: 'Hardware key', v: 'Not enrolled — recommended for superadmin', state: 'past_due' as const },
  ];

  const myActivity = AUDIT.filter((a) => a[1] === 'Karim Ben Salah').slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--tx2)' }}>{initials(profile.name)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{profile.name}</span>
          <span style={{ ...badge(role === 'superadmin' ? 'trial' : role === 'billing' ? 'past_due' : 'active'), fontWeight: 600, alignSelf: 'flex-start' }}>{role}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {(['profile', 'security', 'notifications'] as ProfTab[]).map((p) => (
          <button key={p} onClick={() => setTab(p)} style={chip(tab === p)}>{p[0].toUpperCase() + p.slice(1)}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card title="Profile">
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Full name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={inputStyle} /></Field>
              <Field label="Email" hint="email is managed by a supervisor and cannot be changed here">
                <input value={draft.email} disabled style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12, opacity: 0.6 }} />
              </Field>
              <Field label="Phone"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} /></Field>
              <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={inputStyle} /></Field>
              <Field label="Timezone">
                <select value={draft.tz} onChange={(e) => setDraft({ ...draft, tz: e.target.value })} style={{ ...selectStyle, height: 31, width: '100%' }}>
                  <option value="Africa/Tunis">Africa/Tunis</option><option value="Europe/Paris">Europe/Paris</option>
                </select>
              </Field>
              <Field label="Language">
                <select value={draft.lang} onChange={(e) => setDraft({ ...draft, lang: e.target.value })} style={{ ...selectStyle, height: 31, width: '100%' }}>
                  <option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={save} style={btnPrimary(dirty)}>Save changes</button>
              <span style={{ fontSize: 10.5, color: dirty ? 'var(--s-past_due-fg)' : 'var(--tx3)' }}>{dirty ? 'unsaved changes' : 'no changes to save'}</span>
            </div>
          </div>
        </Card>
      )}

      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card title="Change password">
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Current password"><input type="password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} style={inputStyle} /></Field>
              <Field label="New password"><input type="password" value={pwNext} onChange={(e) => setPwNext(e.target.value)} style={inputStyle} /></Field>
              <Field label="Confirm new password"><input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} style={inputStyle} /></Field>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {pwRules.map((r) => (
                  <span key={r.label} style={{ fontSize: 11, color: r.ok ? 'var(--s-active-fg)' : 'var(--tx3)' }}>{r.ok ? '✓' : '·'} {r.label}</span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => { if (!pwOkAll) return; setPwCur(''); setPwNext(''); setPwConfirm(''); flash('Password changed · other sessions signed out'); }} style={btnPrimary(pwOkAll)}>Change password</button>
                <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{pwOkAll ? 'all sessions except this one will be signed out' : 'current password and a strong new password are required'}</span>
              </div>
            </div>
          </Card>

          <Card title="Multi-factor authentication">
            <div>
              {mfaRows.map((r) => (
                <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: '1px solid var(--line2)' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--tx)' }}>{r.k}</span>
                    <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{r.v}</span>
                  </div>
                  <span style={badge(r.state)}>{r.state === 'active' ? 'ok' : r.state === 'trial' ? 'ok' : 'missing'}</span>
                  <button onClick={() => flash(r.k === 'Recovery codes' ? '10 new recovery codes generated · old codes invalidated' : 'MFA re-enrolment started · scan the new QR on your next sign-in')} style={{ height: 24, padding: '0 9px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>
                    {r.k === 'Recovery codes' ? 'Regenerate' : 'Re-enrol'}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Active sessions" action={<button onClick={() => flash('3 other sessions revoked')} style={{ background: 'transparent', border: 0, color: 'var(--accent)', fontSize: 11, padding: 0 }}>Revoke others</button>}>
            <div>
              {SESSIONS.map(([agent, where, when, isCurrent]) => (
                <div key={agent} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--line2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: isCurrent ? 'var(--s-active-fg)' : 'var(--tx3)' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--tx)' }}>{agent}{isCurrent && <code style={{ marginLeft: 8, fontSize: 10, color: 'var(--s-active-fg)' }}>this session</code>}</span>
                    <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{where} · {when}</span>
                  </div>
                  {!isCurrent && <button onClick={() => flash('Session revoked · ' + agent)} style={{ height: 24, padding: '0 9px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Revoke</button>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card title="Notification preferences">
            <div>
              {NOTIF_DEFS.map(([key, label, desc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: '1px solid var(--line2)' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--tx)' }}>{label}</span>
                    <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{desc}</span>
                  </div>
                  <Toggle on={notif[key]} onClick={() => toggleNotif(key)} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="My recent activity">
            <table>
              <thead><tr><th>Timestamp</th><th>Action</th><th>Tenant</th><th>Detail</th></tr></thead>
              <tbody>
                {myActivity.map((a) => (
                  <tr key={a[0]}>
                    <td><code style={{ color: 'var(--tx3)' }}>{a[0]}</code></td>
                    <td>{a[3]}</td>
                    <td><code style={{ color: 'var(--tx2)' }}>{a[4]}</code></td>
                    <td style={{ color: 'var(--tx3)' }}>{a[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
