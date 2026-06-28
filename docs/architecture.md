# MeowNet Architecture

> Last updated: 2026-06-28 · v0.5.0

## System Overview

```
Browser
  │
  ├── Next.js 16 App Router (Vercel Edge)
  │     ├── Server Components (RSC)   — DB queries, zero hydration cost
  │     ├── Client Components          — Interactive UI, realtime subscriptions
  │     ├── Server Actions ('use server') — Secure form mutations
  │     └── API Routes (/api/*)        — External proxy + GDPR
  │
  ├── Supabase (PostgreSQL + PostGIS)
  │     ├── Auth     — email/password + Google/GitHub OAuth + direct credentials
  │     ├── Database — cats, events, profiles, gamification, guilds (50 migrations)
  │     ├── Storage  — Cat photos (EXIF stripped before write)
  │     ├── Realtime — Live cat map, chat, guilds subscriptions
  │     └── system_settings — Dynamic key-value configuration store
  │
  ├── Python FastAPI (Docker → Railway/Render)
  │     └── /breed + /meow — HuggingFace AI inference
  │
  └── External APIs (server-side proxied — never from browser)
        ├── Open-Meteo   → /api/weather (single + batch)
        ├── Catfact.ninja → /api/catfact
        └── Nominatim    → reverse geocoding (display only, client-side)
```

---

## Architecture Decision Records

### ADR-001 — Modular Monolith (Next.js)
**Status:** Accepted · **Date:** 2026-06-25  
**Decision:** Keep all core features in a single Next.js application.  
**Rationale:** Lower operational complexity for a hackathon-born product. Server Components and Server Actions eliminate the need for a separate API layer for most operations. Clean module boundaries (`lib/`, `components/`) allow future extraction without business logic changes.  
**Trade-off:** Cannot scale individual domains independently — acceptable at current scale.

### ADR-002 — Python ML Microservice on Railway
**Status:** Accepted · **Date:** 2026-06-25  
**Decision:** Breed estimation runs as a separate FastAPI service, not inside Next.js.  
**Rationale:** HuggingFace model inference requires Python+PyTorch runtime incompatible with Node.js. Deploying to Railway via Docker allows independent scaling. The ML service is optional — core app functions without it.  
**Auth:** `X-Service-Secret` header + slowapi rate limiting (10/min breed, 5/min meow).

### ADR-003 — Location Fuzzing 500m in PostGIS
**Status:** Accepted · **Date:** 2026-06-25  
**Decision:** GPS coordinates fuzzed to ~500m grid at INSERT time via `ST_SnapToGrid(0.005°)`.  
**Rationale:** Exact GPS of a cat colony endangers the cats (poisoning, targeted harm). Fuzzing happens in a `BEFORE INSERT` database trigger — raw coordinates never leave the INSERT statement.  
**Implementation:** `ST_SnapToGrid(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 0.005)`

### ADR-004 — Open-Meteo via Server Proxy
**Status:** Accepted · **Date:** 2026-06-25  
**Decision:** All weather API calls go through `/api/weather`, never directly from the browser.  
**Rationale:** Browser extensions (ad blockers, privacy tools) intercept and reject third-party fetch calls, causing `TypeError: Failed to fetch`. Server-side fetching bypasses this entirely.  
**Bonus:** Server-side caching, rate limit control, unified error handling. Batch mode supports 5+ parallel location fetches in `Promise.all`.

### ADR-005 — Nominatim for Reverse Geocoding
**Status:** Accepted · **Date:** 2026-06-25  
**Decision:** Use [Nominatim](https://nominatim.org/) (OpenStreetMap) for GPS → city name conversion.  
**Rationale:** No API key required, privacy-respecting (no tracking), generous rate limits for non-commercial use. Called client-side only for display purposes — location name is not stored.  
**Fallback:** Graceful degradation to "Your Area" if Nominatim fails or times out.

### ADR-006 — Clerk + Direct Supabase Credential Hybrid Auth
**Status:** Accepted · **Date:** 2026-06-25  
**Decision:** Support two auth paths: (1) Clerk-managed users (primary), (2) Admin-created direct Supabase credential accounts.  
**Rationale:** Volunteers may need temporary accounts without email verification or OAuth setup (e.g. field operations). Admins can create direct credential accounts with custom passwords, expiry dates, and login usage limits — all enforced by a PostgreSQL trigger without Clerk involvement.  
**Implementation:** `clerk_synced: true` metadata flag on Clerk accounts. `AuthBridge` only signs out Supabase on Clerk sign-out if this flag is present. Direct credential accounts remain signed in independently.

### ADR-007 — Page-Specific Notice & Broadcast Routing
**Status:** Accepted · **Date:** 2026-06-25  
**Decision:** Move `<Broadcasts />` component to the root layout (`app/layout.tsx`) and filter active notice boards, popups, and alert banners client-side based on `usePathname()` route tokens.  
**Rationale:** Announcements shouldn't be global if they are specifically relevant to a single page (e.g. login warnings, map instructions, safety alerts). Root layout mounting allows public auth routes (like `/auth/login`) to receive targeted notices.  
**Implementation:** `target_page` column in `notices` table. Client component matches pathname (e.g., `/map` matches `'map'`) and filters displayed notices where `target_page = 'all'` or `target_page = pageKey`.

### ADR-008 — Sliding Auth Toggle Segmented Controller
**Status:** Accepted · **Date:** 2026-06-27  
**Decision:** Replace stacked dual-form login layout with a single `AuthTabs` sliding segmented control.  
**Rationale:** The previous layout required separate button-click page redirects to switch between Clerk Social and Database Direct auth, which was confusing for users (especially judges). A sliding pill-style tab within the same card eliminates navigating away. Active tab is auto-selected from URL query parameters (`?method=db`).

### ADR-009 — Query Escalation Hierarchy
**Status:** Accepted · **Date:** 2026-06-27  
**Decision:** Implement a three-tier support query escalation: Volunteer → Moderator → Admin.  
**Rationale:** Moderators handle most community support queries, keeping admin workload low. If a moderator cannot resolve a query, they document a reason and escalate to admin. This creates an auditable chain of responsibility and prevents queries from being silently dropped.

---

## Data Flow

### Cat Logging
```
User fills LogCatForm
  → EXIF stripped client-side (sharp WASM)
  → ConsentGate: GDPR consent for AI (optional)
  → Server Action: lib/actions/cats.ts
    → Upload to Supabase Storage (signed URL)
    → INSERT cats with ST_SnapToGrid location fuzzing trigger
    → award_points RPC (SECURITY DEFINER — bypasses RLS)
  → Realtime broadcast to subscribed CatMap clients
  → Globe particles update via Supabase Realtime channel
```

### Weather Alert (Landing Page)
```
LandingPage mounts
  → navigator.geolocation.getCurrentPosition() [4s timeout]
  → If granted: fetch Nominatim for city name (display only)
  → fetch /api/weather?lat=X&lng=Y&city=Name
      → Server fetches Open-Meteo (never blocked)
      → Returns: temp, apparentTemp, humidity, precipProb, is_day
  → If denied / timeout: fetch /api/weather (random global cat shelter)
  → setActiveAlert() with comfort classification + location name
```

### Weather Page (District Grid)
```
WeatherPage mounts
  → fetch /api/weather?lats=40.80,...&lngs=-73.95,...
      → Server fetches N Open-Meteo requests in parallel (Promise.all)
      → Returns: { results: [...N weather objects] }
  → Map results to district cards with comfort classifications
  → Alert banner derived dynamically from live data (not hardcoded)
```

### Empire Points
```
Any cat-positive action
  → award_points(user_id, action_type, points, action_key) RPC
    → SECURITY DEFINER: bypasses RLS, runs as DB owner
    → INSERT IGNORE on action_key UNIQUE (idempotent — no double-awarding)
    → Leaderboard_weekly view refreshed via pg_cron
```

### Admin Credential User Login
```
Admin creates user in AdminDashboard
  → adminCreateUser() Server Action
  → Supabase Auth admin.createUser() (email_confirm: true, no Clerk)
  → Profile row patched: role, password_expires_at, max_usages, usages_count=0
  
User signs in with email+password
  → Standard Supabase email/password sign-in (AuthForm)
  → on_auth_user_login DB trigger fires on auth.users update
    → Checks password_expires_at: if past → update is_enabled=false, sign out
    → Checks max_usages: if usages_count >= max_usages → lock account
    → Otherwise: INCREMENT usages_count
  → AuthBridge sees no clerk_synced flag → does NOT force sign out
  → Navbar detects direct Supabase session → shows Supabase profile
```

### Page-Specific Notice & Broadcast Display
```
Notice board entry is created by Admin with target_page = 'login'
  → notices table updated
  → Supabase realtime channel broadcasts change to clients
User loads `/auth/login`
  → Root layout client component <Broadcasts /> detects pathname = '/auth/login'
  → Maps route to pageKey = 'login'
  → Filters and displays notices where target_page = 'all' OR target_page = 'login'
  → Alert banner or popup modal is rendered on the screen
```

### Support Query Escalation
```
Volunteer submits query
  → Query stored with status = 'open'
  → Moderator reviews in dashboard
  → If resolved: Moderator marks closed, notifies volunteer
  → If unresolved: Moderator escalates with reason → status = 'escalated'
  → Admin receives escalated query with moderator's reason
  → Admin resolves and closes
```

### Sliding Auth Tab Selection
```
User visits /auth/login or /auth/moderator-login
  → AuthTabs renders segmented sliding control (Clerk Social | Database Direct)
  → URL query param ?method=db auto-selects Database Direct tab
  → Judge credential card click → pre-fills form + switches to Database Direct
  → No page redirect required — form content transitions in-place
```

---

## Component Architecture

### Server vs Client Split

| Component | Type | Why |
|-----------|------|-----|
| `GlobeScene` | Client | Three.js requires DOM + WebGL API |
| `CatMap` | Client | Leaflet + realtime Supabase subscription |
| `Navbar` | Client | Scroll events, dual auth state, theme toggle |
| `WeatherPage` | Client | Geolocation API, live fetch |
| `AuthBridge` | Client | Clerk session events, localStorage |
| `AdminDashboardClient` | Client | Live feed subscriptions, optimistic UI |
| `CatGrid` | Server | Pure render, ISR cached (300s) |
| `EventSignupButton` | Client | `useTransition` optimistic signup |
| `ConsentGate` | Client | localStorage consent check |
| `DataDeletion` | Client | Two-step confirm modal |

---

## Admin & Moderator RBAC Architecture

MeowNet uses a role-based access control (RBAC) model to partition volunteer, moderator, and admin permissions.

### Roles
| Role | Capabilities |
|------|-------------|
| `user` | Log cats, join events, earn points, view own profile |
| `moderator` | All user capabilities + review/moderate cat reports |
| `admin` | All moderator capabilities + user management, role changes, point adjustments, audit access |

### Enforcement Layers
1. **Database Tier** — `role` column in `profiles`. `check_role_update` trigger rejects self-escalation unless caller is `admin` or `service_role`.
2. **Server Tier** — Every Server Action in `lib/actions/admin.ts` re-reads the caller's role from the DB before any mutation. No client-trusted role.
3. **Application Layer** — Navbar, page routes, and dashboard components gate rendering based on verified server-fetched role.

### Admin Credential User System (v0.2.0)
- Admins create direct Supabase Auth accounts (bypassing Clerk) with custom passwords
- Optional: `password_expires_at` (ISO timestamp) — account auto-locks after expiry
- Optional: `max_usages` — account auto-locks after N successful sign-ins
- DB trigger `on_auth_user_login` enforces both constraints server-side
- `clerk_synced: true` metadata flag distinguishes Clerk users from direct credential users

---

## Security Architecture

See [security.md](security.md) for the full STRIDE threat model.

**Key controls:**
- RLS on every table — users can only read/write their own data
- EXIF stripped before upload — `lib/security/exif.ts`
- GPS fuzzing at DB level — `ST_SnapToGrid(0.005°)`
- Points idempotency — `action_key UNIQUE` prevents double-awarding
- CSP + HSTS + X-Frame-Options headers in `next.config.ts`
- `service_role` key never in client bundle — verified via CI secret scan
