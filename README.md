# salon-backoffice — SalonOS Control Plane (Frontend)

The internal admin console the **SaaS operator** uses to run the whole multi-tenant Coiffio/SalonOS platform: provisioning tenants, managing plans/billing, impersonating tenants for support, reviewing audit logs, and monitoring platform health. This is not customer-facing and is a separate product from the per-salon app (`salon-frontend`/`salon-backend`).

Backend: [`salonos-admin`](../salonos-admin) (NestJS Control Plane API) is the API this app talks to.

## Tech stack

- **Framework**: [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/) + TypeScript 5
- **Routing**: React Router 6
- **State management**: Zustand 4 — three stores: `useAuthStore` (login/2FA/session), `useUiStore` (theme/density/role/toast/impersonation banner state), `useDataStore` (client-side session data)
- **Styling**: plain CSS, no Tailwind/CSS-in-JS library — `src/styles/global.css` defines a CSS-variable design-token system (dark/light via `:root[data-theme]`, compact/comfortable density via `:root[data-density]`), paired with inline `CSSProperties` style-builder helpers (`src/lib/style.ts`: `badge`, `chip`, `btnPrimary`, `btnDanger`, `money`, etc.)
- **Auth**: JWT access/refresh tokens issued by `salonos-admin`, decoded client-side (`src/lib/jwt.ts`) to drive role-gated UI; automatic silent refresh on 401 (`src/lib/api.ts`)
- **Lint**: ESLint

## Architecture

- `src/lib/api.ts` — typed fetch wrapper against `salonos-admin`'s REST API (`VITE_API_URL`). Unwraps the API's `{data, message, statusCode}` response envelope, handles 401 → silent token refresh → retry, and surfaces failures as a typed `ApiError`.
- `src/lib/tokenStore.ts` — access/refresh token persistence (`localStorage`), so a page refresh doesn't force a re-login.
- `src/lib/api-types.ts` / `src/lib/types.ts` — request/response and domain types shared across pages.
- `src/store/` — Zustand stores, described above.
- `src/pages/` — one file per top-level screen (see Routes below); `TenantDetail/` is split into tab files (Overview, Subscription, Staff, Usage, Audit, Danger) since it's the most complex screen.
- `src/components/layout/` — `AppShell`, `Sidebar`, `Header`, `ImpersonationBanner` (persistent red banner shown while impersonating a tenant).
- `src/components/modals/` — e.g. `ImpersonateModal` (reason capture before starting a support impersonation session).

**Role-based UI gating** is done inline per-page (reading the authenticated admin's role from the decoded JWT via `useUiStore`), not via route guards — different roles (`superadmin`/`support`/`billing`) see different actions on the same screens (e.g. the `billing` role never sees "Log in as", `support` never sees "Mark paid").

## Routes

| Path | Screen |
|---|---|
| `/dashboard` | Platform overview |
| `/tenants`, `/tenants/:slug` | Tenant list + detail (Overview/Subscription/Staff/Usage/Audit/Danger tabs) |
| `/provision` | New tenant provisioning |
| `/plans` | Plan catalog management |
| `/billing` | Invoices, manual payment marking, dunning status |
| `/team` | Operator (admin user) management |
| `/impersonation` | Impersonation session history + alerts |
| `/audit` | Platform audit log |
| `/health` | Platform/Data-Plane health |
| `/profile` | Signed-in admin's own profile |

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_URL to the salonos-admin API (default http://localhost:4000)
npm run dev             # http://localhost:5174
```

### Scripts

```bash
npm run dev         # vite dev server
npm run build         # tsc --noEmit && vite build
npm run preview       # preview a production build
npm run typecheck      # tsc --noEmit -p tsconfig.json
npm run lint            # eslint .
```

### Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the `salonos-admin` API (no `/api` prefix, unlike `salon-backend`) |

## Notes

This app talks to the real `salonos-admin` API end-to-end (auth, tenants, plans, billing, impersonation, audit, metrics) — it started as a static mock-data prototype, and `src/lib/mockData.ts` still supplies a few static UI constants (e.g. operator role labels, audit-log filter options) but no longer holds business data.
