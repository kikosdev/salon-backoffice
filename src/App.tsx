import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useUiStore } from '@/store/useUiStore';
import { AppShell } from '@/components/layout/AppShell';
import { SignInPage } from '@/pages/SignInPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TenantsPage } from '@/pages/TenantsPage';
import { TenantDetailPage } from '@/pages/TenantDetail';
import { ProvisioningPage } from '@/pages/ProvisioningPage';
import { PlansPage } from '@/pages/PlansPage';
import { BillingPage } from '@/pages/BillingPage';
import { OperatorsPage } from '@/pages/OperatorsPage';
import { ImpersonationPage } from '@/pages/ImpersonationPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { HealthPage } from '@/pages/HealthPage';
import { ProfilePage } from '@/pages/ProfilePage';

export default function App() {
  const stage = useAuthStore((s) => s.stage);
  const admin = useAuthStore((s) => s.admin);
  const hydrate = useAuthStore((s) => s.hydrate);
  const setRole = useUiStore((s) => s.setRole);

  // Reprend une session déjà valide (token en localStorage) au chargement de la page —
  // sans ça, un simple F5 renverrait toujours à l'écran de connexion.
  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le rôle affiché/utilisé pour le gating UI vient TOUJOURS du JWT authentifié — jamais
  // d'un sélecteur manuel (voir la suppression des ROLE_CHIPS dans Sidebar).
  useEffect(() => {
    if (admin) setRole(admin.role);
  }, [admin, setRole]);

  if (stage !== 'in') {
    return <SignInPage />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/tenants/:slug" element={<TenantDetailPage />} />
        <Route path="/provision" element={<ProvisioningPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/team" element={<OperatorsPage />} />
        <Route path="/impersonation" element={<ImpersonationPage />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
