import { useUiStore } from '@/store/useUiStore';

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 20,
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 34,
        padding: '0 14px',
        borderRadius: 6,
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        boxShadow: '0 12px 32px rgba(0,0,0,.35)',
        fontSize: 12.5,
        color: 'var(--tx)',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--s-active-fg)', flex: 'none' }} />
      {toast}
    </div>
  );
}
