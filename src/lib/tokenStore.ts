/** Séparé de `useAuthStore`/`api.ts` délibérément — les deux en dépendent, aucun import
 *  circulaire possible ainsi (le store lit/écrit ici, le client API aussi, sans jamais
 *  s'importer l'un l'autre). */
const ACCESS_KEY = 'so_access_token';
const REFRESH_KEY = 'so_refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
