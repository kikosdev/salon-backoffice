import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> {
  data: T;
  message: string;
  statusCode: number;
}

/** `salonos-admin` enveloppe TOUJOURS `{data,message,statusCode}` (`ResponseInterceptor`,
 *  sauf les rares routes `@SkipEnvelope()`, aucune consommée depuis ce frontend). */
function unwrap<T>(body: unknown): T {
  return (body as Envelope<T>).data;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as Envelope<{ accessToken: string; expiresIn: number }>;
    setTokens(body.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

/** Un event DOM plutôt qu'un import direct de `useAuthStore` — évite tout cycle
 *  store↔client-API. `useAuthStore` s'y abonne une fois au montage de l'app. */
function forceLogout(): void {
  clearTokens();
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

interface FetchOpts {
  /** Routes pré-auth (`/auth/login`, `/auth/verify-totp`) — pas de token à injecter, et un
   *  401 ici veut juste dire "mauvais identifiants", jamais une session expirée à nettoyer. */
  skipAuth?: boolean;
  /** Usage interne — marque un appel déjà rejoué une fois après refresh, pour ne jamais boucler. */
  retried?: boolean;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, opts: FetchOpts = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token && !opts.skipAuth) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Network error — the Control Plane API is unreachable.');
  }

  if (res.status === 401 && !opts.skipAuth && !opts.retried) {
    refreshPromise ??= tryRefresh().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) return apiFetch<T>(path, init, { ...opts, retried: true });
    forceLogout();
    throw new ApiError(401, 'Session expired — please sign in again.');
  }

  let body: Envelope<T> | null = null;
  try {
    body = await res.json();
  } catch {
    /* empty body — some error responses have none */
  }

  if (!res.ok) {
    if (res.status === 401 && !opts.skipAuth) forceLogout();
    const message = body?.message ?? `Request failed (${res.status}).`;
    throw new ApiError(res.status, message, body?.data);
  }

  return unwrap<T>(body);
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}
export function apiPost<T>(path: string, body?: unknown, opts?: FetchOpts): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }, opts);
}
export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
}
export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
