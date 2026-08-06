export type TenantStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'churned' | 'provisioning';
export type PlanName = 'founder' | 'starter' | 'pro' | 'chain' | 'dedicated';
export type Deployment = 'saas' | 'dedicated';
/** [Prompt 8] Les 3 SEULS rôles réels (`AdminRole`, `salonos-admin/src/common/guards/admin-auth.types.ts`)
 *  — le mock avait un 4e rôle ("supervisor") sans équivalent côté backend, retiré en
 *  branchant l'auth réelle : un JWT ne peut structurellement jamais porter cette valeur. */
export type OperatorRole = 'superadmin' | 'support' | 'billing';

export interface PlanDef {
  name: PlanName;
  price: number;
  staff: number;
  locs: number;
  sms: number;
  storage: number;
  appts: number;
  f: {
    pos: 0 | 1;
    ecommerce: 0 | 1;
    mobileApp: 0 | 1;
    analytics: 0 | 1;
    customDomain: 0 | 1;
    api: 0 | 1;
  };
}

export interface Tenant {
  name: string;
  slug: string;
  status: TenantStatus;
  plan: PlanName;
  dep: Deployment;
  silent: number;
  created: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  staff: number;
  locs: number;
  appts: number;
  sms: number;
  storage: number;
  limits: PlanDef;
  cur: string;
  mrrN: number;
  id: string;
  lastAppt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'invited' | 'disabled';
  added: string;
  lastSeen: string;
  appts: number;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: OperatorRole;
  status: 'active' | 'invited' | 'disabled';
  added: string;
  lastSeen: string;
  actions: number;
  mfa: boolean;
}

export type AuditEntry = [
  ts: string,
  admin: string,
  adminRole: string,
  action: string,
  slug: string,
  detail: string,
  before: [string, string][],
  after: [string, string][],
];

export interface Invoice {
  no: string;
  slug: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  issued: string;
  due: string;
  provider: 'Konnect' | 'Flouci' | 'Stripe' | 'Manual';
}
