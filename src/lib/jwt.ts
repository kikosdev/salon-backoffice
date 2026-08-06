/** Décodage LOCAL, jamais une vérification — la signature est vérifiée côté serveur à
 *  chaque requête (`AdminJwtGuard`). Sert uniquement à afficher email/role dans l'UI sans
 *  attendre un aller-retour réseau (le CP n'a pas de `GET /auth/me`). */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: 'superadmin' | 'support' | 'billing';
  type: 'access';
  iat: number;
  exp: number;
}

export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: { exp: number }): boolean {
  return claims.exp * 1000 <= Date.now();
}
