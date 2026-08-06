import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ImpersonationBanner } from './ImpersonationBanner';
import { Toast } from '../Toast';
import { ImpersonateModal } from '../modals/ImpersonateModal';
import { useUiStore } from '@/store/useUiStore';

export function AppShell() {
  const theme = useUiStore((s) => s.theme);
  const density = useUiStore((s) => s.density);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ImpersonationBanner />
        <Header />
        <main style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          <Outlet />
        </main>
      </div>
      <Toast />
      <ImpersonateModal />
    </div>
  );
}
