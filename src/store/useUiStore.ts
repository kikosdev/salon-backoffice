import { create } from 'zustand';
import { apiPost } from '@/lib/api';
import { decodeAccessToken } from '@/lib/jwt';
import { getAccessToken } from '@/lib/tokenStore';
import type { OperatorRole } from '@/lib/types';

/** [Prompt 8, correction] `role` défautait sur `'superadmin'` avant que `App.tsx` ne le
 *  corrige via un effect une fois `admin` hydraté — sur le tout premier rendu après un login,
 *  ça laissait une fenêtre d'un tick où Dashboard/Billing tiraient des requêtes réservées au
 *  superadmin avec un compte support/billing (rejetées en 403 côté serveur, sans fuite de
 *  données, mais un défaut par-dessus-permissif reste le mauvais sens par défaut). Décoder le
 *  JWT déjà en storage est synchrone — pas besoin d'attendre l'effect pour la première valeur.
 */
function initialRole(): OperatorRole {
  const token = getAccessToken();
  const claims = token ? decodeAccessToken(token) : null;
  return claims?.role ?? 'support';
}

type Theme = 'dark' | 'light';
type Density = 'compact' | 'comfortable';

export interface ImpersonationSession {
  sessionId: string;
  tenantMongoId: string;
  tenantSlug: string;
  tenantName: string;
  redirectUrl: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
}

const IMP_STORAGE_KEY = 'so_impersonation_session';

function loadPersistedSession(): ImpersonationSession | null {
  try {
    const raw = localStorage.getItem(IMP_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ImpersonationSession;
    // Une session dont le token a déjà expiré ne mérite plus d'occuper la bannière —
    // `end()` réel n'est pas rappelable après coup (le token DP est de toute façon mort),
    // donc on nettoie juste l'affichage local.
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(IMP_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

interface UiState {
  theme: Theme;
  density: Density;
  role: OperatorRole;
  toast: string | null;
  imp: ImpersonationSession | null;
  impModalTenantId: string | null;
  openImpModal: (tenantMongoId: string) => void;
  closeImpModal: () => void;
  toggleTheme: () => void;
  toggleDensity: () => void;
  setRole: (role: OperatorRole) => void;
  flash: (msg: string) => void;
  clearToast: () => void;
  startImpersonation: (session: ImpersonationSession) => void;
  endImpersonation: () => Promise<void>;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'dark',
  density: 'compact',
  role: initialRole(),
  toast: null,
  imp: loadPersistedSession(),
  impModalTenantId: null,
  openImpModal: (tenantMongoId) => set({ impModalTenantId: tenantMongoId }),
  closeImpModal: () => set({ impModalTenantId: null }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  toggleDensity: () => set((s) => ({ density: s.density === 'compact' ? 'comfortable' : 'compact' })),
  setRole: (role) => set({ role }),
  flash: (msg) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => get().clearToast(), 3600);
  },
  clearToast: () => set({ toast: null }),
  startImpersonation: (session) => {
    localStorage.setItem(IMP_STORAGE_KEY, JSON.stringify(session));
    set({ imp: session });
  },
  endImpersonation: async () => {
    const session = get().imp;
    localStorage.removeItem(IMP_STORAGE_KEY);
    set({ imp: null });
    if (session) {
      // Best-effort — la bannière disparaît immédiatement côté UI même si l'appel échoue
      // (le token expire de toute façon au bout de 15 min), mais on tente quand même le
      // vrai POST /impersonations/:id/end pour que l'historique reflète une fin explicite.
      await apiPost(`/impersonations/${session.sessionId}/end`).catch(() => {});
    }
  },
}));
