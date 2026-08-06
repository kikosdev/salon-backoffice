import { create } from 'zustand';
import { apiPost, ApiError } from '@/lib/api';
import { decodeAccessToken, isExpired } from '@/lib/jwt';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/tokenStore';
import type { OperatorRole } from '@/lib/types';

export type AuthStage = 'signin' | 'totp-setup' | 'totp-challenge' | 'locked' | 'in';

export interface AdminProfile {
  sub: string;
  email: string;
  role: OperatorRole;
}

interface LoginSetupResponse {
  requiresTotpSetup: true;
  otpauthUrl: string;
  qrDataUrl: string;
  tempToken: string;
}
interface LoginChallengeResponse {
  requiresTotp: true;
  tempToken: string;
}
interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  stage: AuthStage;
  email: string;
  password: string;
  code: string;
  error: string | null;
  loading: boolean;
  /** Le tempToken (5 min) émis par /auth/login — jamais persisté, valeur en mémoire seule. */
  tempToken: string | null;
  /** QR + otpauth de la première connexion — affiché le temps de scanner, jamais réutilisé
   *  après un verify-totp réussi (le secret n'existe qu'ici et dans le tempToken JWT). */
  totpSetup: { otpauthUrl: string; qrDataUrl: string } | null;
  admin: AdminProfile | null;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setCode: (v: string) => void;
  submitSignin: () => Promise<void>;
  submitTotp: () => Promise<void>;
  backToSignin: () => void;
  lockSession: () => void;
  unlockSession: () => void;
  signOut: () => void;
  /** Appelé une fois au montage de l'app pour reprendre une session déjà valide (token en
   *  storage) sans repasser par login+TOTP à chaque rechargement de page. */
  hydrate: () => void;
}

function applyTokens(data: TokenPairResponse): AdminProfile | null {
  setTokens(data.accessToken, data.refreshToken);
  const claims = decodeAccessToken(data.accessToken);
  return claims ? { sub: claims.sub, email: claims.email, role: claims.role } : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  stage: 'signin',
  email: '',
  password: '',
  code: '',
  error: null,
  loading: false,
  tempToken: null,
  totpSetup: null,
  admin: null,

  setEmail: (v) => set({ email: v, error: null }),
  setPassword: (v) => set({ password: v, error: null }),
  setCode: (v) => set({ code: v.replace(/\D/g, '').slice(0, 6), error: null }),

  submitSignin: async () => {
    const { email, password } = get();
    if (!email.trim() || !password) {
      set({ error: 'Enter your work email and password.' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await apiPost<LoginSetupResponse | LoginChallengeResponse>('/auth/login', { email: email.trim(), password }, { skipAuth: true });
      if ('requiresTotpSetup' in data) {
        set({ stage: 'totp-setup', tempToken: data.tempToken, totpSetup: { otpauthUrl: data.otpauthUrl, qrDataUrl: data.qrDataUrl }, loading: false, code: '' });
      } else {
        set({ stage: 'totp-challenge', tempToken: data.tempToken, totpSetup: null, loading: false, code: '' });
      }
    } catch (err) {
      set({ loading: false, error: err instanceof ApiError ? err.message : 'Sign-in failed.' });
    }
  },

  submitTotp: async () => {
    const { code, tempToken } = get();
    if (!/^\d{6}$/.test(code)) {
      set({ error: 'Enter all six digits.' });
      return;
    }
    if (!tempToken) {
      set({ error: 'Session expired — sign in again.', stage: 'signin' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await apiPost<TokenPairResponse>('/auth/verify-totp', { tempToken, code }, { skipAuth: true });
      const admin = applyTokens(data);
      set({ stage: 'in', loading: false, password: '', code: '', tempToken: null, totpSetup: null, admin });
    } catch (err) {
      set({ loading: false, error: err instanceof ApiError ? err.message : 'Verification failed.' });
    }
  },

  backToSignin: () => set({ stage: 'signin', code: '', tempToken: null, totpSetup: null, error: null }),

  lockSession: () => set({ stage: 'locked', password: '', error: null }),

  // Pas d'endpoint backend pour "déverrouiller" (aucune re-vérification de mot de passe
  // n'est exposée hors du flux login+TOTP complet) — le verrouillage reste une protection
  // d'écran CÔTÉ CLIENT contre une consultation non autorisée sur un poste laissé ouvert ;
  // la vraie frontière de sécurité reste l'access token, déjà vérifié à chaque requête
  // serveur. Documenté comme tel, pas une omission.
  unlockSession: () => {
    const { password } = get();
    if (password.length < 8) {
      set({ error: 'Enter your password to resume.' });
      return;
    }
    set({ stage: 'in', password: '', error: null });
  },

  signOut: () => {
    clearTokens();
    set({ stage: 'signin', email: '', password: '', code: '', tempToken: null, totpSetup: null, admin: null, error: null });
  },

  hydrate: () => {
    const access = getAccessToken();
    if (!access) return;
    const claims = decodeAccessToken(access);
    if (!claims || isExpired(claims)) {
      // Un refresh token peut encore être valide (TTL 8h > l'access token 30min) — laisse
      // le premier appel API échoué déclencher le refresh via `api.ts`, plutôt que de
      // décider ici sans jamais avoir vérifié le refresh token lui-même.
      if (!getRefreshToken()) {
        clearTokens();
        return;
      }
    }
    if (claims) set({ stage: 'in', admin: { sub: claims.sub, email: claims.email, role: claims.role } });
  },
}));

// `api.ts` déclenche ceci quand un refresh échoue en cours de session (token révoqué,
// admin désactivé, etc.) — un event DOM plutôt qu'un import direct pour ne jamais créer de
// cycle store↔client-API (voir la docstring de `tokenStore.ts`).
window.addEventListener('auth:logout', () => {
  useAuthStore.getState().signOut();
});
