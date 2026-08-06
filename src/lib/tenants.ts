import { apiGet } from './api';
import type { Paginated, TenantDetailResponse, TenantRecord } from './api-types';

/**
 * L'URL de la page (`/tenants/:slug`) utilise le slug, plus lisible — mais toutes les
 * routes CP (`GET /tenants/:id`, `/suspend`, etc.) attendent le `_id` Mongo, jamais le
 * slug. Pas de lookup dédié côté CP : on réutilise `search` (regex nom/slug) puis on
 * filtre le match EXACT côté client — best-effort, mais la seule option sans ajouter de
 * route côté backend pour ça seul.
 */
export async function resolveTenantBySlug(slug: string): Promise<TenantRecord | null> {
  const res = await apiGet<Paginated<TenantRecord>>(`/tenants?search=${encodeURIComponent(slug)}&limit=10`);
  return res.items.find((t) => t.slug === slug) ?? null;
}

export async function fetchTenantDetail(id: string): Promise<TenantDetailResponse> {
  return apiGet<TenantDetailResponse>(`/tenants/${id}`);
}
