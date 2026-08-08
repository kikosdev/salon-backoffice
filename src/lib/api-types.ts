/** Formes EXACTES des réponses `salonos-admin` — vérifiées dans son code source
 *  (`src/metrics/metrics.service.ts`, `src/audit/schemas/admin-audit-log.schema.ts`),
 *  pas devinées. Étendu au fur et à mesure du câblage écran par écran (Prompt 8). */

export interface MetricsOverview {
  mrr: number;
  arr: number;
  activeCount: number;
  trialCount: number;
  pastDueCount: number;
  churnedThisMonth: number;
  churnRatePct: number;
  trialToPaidRatePct: number;
  arpa: number;
  byPlan: Record<string, number>;
  byCountry: Record<string, number>;
  byDeployment: Record<string, number>;
}

export interface MrrHistoryPoint {
  period: string; // 'YYYY-MM'
  mrr: number;
}

export interface AtRiskEntry {
  tenantMongoId: string;
  tenantId: string;
  name: string;
  slug: string;
  lastAppointmentCreatedAt: string | null;
  daysSinceLastAppointment: number | null;
}

export interface UpsellTrigger {
  dimension: 'staffMax' | 'locationsMax';
  usage: number;
  limit: number;
  usagePct: number;
}

export interface UpsellEntry {
  tenantMongoId: string;
  tenantId: string;
  name: string;
  slug: string;
  planId: string;
  triggers: UpsellTrigger[];
}

export interface AuditLogEntry {
  _id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  tenantId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip: string;
  userAgent: string;
  at: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

// ─── Tenants (src/tenants/schemas/tenant.schema.ts, subscription.schema.ts) ────────────

export type TenantStatusApi = 'provisioning' | 'trial' | 'active' | 'past_due' | 'suspended' | 'churned';

export interface TenantOwnerApi {
  name: string;
  email: string;
  phone: string;
}

/**
 * [P5 owner multi-salon] Résultat du lookup owner (`GET /owners/lookup`, passe-plat CP vers
 * le Data Plane). TROIS issues, à ne jamais confondre côté UI :
 *   - `exists: false`                       → aucun compte      → création classique
 *   - `exists: true`, `ownerships` VIDE     → compte non-owner  → proposition de PROMOTION
 *   - `exists: true`, `ownerships` remplis  → owner ailleurs    → proposition de RATTACHEMENT
 */
export interface OwnerOwnershipApi {
  tenantId: string;
  salonName: string;
  locationLabel?: string;
}
export interface OwnerLookupApi {
  exists: boolean;
  userId?: string;
  ownerships?: OwnerOwnershipApi[];
}

export interface TenantRecord {
  _id: string;
  tenantId: string;
  slug: string;
  name: string;
  /** [P4] Libellé d'emplacement, purement d'affichage — distingue deux salons homonymes. */
  locationLabel?: string;
  /** [P5] `users._id` côté Data Plane, renseigné par le DP au provisioning. */
  ownerUserId?: string;
  attachToExistingOwner?: boolean;
  status: TenantStatusApi;
  deployment: 'saas' | 'dedicated';
  dataPlaneUrl?: string;
  country: string;
  timezone: string;
  currency: string;
  planId?: string;
  trialEndsAt?: string;
  owner: TenantOwnerApi;
  region?: string;
  customDomain?: string;
  notes?: string;
  provisionError?: string;
  suspendedAt?: string;
  churnedAt?: string;
  purgeAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  _id: string;
  tenantId: string;
  planId?: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider: 'manual' | 'paymee' | 'konnect' | 'stripe';
  providerRef?: string;
  canceledAt?: string;
  dunningStage?: 'past_due' | 'reminder_j3' | 'reminder_j7' | 'suspended' | 'churned';
}

export interface TenantDetailResponse {
  tenant: TenantRecord;
  subscription: SubscriptionRecord | null;
}

// ─── Plans (src/plans/schemas/plan.schema.ts) ──────────────────────────────────────────

export interface PlanFeaturesApi {
  pos: boolean;
  ecommerce: boolean;
  mobileApp: boolean;
  analytics: boolean;
  customDomain: boolean;
  api: boolean;
}

export interface PlanLimitsApi {
  staffMax: number;
  locationsMax: number;
  smsQuota: number;
  appointmentsMonth: number;
}

export interface PlanRecord {
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: PlanFeaturesApi;
  limits: PlanLimitsApi;
  visible: boolean;
  sortOrder: number;
}

// ─── Billing / invoices (src/billing/schemas/invoice.schema.ts) ───────────────────────

export interface InvoiceLineApi {
  description: string;
  amount: number;
}

export interface InvoiceRecord {
  _id: string;
  number: number;
  tenantId: string;
  lines: InvoiceLineApi[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  paymentMethod?: 'transfer' | 'cash' | 'card';
  paymentReference?: string;
}

// ─── Feature flags (src/flags/schemas/feature-flag.schema.ts) ─────────────────────────

export interface FlagOverrideApi {
  tenantId: string;
  on: boolean;
}

export interface FeatureFlagRecord {
  _id: string;
  key: string;
  description: string;
  defaultOn: boolean;
  overrides: FlagOverrideApi[];
  rolloutPercent?: number;
}

// ─── Impersonation (src/impersonation/schemas/impersonation-session.schema.ts) ────────

export interface ImpersonationSessionRecord {
  _id: string;
  adminId: string;
  adminEmail: string;
  tenantId: string;
  targetUserId?: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt?: string;
}

export interface StartImpersonationResult {
  sessionId: string;
  token: string;
  expiresInMinutes: number;
  redirectUrl: string;
}

// ─── Usage snapshots (src/metrics/schemas/usage-snapshot.schema.ts) ───────────────────

export interface UsageSnapshotRecord {
  tenantId: string;
  period: string;
  staffCount: number;
  locationCount: number;
  appointmentsMonth: number;
  smsMonth: number;
  storageMb: number;
  lastAppointmentCreatedAt: string | null;
  collectedAt: string;
}

// ─── Health (src/app.controller.ts) ────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'degraded';
  mongo: boolean;
  dpReachable: boolean;
}
