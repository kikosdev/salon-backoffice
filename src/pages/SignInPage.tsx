import { useAuthStore } from '@/store/useAuthStore';
import { inputStyle } from '@/components/common';
import { btnPrimary } from '@/lib/style';

const AUTH_NOTES = [
  { k: 'MFA is mandatory', v: 'Every operator account requires a TOTP authenticator. No exceptions, no bypass.' },
  { k: 'Everything is logged', v: 'Sign-ins, impersonations and lifecycle actions are written to the append-only audit log.' },
  { k: 'Least privilege', v: 'Your role decides what you can see: support cannot record payments, billing cannot impersonate.' },
];

function ErrorBanner({ label, msg }: { label: string; msg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 5, background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)' }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: 'var(--danger)' }}>{label}</span>
      <span style={{ fontSize: 11.5, color: 'var(--tx2)' }}>{msg}</span>
    </div>
  );
}

export function SignInPage() {
  const stage = useAuthStore((s) => s.stage);
  const email = useAuthStore((s) => s.email);
  const password = useAuthStore((s) => s.password);
  const code = useAuthStore((s) => s.code);
  const error = useAuthStore((s) => s.error);
  const loading = useAuthStore((s) => s.loading);
  const totpSetup = useAuthStore((s) => s.totpSetup);
  const setEmail = useAuthStore((s) => s.setEmail);
  const setPassword = useAuthStore((s) => s.setPassword);
  const setCode = useAuthStore((s) => s.setCode);
  const submitSignin = useAuthStore((s) => s.submitSignin);
  const submitTotp = useAuthStore((s) => s.submitTotp);
  const backToSignin = useAuthStore((s) => s.backToSignin);
  const unlockSession = useAuthStore((s) => s.unlockSession);
  const signOut = useAuthStore((s) => s.signOut);

  const pwOk = password.length >= 8;
  const codeOk = /^\d{6}$/.test(code);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: 820, maxWidth: '100%', display: 'grid', gridTemplateColumns: '1fr 340px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.35)' }}>
        <div style={{ padding: '26px 26px 22px', display: 'flex', flexDirection: 'column', gap: 18, borderRight: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>S</div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>SalonOS</span>
              <span style={{ fontSize: 10, color: 'var(--tx3)', letterSpacing: '.06em' }}>CONTROL PLANE · OPERATORS ONLY</span>
            </div>
          </div>

          {stage === 'signin' && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (pwOk && !loading) submitSignin(); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Sign in</span>
                <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>Operator accounts only. Customer logins live on the tenant app.</span>
              </div>
              {error && <ErrorBanner label="DENIED" msg={error} />}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>Work email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@salonos.tn" style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} />
              </label>
              <button type="submit" disabled={!pwOk || loading} style={{ ...btnPrimary(pwOk && !loading), height: 31 }}>
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>
          )}

          {stage === 'totp-setup' && totpSetup && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (codeOk && !loading) submitTotp(); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Set up your authenticator</span>
                <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>First sign-in for <code style={{ color: 'var(--tx2)' }}>{email}</code> — scan this once, then enter the 6-digit code it shows.</span>
              </div>
              {error && <ErrorBanner label="REJECTED" msg={error} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={totpSetup.qrDataUrl} alt="TOTP QR code" width={104} height={104} style={{ borderRadius: 6, border: '1px solid var(--line)', background: '#fff', padding: 4, flex: 'none' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>Can't scan? Enter this URI manually in your authenticator app:</span>
                  <code style={{ fontSize: 9.5, color: 'var(--tx3)', wordBreak: 'break-all' }}>{totpSetup.otpauthUrl}</code>
                </div>
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                style={{ height: 44, padding: '0 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx)', fontFamily: 'var(--mono)', fontSize: 22, letterSpacing: '.5em', textAlign: 'center' }}
              />
              <button type="submit" disabled={!codeOk || loading} style={{ ...btnPrimary(codeOk && !loading), height: 31 }}>
                {loading ? 'Verifying…' : 'Confirm & open console'}
              </button>
              <button type="button" onClick={backToSignin} style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--tx3)', fontSize: 11, textAlign: 'left' }}>← Use a different account</button>
            </form>
          )}

          {stage === 'totp-challenge' && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (codeOk && !loading) submitTotp(); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Two-factor code</span>
                <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>Enter the 6-digit code from your authenticator for <code style={{ color: 'var(--tx2)' }}>{email}</code>.</span>
              </div>
              {error && <ErrorBanner label="REJECTED" msg={error} />}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                autoFocus
                style={{ height: 44, padding: '0 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx)', fontFamily: 'var(--mono)', fontSize: 22, letterSpacing: '.5em', textAlign: 'center' }}
              />
              <button type="submit" disabled={!codeOk || loading} style={{ ...btnPrimary(codeOk && !loading), height: 31 }}>
                {loading ? 'Verifying…' : 'Verify & open console'}
              </button>
              <button type="button" onClick={backToSignin} style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--tx3)', fontSize: 11, textAlign: 'left' }}>← Use a different account</button>
            </form>
          )}

          {stage === 'locked' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Session locked</span>
                <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>Your place in the console is kept.</span>
              </div>
              {error && <ErrorBanner label="DENIED" msg={error} />}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} />
              </label>
              <button onClick={unlockSession} style={{ ...btnPrimary(pwOk), height: 31 }}>Resume</button>
              <button onClick={signOut} style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--tx3)', fontSize: 11, textAlign: 'left' }}>Sign out instead</button>
            </div>
          )}
        </div>

        <div style={{ padding: '26px 22px', background: 'var(--panel2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--tx3)' }}>Restricted system</span>
          {AUTH_NOTES.map((n) => (
            <div key={n.k} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', borderBottom: '1px solid var(--line2)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--tx)' }}>{n.k}</span>
              <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{n.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
