import { create } from 'zustand';
import { FEATURE_FLAGS_DEF, OPERATORS, seedStaff } from '@/lib/mockData';
import type { Operator, StaffMember, Tenant } from '@/lib/types';

interface Profile {
  name: string;
  email: string;
  phone: string;
  title: string;
  tz: string;
  lang: string;
}

interface DataState {
  staffMap: Record<string, StaffMember[]>;
  operators: Operator[];
  flagsOn: Record<string, boolean>;
  notif: Record<string, boolean>;
  profile: Profile;
  staffFor: (t: Tenant) => StaffMember[];
  writeStaff: (slug: string, list: StaffMember[]) => void;
  writeOperators: (list: Operator[]) => void;
  toggleFlag: (key: string) => void;
  toggleNotif: (key: string) => void;
  saveProfile: (p: Profile) => void;
}

const initialFlags: Record<string, boolean> = { pos_v2: true, ecommerce: false, mobile_app: true, ai_rebooking: false, whatsapp_reminders: true };
void FEATURE_FLAGS_DEF;

export const useDataStore = create<DataState>((set, get) => ({
  staffMap: {},
  operators: OPERATORS,
  flagsOn: initialFlags,
  notif: { dunning: true, provisionFail: true, churn: true, weekly: false, impersonation: true },
  profile: {
    name: 'Karim Ben Salah',
    email: 'karim@salonos.tn',
    phone: '+216 22 118 470',
    title: 'Head of Platform Operations',
    tz: 'Africa/Tunis',
    lang: 'fr',
  },
  staffFor: (t) => {
    const existing = get().staffMap[t.slug];
    if (existing) return existing;
    return seedStaff(t);
  },
  writeStaff: (slug, list) => set((s) => ({ staffMap: { ...s.staffMap, [slug]: list } })),
  writeOperators: (list) => set({ operators: list }),
  toggleFlag: (key) => set((s) => ({ flagsOn: { ...s.flagsOn, [key]: !s.flagsOn[key] } })),
  toggleNotif: (key) => set((s) => ({ notif: { ...s.notif, [key]: !s.notif[key] } })),
  saveProfile: (p) => set({ profile: p }),
}));
