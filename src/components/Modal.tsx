import type { ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

export function Modal({ onClose, width = 440, children }: ModalProps) {
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width,
          maxWidth: '100%',
          maxHeight: '86vh',
          overflow: 'auto',
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          boxShadow: '0 24px 60px rgba(0,0,0,.45)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      {subtitle && <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{subtitle}</span>}
    </div>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
    </div>
  );
}
