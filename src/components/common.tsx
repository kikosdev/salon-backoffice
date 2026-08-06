import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

export const inputStyle: CSSProperties = {
  height: 31,
  padding: '0 10px',
  borderRadius: 5,
  border: '1px solid var(--line)',
  background: 'var(--panel2)',
  color: 'var(--tx)',
  width: '100%',
};

export const selectStyle: CSSProperties = {
  height: 28,
  padding: '0 8px',
  borderRadius: 5,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  color: 'var(--tx2)',
  fontSize: 12,
};

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{hint}</span>}
    </label>
  );
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, display: 'flex', flexDirection: 'column' }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function KVRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 12px', borderBottom: '1px solid var(--line2)' }}>
      <span style={{ width: 150, flex: 'none', fontSize: 11.5, color: 'var(--tx3)' }}>{k}</span>
      <code style={{ flex: 1, color: 'var(--tx)', fontSize: 11.5 }}>{v}</code>
    </div>
  );
}

export function EmptyState({ title, body, actions }: { title: string; body: string; actions?: ReactNode }) {
  return (
    <div style={{ padding: '56px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)' }}>
        <Icon d="M7 7 4.2 4.2M10.2 10.2 13.5 13.5" size={15} style={{}} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--tx3)', maxWidth: 330 }}>{body}</span>
      {actions && <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>{actions}</div>}
    </div>
  );
}

export function ErrorState({ title, body, req, actions }: { title: string; body: string; req: string; actions?: ReactNode }) {
  return (
    <div style={{ padding: '44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 9px', borderRadius: 11, fontSize: 11, fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)' }}>
        REQUEST FAILED · 504
      </span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--tx3)', maxWidth: 360 }}>{body}</span>
      <code style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{req}</code>
      {actions && <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>{actions}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div>
      <div style={{ display: 'flex', padding: '0 10px', height: 30, alignItems: 'center', background: 'var(--panel2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
        Loading…
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 'var(--rowh)', padding: '0 10px', borderBottom: '1px solid var(--line2)' }}>
          <div style={{ height: 8, width: 170, borderRadius: 4, background: 'linear-gradient(90deg,var(--line2),var(--line),var(--line2))', backgroundSize: '320px 100%', animation: 'shim 1.2s linear infinite' }} />
          <div style={{ height: 8, width: 110, borderRadius: 4, background: 'var(--line2)' }} />
          <div style={{ height: 8, width: 64, borderRadius: 4, background: 'var(--line2)' }} />
          <div style={{ height: 8, width: 90, borderRadius: 4, background: 'var(--line2)' }} />
          <div style={{ flex: 1 }} />
          <div style={{ height: 8, width: 70, borderRadius: 4, background: 'var(--line2)' }} />
        </div>
      ))}
    </div>
  );
}

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32, height: 18, borderRadius: 9, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--line)'),
        background: on ? 'var(--accent)' : 'var(--panel2)', display: 'flex', alignItems: 'center', padding: 2,
        justifyContent: on ? 'flex-end' : 'flex-start',
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: on ? '#fff' : 'var(--tx3)' }} />
    </button>
  );
}
