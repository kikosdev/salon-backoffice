import type { AuditEntry, Invoice, Operator, PlanDef, PlanName, StaffMember, Tenant } from './types';

export const PLANS: Record<PlanName, PlanDef> = {
  founder: { name: 'founder', price: 39, staff: 3, locs: 1, sms: 200, storage: 512, appts: 300, f: { pos: 1, ecommerce: 0, mobileApp: 0, analytics: 0, customDomain: 0, api: 0 } },
  starter: { name: 'starter', price: 89, staff: 5, locs: 1, sms: 500, storage: 2048, appts: 800, f: { pos: 1, ecommerce: 0, mobileApp: 0, analytics: 1, customDomain: 0, api: 0 } },
  pro: { name: 'pro', price: 189, staff: 10, locs: 3, sms: 2000, storage: 10240, appts: 4000, f: { pos: 1, ecommerce: 1, mobileApp: 1, analytics: 1, customDomain: 0, api: 0 } },
  chain: { name: 'chain', price: 549, staff: 40, locs: 10, sms: 8000, storage: 51200, appts: 20000, f: { pos: 1, ecommerce: 1, mobileApp: 1, analytics: 1, customDomain: 1, api: 0 } },
  dedicated: { name: 'dedicated', price: 899, staff: 0, locs: 0, sms: 25000, storage: 204800, appts: 0, f: { pos: 1, ecommerce: 1, mobileApp: 1, analytics: 1, customDomain: 1, api: 1 } },
};

type RawTenant = [
  name: string, slug: string, status: Tenant['status'], plan: PlanName, dep: Tenant['dep'], silent: number,
  created: string, owner: string, email: string, phone: string, city: string,
  staff: number, locs: number, appts: number, sms: number, storage: number,
];

const RAW_TENANTS: RawTenant[] = [
  ['Salon Yasmine', 'salon-yasmine', 'active', 'pro', 'saas', 0, '2025-02-11', 'Yasmine Trabelsi', 'yasmine@salonyasmine.tn', '+216 22 431 908', 'Tunis', 9, 2, 612, 1740, 4820],
  ['Coiffure Nour', 'coiffure-nour', 'active', 'starter', 'saas', 1, '2025-04-02', 'Nour Gharbi', 'nour@coiffurenour.tn', '+216 25 118 240', 'La Marsa', 5, 1, 690, 470, 1180],
  ['Beauté Carthage', 'beaute-carthage', 'past_due', 'pro', 'saas', 3, '2024-11-19', 'Salim Ayari', 'salim@beautecarthage.tn', '+216 98 774 512', 'Carthage', 7, 1, 402, 980, 3300],
  ["L'Atelier Sousse", 'atelier-sousse', 'trial', 'starter', 'saas', 2, '2026-07-19', 'Mehdi Kacem', 'mehdi@ateliersousse.tn', '+216 55 902 117', 'Sousse', 3, 1, 41, 60, 210],
  ['Maison Zephyr', 'maison-zephyr', 'active', 'chain', 'saas', 0, '2024-06-08', 'Leïla Mansour', 'leila@maisonzephyr.tn', '+216 21 660 043', 'Tunis', 34, 8, 4180, 6900, 38400],
  ['Barber Bab', 'barber-bab', 'suspended', 'starter', 'saas', 21, '2025-01-27', 'Anis Jlassi', 'anis@barberbab.tn', '+216 27 335 776', 'Bab Bhar', 4, 1, 0, 12, 640],
  ['Hammam Aziza', 'hammam-aziza', 'active', 'pro', 'saas', 9, '2025-03-14', 'Aziza Ben Amor', 'aziza@hammamaziza.tn', '+216 23 447 019', 'Nabeul', 6, 1, 288, 810, 2900],
  ['Nails by Rim', 'nails-by-rim', 'trial', 'founder', 'saas', 5, '2026-07-14', 'Rim Chebbi', 'rim@nailsbyrim.tn', '+216 29 771 402', 'Ariana', 2, 1, 33, 40, 96],
  ['Studio Medina', 'studio-medina', 'churned', 'starter', 'saas', 64, '2024-09-03', 'Hatem Zouari', 'hatem@studiomedina.tn', '+216 26 900 188', 'Tunis', 3, 1, 0, 0, 1420],
  ['Élégance Lac', 'elegance-lac', 'active', 'chain', 'dedicated', 0, '2024-03-21', 'Sonia Belhaj', 'sonia@elegancelac.tn', '+216 20 554 316', 'Les Berges du Lac', 38, 9, 5240, 7400, 46200],
  ['Coiffure Sfax Centre', 'coiffure-sfax-centre', 'active', 'starter', 'saas', 12, '2025-05-30', 'Karim Dridi', 'karim@coiffuresfax.tn', '+216 24 810 655', 'Sfax', 4, 1, 190, 330, 900],
  ['Spa Gammarth', 'spa-gammarth', 'provisioning', 'pro', 'saas', 0, '2026-07-27', 'Ines Bouzid', 'ines@spagammarth.tn', '+216 22 004 771', 'Gammarth', 0, 0, 0, 0, 0],
  ['Salon Amira', 'salon-amira', 'past_due', 'starter', 'saas', 4, '2025-08-16', 'Amira Sassi', 'amira@salonamira.tn', '+216 28 617 220', 'Monastir', 4, 1, 355, 410, 1050],
  ['Nouvelle Vague', 'nouvelle-vague', 'active', 'pro', 'saas', 2, '2025-06-11', 'Fares Louati', 'fares@nouvellevague.tn', '+216 21 339 887', 'Hammamet', 8, 2, 3810, 1520, 5100],
  ['Beauty Bizerte', 'beauty-bizerte', 'trial', 'starter', 'saas', 1, '2026-07-23', 'Maha Riahi', 'maha@beautybizerte.tn', '+216 55 246 903', 'Bizerte', 3, 1, 26, 30, 140],
  ['Chic Monastir', 'chic-monastir', 'active', 'founder', 'saas', 8, '2025-10-04', 'Wassim Hamdi', 'wassim@chicmonastir.tn', '+216 27 112 508', 'Monastir', 3, 1, 148, 160, 380],
  ['Ô Naturel Ariana', 'o-naturel-ariana', 'active', 'pro', 'dedicated', 0, '2024-12-12', 'Dorra Kallel', 'dorra@onaturel.tn', '+216 23 880 145', 'Ariana', 9, 3, 1980, 1900, 8800],
  ['Coiffure Kairouan', 'coiffure-kairouan', 'active', 'starter', 'saas', 16, '2025-07-22', 'Bilel Ncib', 'bilel@coiffurekairouan.tn', '+216 26 471 330', 'Kairouan', 4, 1, 120, 210, 760],
];

export const TENANTS: Tenant[] = RAW_TENANTS.map((r, i) => {
  const [name, slug, status, plan, dep, silent, created, owner, email, phone, city, staff, locs, appts, sms, storage] = r;
  const limits = PLANS[plan];
  const active = status === 'active' || status === 'past_due';
  return {
    name, slug, status, plan, dep, silent, created, owner, email, phone, city,
    staff, locs, appts, sms, storage, limits, cur: 'TND',
    mrrN: active ? limits.price : 0,
    id: 'tnt_' + (1000 + i * 137).toString(16) + 'f',
    lastAppt: silent === 0 ? 'today' : '2026-' + (silent > 30 ? '05' : '07') + '-' + String(Math.max(1, 27 - silent)).padStart(2, '0'),
  };
});

export const TENANTS_BY_SLUG: Record<string, Tenant> = TENANTS.reduce((a, t) => {
  a[t.slug] = t;
  return a;
}, {} as Record<string, Tenant>);

export const AUDIT: AuditEntry[] = [
  ['2026-07-27 09:41:02', 'Karim Ben Salah', 'superadmin', 'tenant.plan_changed', 'nouvelle-vague', 'starter → pro', [['plan', 'starter'], ['mrr', '89.000 TND'], ['staffMax', '5']], [['plan', 'pro'], ['mrr', '189.000 TND'], ['staffMax', '10']]],
  ['2026-07-27 09:12:55', 'Sarra Hidri', 'billing', 'invoice.marked_paid', 'beaute-carthage', 'transfer · BIAT-88213', [['status', 'overdue'], ['paidAt', 'null'], ['method', 'null']], [['status', 'paid'], ['paidAt', '2026-07-27'], ['method', 'transfer']]],
  ['2026-07-27 08:58:10', 'Amine Rekik', 'support', 'impersonation.started', 'hammam-aziza', 'reason: booking widget bug #4821', [['session', 'none']], [['session', 'imp_9f21ac'], ['expiresIn', '30m']]],
  ['2026-07-26 18:22:31', 'Karim Ben Salah', 'superadmin', 'tenant.suspended', 'barber-bab', 'non-payment after J+45', [['status', 'past_due'], ['loginEnabled', 'true']], [['status', 'suspended'], ['loginEnabled', 'false']]],
  ['2026-07-26 16:04:07', 'Sarra Hidri', 'billing', 'invoice.created', 'maison-zephyr', 'INV-2026-0418 · 549.000 TND', [['invoice', 'none']], [['invoice', 'INV-2026-0418'], ['status', 'sent']]],
  ['2026-07-26 11:47:19', 'Karim Ben Salah', 'superadmin', 'flag.override_set', 'elegance-lac', 'ecommerce = true', [['ecommerce', 'false (plan)']], [['ecommerce', 'true (override)'], ['expires', '2026-09-30']]],
  ['2026-07-25 15:30:44', 'Amine Rekik', 'support', 'tenant.note_added', 'salon-amira', 'owner asked to delay July invoice', [['notes', '2']], [['notes', '3']]],
  ['2026-07-25 10:02:12', 'system', 'system', 'tenant.provisioned', 'beauty-bizerte', 'trial · 14 days', [['tenant', 'none']], [['status', 'trial'], ['trialEndsAt', '2026-08-06']]],
  ['2026-07-24 17:55:03', 'Karim Ben Salah', 'superadmin', 'tenant.churned', 'studio-medina', 'requested by owner', [['status', 'suspended'], ['mrr', '89.000 TND']], [['status', 'churned'], ['mrr', '0.000 TND']]],
  ['2026-07-24 09:18:36', 'Sarra Hidri', 'billing', 'provider.changed', 'o-naturel-ariana', 'Konnect → Stripe', [['provider', 'konnect']], [['provider', 'stripe']]],
];

const RAW_INVOICES: [string, string, number, Invoice['status'], string, string, Invoice['provider']][] = [
  ['INV-2026-0431', 'beaute-carthage', 189, 'overdue', '2026-06-28', '2026-07-05', 'Konnect'],
  ['INV-2026-0430', 'salon-amira', 89, 'overdue', '2026-07-01', '2026-07-08', 'Manual'],
  ['INV-2026-0429', 'barber-bab', 89, 'overdue', '2026-05-30', '2026-06-06', 'Manual'],
  ['INV-2026-0428', 'maison-zephyr', 549, 'paid', '2026-07-01', '2026-07-08', 'Konnect'],
  ['INV-2026-0427', 'elegance-lac', 899, 'paid', '2026-07-01', '2026-07-08', 'Stripe'],
  ['INV-2026-0426', 'salon-yasmine', 189, 'paid', '2026-07-01', '2026-07-08', 'Konnect'],
  ['INV-2026-0425', 'nouvelle-vague', 189, 'sent', '2026-07-20', '2026-07-31', 'Flouci'],
  ['INV-2026-0424', 'o-naturel-ariana', 249, 'sent', '2026-07-20', '2026-07-31', 'Stripe'],
  ['INV-2026-0423', 'coiffure-kairouan', 89, 'draft', '—', '2026-08-05', 'Manual'],
  ['INV-2026-0422', 'studio-medina', 89, 'void', '2026-06-01', '2026-06-08', 'Manual'],
];
export const INVOICES: Invoice[] = RAW_INVOICES.map(([no, slug, amount, status, issued, due, provider]) => ({
  no, slug, amount, status, issued, due, provider,
}));

export function seedStaff(t: Tenant): StaffMember[] {
  const first = ['Nour', 'Yasmine', 'Salim', 'Rania', 'Mehdi', 'Ines', 'Hatem', 'Dorra', 'Bilel', 'Maha', 'Wassim', 'Sonia', 'Fares', 'Amira'];
  const last = ['Gharbi', 'Trabelsi', 'Ayari', 'Belhaj', 'Kacem', 'Bouzid', 'Zouari', 'Kallel', 'Ncib', 'Riahi'];
  const roles = ['manager', 'stylist', 'stylist', 'receptionist', 'stylist', 'colorist', 'barber', 'apprentice'];
  const out: StaffMember[] = [
    {
      id: 'stf_' + t.slug.slice(0, 4) + '01',
      name: t.owner,
      email: t.email,
      phone: t.phone,
      role: 'owner',
      status: 'active',
      added: t.created,
      lastSeen: t.silent === 0 ? 'today' : t.silent + 'd ago',
      appts: Math.round(t.appts * 0.34),
    },
  ];
  for (let i = 1; i < Math.max(1, t.staff); i++) {
    const nm = first[(i * 5 + t.slug.length) % first.length] + ' ' + last[(i * 3 + t.slug.length) % last.length];
    const role = roles[(i - 1) % roles.length];
    out.push({
      id: 'stf_' + t.slug.slice(0, 4) + String(i + 1).padStart(2, '0'),
      name: nm,
      email: nm.toLowerCase().replace(/[^a-z]+/g, '.') + '@' + t.slug + '.tn',
      phone: '+216 ' + (20 + (i * 7) % 9) + ' ' + String(100 + i * 37).slice(0, 3) + ' ' + String(200 + i * 53).slice(0, 3),
      role,
      status: i === Math.max(1, t.staff) - 1 && t.staff > 3 ? 'invited' : 'active',
      added: '2025-' + String(1 + (i * 2) % 11).padStart(2, '0') + '-' + String(3 + (i * 4) % 24).padStart(2, '0'),
      lastSeen: i % 4 === 0 ? (3 + i) + 'd ago' : i % 3 === 0 ? 'yesterday' : 'today',
      appts: Math.round(t.appts * (0.2 - i * 0.015)),
    });
  }
  return out;
}

export const STAFF_ROLE_OPTIONS = ['owner', 'manager', 'stylist', 'colorist', 'barber', 'receptionist', 'apprentice'];

export const OPERATOR_ROLE_META: Record<string, { label: string; desc: string; color: string }> = {
  superadmin: { label: 'superadmin', desc: 'Full control, including suspend, churn and plan changes.', color: 'trial' },
  support: { label: 'support', desc: 'Impersonate, manage tenant staff, read billing.', color: 'active' },
  billing: { label: 'billing', desc: 'Invoices, dunning and reconciliation only.', color: 'past_due' },
};

const RAW_OPERATORS: [string, string, string, Operator['role'], Operator['status'], string, string, number, number][] = [
  ['op_01', 'Karim Ben Salah', 'karim@salonos.tn', 'superadmin', 'active', '2024-02-01', 'now', 412, 1],
  ['op_02', 'Leïla Mrad', 'leila.mrad@salonos.tn', 'support', 'active', '2024-08-14', '18 min ago', 268, 1],
  ['op_03', 'Sarra Hidri', 'sarra@salonos.tn', 'billing', 'active', '2025-01-09', '2 h ago', 331, 1],
  ['op_04', 'Amine Rekik', 'amine@salonos.tn', 'support', 'active', '2025-03-22', '41 min ago', 507, 1],
  ['op_05', 'Nadia Ferchichi', 'nadia@salonos.tn', 'support', 'active', '2025-11-05', 'yesterday', 96, 0],
  ['op_06', 'Youssef Haddad', 'youssef@salonos.tn', 'support', 'invited', '2026-07-24', 'never', 0, 0],
  ['op_07', 'Olfa Baccouche', 'olfa@salonos.tn', 'billing', 'disabled', '2024-05-30', '62d ago', 188, 0],
];
export const OPERATORS: Operator[] = RAW_OPERATORS.map(([id, name, email, role, status, added, lastSeen, actions, mfa]) => ({
  id, name, email, role, status, added, lastSeen, actions, mfa: !!mfa,
}));

export const UPSELL_RAW: [string, string, number, number, PlanName, PlanName, number][] = [
  ['salon-yasmine', 'staff seats', 9, 10, 'pro', 'chain', 360],
  ['coiffure-nour', 'staff seats', 5, 5, 'starter', 'pro', 100],
  ['maison-zephyr', 'locations', 9, 10, 'chain', 'dedicated', 350],
  ['nouvelle-vague', 'appointments / month', 3810, 4000, 'pro', 'chain', 360],
  ['o-naturel-ariana', 'locations', 3, 3, 'pro', 'chain', 300],
];

export const MRR_SERIES = [1180, 1240, 1310, 1290, 1420, 1510, 1580, 1640, 1720, 1810, 1930, 2081];
export const MRR_MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

export const HEALTH_SERVICES: [string, 'healthy' | 'degraded', string, string][] = [
  ['mongo · primary', 'healthy', '1.9 ms p50', '112 conn'],
  ['redis · queue', 'healthy', '0.4 ms p50', '2 jobs waiting'],
  ['data-plane · eu-central', 'degraded', '412 ms p95', '1 tenant impacted'],
  ['worker · sms', 'healthy', '0 dead letters', '1.4k sent today'],
];

export const HEALTH_ROWS: [string, number, number, number, number, string][] = [
  ['elegance-lac', 411, 0.2, 96, 0, 'now'],
  ['maison-zephyr', 388, 0.3, 104, 1, 'now'],
  ['salon-yasmine', 142, 0.1, 88, 0, 'now'],
  ['o-naturel-ariana', 121, 7.4, 412, 34, '2 min ago'],
  ['nouvelle-vague', 96, 0.4, 92, 0, '4 min ago'],
  ['hammam-aziza', 61, 0.2, 90, 0, '9 days ago'],
  ['beaute-carthage', 44, 1.9, 168, 2, '3 days ago'],
  ['coiffure-kairouan', 12, 0.0, 84, 0, '16 days ago'],
];

export const DUNNING_STAGES: [string, string, string, [string, string, number][]][] = [
  ['J+3', 'First reminder', 'automatic email · sent', [['salon-amira', 'INV-2026-0430', 89]]],
  ['J+7', 'Second reminder', 'email + SMS · sent', [['beaute-carthage', 'INV-2026-0431', 189]]],
  ['J+14', 'Call the owner', 'manual · assigned to you', [['barber-bab', 'INV-2026-0429', 89], ['coiffure-kairouan', 'INV-2026-0423', 89]]],
  ['J+45', 'Suspend', 'requires superadmin', [['studio-medina', 'INV-2026-0422', 89]]],
];

export const RECON_RAW: [string, Invoice['provider'], number, string, number, number, string][] = [
  ['pay_9f41c2', 'Konnect', 189, 'INV-2026-0431', 189, 0, 'matched'],
  ['pay_9f41b8', 'Manual', 89, 'INV-2026-0430', 89, 0, 'matched'],
  ['pay_9f4192', 'Flouci', 150, 'INV-2026-0425', 189, -39, 'short paid'],
  ['pay_9f4177', 'Stripe', 899, 'INV-2026-0427', 899, 0, 'matched'],
  ['pay_9f4160', 'Manual', 89, '—', 0, 89, 'unmatched'],
  ['pay_9f4152', 'Konnect', 549, 'INV-2026-0428', 549, 0, 'matched'],
];

export const IMPERSONATION_HISTORY: [string, string, string, string, string, string][] = [
  ['2026-07-27 08:58:10', 'Amine Rekik', 'hammam-aziza', 'aziza@hammamaziza.tn', '12m 04s', 'Booking widget rejects Saturday slots — ticket #4821'],
  ['2026-07-26 14:12:44', 'Amine Rekik', 'salon-amira', 'amira@salonamira.tn', '6m 51s', 'Owner cannot see July invoice in the billing tab'],
  ['2026-07-24 17:03:20', 'Karim Ben Salah', 'maison-zephyr', 'manager@maison-zephyr.tn', '28m 12s', 'Migrating 8 locations to the new staff-scheduling model'],
  ['2026-07-22 10:41:07', 'Amine Rekik', 'coiffure-nour', 'nour@coiffurenour.tn', '4m 18s', 'Reproducing duplicate SMS reminders reported by owner'],
  ['2026-07-20 09:29:55', 'Karim Ben Salah', 'elegance-lac', 'sonia@elegancelac.tn', '31m 00s', 'Session expired at cap — dedicated data-plane latency audit'],
  ['2026-07-18 16:55:31', 'Amine Rekik', 'chic-monastir', 'wassim@chicmonastir.tn', '9m 47s', 'Walking owner through POS end-of-day close'],
];

export const FEATURE_FLAGS_DEF: [string, string, string][] = [
  ['pos_v2', 'New point-of-sale checkout flow', '100% of pro+'],
  ['ecommerce', 'Product catalogue and online orders', 'plan-gated'],
  ['mobile_app', 'Client mobile app push booking', '100%'],
  ['ai_rebooking', 'Automatic rebooking suggestions', '12% canary'],
  ['whatsapp_reminders', 'WhatsApp reminders instead of SMS', 'TN only'],
];

export const FLAG_OVERRIDES: [string, string, string, string, string][] = [
  ['elegance-lac', 'ecommerce', 'true', 'Karim Ben Salah', '2026-09-30'],
  ['maison-zephyr', 'ai_rebooking', 'true', 'Karim Ben Salah', 'never'],
  ['salon-yasmine', 'pos_v2', 'false', 'Amine Rekik', '2026-08-15'],
  ['o-naturel-ariana', 'api', 'true', 'Karim Ben Salah', 'never'],
  ['nouvelle-vague', 'whatsapp_reminders', 'false', 'Amine Rekik', '2026-08-01'],
];
