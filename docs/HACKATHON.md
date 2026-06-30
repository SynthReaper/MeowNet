<div align="center">

# MeowNet — Hackathon Judge Guide

**#hackthekitty 2026 · v0.8.0**

*A complete walkthrough for evaluators — no developer setup required.*

</div>

---

## Start Here — 60-Second Overview

MeowNet is a full-stack urban cat rescue platform. Volunteers log stray cats, coordinate TNR (Trap-Neuter-Return) events, and earn gamification points. Staff moderate via dedicated dashboards. Every piece of sensitive data — GPS coordinates, uploaded photos, user accounts — passes through privacy controls before it is stored.

**Stack:** Next.js 16 + React 19 + TypeScript 5 (strict) + Supabase (PostgreSQL + PostGIS) + Clerk + Python FastAPI (Docker)

**Live app:** [meownet-sr.vercel.app](https://meownet-sr.vercel.app/)

---

## Step 1: Log In

MeowNet runs two parallel authentication systems. Standard Clerk email sign-in may trigger an OTP verification code — deliverability can be unreliable without a custom Clerk domain (~30% failure rate). Use **Database Direct** login to avoid any friction.

### Recommended Method — Database Direct (No OTP)

1. Open the **[Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login)**
2. Scroll to the bottom — judge credential cards are pre-loaded
3. Click any card — the form auto-fills and the **DATABASE DIRECT** tab activates
4. Click **Sign In** — instant access, no email verification required

---

## Judge Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Standard Volunteer | `judge-user@meownet.org` | `JudgeUser2026!` | Full volunteer features — map, cats, events, empire, community, weather |
| Sub-Moderator | `judge-submod@meownet.org` | `JudgeSubMod2026!` | All volunteer features + moderator dashboard, query resolution (DB-enforced 20-use limit) |

> **Admin access** is available on request — contact synthreaperx@gmail.com. The admin dashboard includes system settings, audit logs, user management, and live activity feed.

> **Auth note:** The sliding toggle at the top of the login card switches between Clerk Social Login and Database Direct. The judge credential cards at the bottom of the Staff Portal select this automatically.

---

## Feature Tour

### 1. Landing Page and Interactive Cat Companion

**What it does:** The home page displays an interactive SVG cat companion that reacts dynamically to the current local temperature — it shivers in cold weather and fans itself in heat. A real-time weather safety banner appears based on your geolocation.

**Try it:** Visit [meownet-sr.vercel.app](https://meownet-sr.vercel.app/). Interact with the cat. Check the weather strip at the top.

**Code:** [`components/ui/InteractiveCat/index.tsx`](../components/ui/InteractiveCat/index.tsx)

---

### 2. Cat Logging and AI Breed Estimator

**What it does:** Volunteers register new cat sightings through a multi-step form:

- **GDPR Consent Gate** — users must explicitly consent before AI analysis runs
- **AI Breed Analyzer** — uploads the photo to a HuggingFace model via a secure server-side proxy
- **EXIF Metadata Stripper** — removes GPS tags from the photo before it ever reaches the server
- **Cat Welfare Score** — calculates a 0-100 welfare score based on TNR status, vaccination, BCS rating, and health flags

**Try it:** Go to **Cats → Log New Cat**. Toggle the consent checkbox. Upload a cat photo. Receive a breed estimate with veterinary disclaimer.

**Code:**
- [`lib/security/exif.ts`](../lib/security/exif.ts) — EXIF stripping
- [`components/forms/ConsentGate/index.tsx`](../components/forms/ConsentGate/index.tsx) — GDPR gate
- [`lib/welfare/welfare-score.ts`](../lib/welfare/welfare-score.ts) — welfare algorithm
- [`app/api/ai/breed/route.ts`](../app/api/ai/breed/route.ts) — ML proxy

---

### 3. Live Sighting Map

**What it does:** An interactive Leaflet map showing all logged cat sightings and upcoming TNR events. Key privacy feature: cat markers are **fuzzed to a ~500-metre grid** — exact colony coordinates are never stored or displayed, protecting cats from harm. A heatmap density toggle is available for an at-a-glance view of high-activity areas.

**Try it:** Click **Map** in the navigation bar. Toggle between point markers and the heatmap layer using the toolbar button.

**Code:**
- [`supabase/migrations/0002_production_schema.sql`](../supabase/migrations/0002_production_schema.sql) — PostGIS fuzzing trigger
- [`components/map/CatMap/index.tsx`](../components/map/CatMap/index.tsx) — map component

---

### 4. Empire Dashboard (Gamification)

**What it does:** Rewards volunteers for completing helpful actions. Points are awarded server-side through an idempotent PostgreSQL RPC — the same action can never award points twice.

- **Live leaderboard** — auto-refreshes every 30 seconds
- **Impact badges** — unlocked based on cumulative point history
- **Empire Points** — awarded for cat logging, TNR event attendance, and daily challenges

**Try it:** Click **Empire** in the navigation bar.

**Code:** [`lib/actions/empire.ts`](../lib/actions/empire.ts) · [`app/(app)/empire`](../app/(app)/empire/)

---

### 4a. Colony Tycoon (Idle Builder)

**What it does:** An offline idle progression builder. Stray blessings accumulate in real-time while the user is away, capped at 24 hours. The counter ticks live when the user returns; claiming converts the offline progress into Empire Points.

**Try it:** Click **Empire → Colony Tycoon**.

**Code:** [`components/empire/TycoonInterface/index.tsx`](../components/empire/TycoonInterface/index.tsx)

---

### 4b. Volunteer Guilds

**What it does:** Regional volunteer guilds for coordinated action. Guilds have configurable Empire Points join thresholds. Users can search by name, filter by category (TNR, Feeding, Medical, General), and sort by points or member count. Supabase Realtime keeps the guild list live.

**Try it:** Click **Empire → Volunteer Guilds**.

**Code:** [`components/empire/GuildsInterface/index.tsx`](../components/empire/GuildsInterface/index.tsx)

---

### 4c. Daily Trivia and Stray Bingo

**What it does:** Admins manage a trivia question bank and weekly bingo task boards through the gamification sub-dashboard. Volunteers answer daily rescue/TNR trivia questions for streak bonuses and complete bingo squares for point multipliers.

**Try it:** Click **Empire → Daily Trivia** or **Empire → Stray Bingo**.

---

### 5. Feline Weather Watch

**What it does:** Fetches real-time climate data from Open-Meteo via a server-side proxy (never directly from the browser — this avoids ad-blocker interference). Displays localised safety grids showing whether outdoor temperatures are safe for community cats, with configurable thresholds controlled by admin system settings.

**Try it:** Click **Weather** in the navigation bar.

**Code:** [`app/api/weather/route.ts`](../app/api/weather/route.ts)

---

### 6. Targeted Announcements (Notice Board)

**What it does:** Staff write announcements targeted to specific pages — for example, a notice only appearing on `/map` or `/auth/login`. Supabase Realtime subscriptions deliver banners or modals to only the relevant page instantly.

**Try it:** As an admin, create a notice targeted to the `login` page, log out, and visit the login screen to see the banner appear.

**Code:** [`components/ui/Broadcasts.tsx`](../components/ui/Broadcasts.tsx)

---

### 7. Community Chat

**What it does:** Public and private channels with direct messaging. Messages support soft-delete and maintain an edit audit log. GIF search is powered by a server-side Tenor proxy. Channels are moderated by staff.

**Try it:** Click **Community** in the navigation bar.

**Code:** [`app/(app)/community`](../app/(app)/community/)

---

### 8. Support Query System

**What it does:** Three-tier escalation system for volunteer support queries.

```
Volunteer raises query (status: open)
  -> Moderator reviews
       -> Resolved: Moderator closes
       -> Unresolved: Moderator escalates with written reason (status: escalated)
            -> Admin resolves (status: resolved)
```

**Try it:** Use the **Support** link in the navigation bar to raise a query. Log in as a moderator to review and escalate it.

**Code:** [`app/(app)/moderator`](../app/(app)/moderator/)

---

### 9. Admin and Moderator Portals

**Admin Dashboard** capabilities:

- **Analytics** — Recharts visualisations of user growth, role distribution, database sizes
- **User Management** — create direct-credential accounts with configurable expiry and usage limits, adjust Empire Points, promote roles
- **Audit Logs** — searchable immutable log of all administrative actions, with a dispute-filing system
- **System Settings** — toggle maintenance mode, change point rewards, adjust weather safety thresholds — all live without deployment
- **Supreme Management** — direct CRUD access to all cats, colonies, events, and guilds in the database
- **Live Activity Feed** — Supabase Realtime feed of sightings, chat posts, and TNR events as they happen

**Moderator Dashboard** capabilities:

- Interactive Leaflet hotspot map with inline status editing from map popups
- Moderation queue with query escalation controls
- Volunteer application processing

**Code:** [`app/(app)/admin`](../app/(app)/admin/) · [`app/(app)/moderator`](../app/(app)/moderator/)

---

### 10. Maintenance Mode

**What it does:** Admins can enable maintenance mode from the System Settings tab. When active, every non-admin visitor is immediately redirected to a themed `/maintenance` page. Admins bypass the gate and retain full access.

**Try it:** Log in as admin → Admin Dashboard → System Settings → toggle **Maintenance Mode ON**. Open an incognito window and visit any route to see the redirect. Toggle it back OFF when done.

**Code:** [`proxy.ts`](../proxy.ts) · [`app/maintenance/page.tsx`](../app/maintenance/page.tsx)

---

### 11. Cryptographic Certificate Verification

**What it does:** Volunteers and staff can generate verifiable PDF-ready certificates from their profile page. Each certificate includes a HMAC-SHA256 signed token. Anyone can visit `/verify` and paste the token to confirm its authenticity — no database lookup required, only server-side cryptographic verification.

**Try it:** Log in, open **Profile → Volunteer Certificate** to view and print your certificate. Copy the verification token and visit [/verify](https://meownet-sr.vercel.app/verify) to validate it.

**Code:**
- [`app/(app)/profile/certificate/page.tsx`](../app/(app)/profile/certificate/page.tsx) — certificate generation
- [`app/verify/volunteer/[id]/page.tsx`](../app/verify/volunteer/%5Bid%5D/page.tsx) — HMAC verification

---

## How Everything Ties Together

### Dual Authentication System

MeowNet runs two authentication systems in parallel without conflict:

1. **Clerk Social Login** — used by standard volunteers for Google or GitHub sign-in. A server-side HMAC bridge (`AuthBridge`) automatically syncs Clerk sessions into Supabase on every page load.
2. **Supabase Database Direct Login** — bypasses Clerk entirely. Staff and judges use email + password without any OTP or email verification. Accounts have PostgreSQL-enforced optional expiry dates and login usage limits (a trigger decrements a counter on each login).

The `AuthTabs` slider component switches between both modes on a single login card. The `?method=db` URL parameter pre-selects the Database Direct tab for judge card links.

### Location Privacy

GPS coordinates from cat sightings are never stored precisely. A `BEFORE INSERT` PostgreSQL trigger applies PostGIS `ST_SnapToGrid(0.005)` — rounding all coordinates to a ~500m grid before writing to the database. Exact colony locations are permanently discarded; only the grid-snapped version is ever stored.

### Secure AI Pipeline

The breed estimation AI runs in a separate Docker container (Python FastAPI on Render). The browser never contacts the ML service directly. All requests flow through `/api/ai/breed`, which validates the user session, verifies GDPR consent, strips EXIF data from the image, and adds a `X-Service-Secret` header before forwarding the request. Rate limiting is enforced at 10 requests per minute on the ML side via slowapi.

---

## Key Code Locations

| Feature | File |
|---------|------|
| Location privacy fuzzing | [`supabase/migrations/0002_production_schema.sql`](../supabase/migrations/0002_production_schema.sql) |
| Empire Points RPC | [`supabase/migrations/0002_production_schema.sql`](../supabase/migrations/0002_production_schema.sql) — `award_points` function |
| Query escalation | [`app/(app)/moderator`](../app/(app)/moderator/) |
| Admin server actions | [`lib/actions/admin.ts`](../lib/actions/admin.ts) |
| EXIF stripper | [`lib/security/exif.ts`](../lib/security/exif.ts) |
| Cat welfare score | [`lib/welfare/welfare-score.ts`](../lib/welfare/welfare-score.ts) |
| Interactive cat companion | [`components/ui/InteractiveCat/index.tsx`](../components/ui/InteractiveCat/index.tsx) |
| ML service | [`python-ml/main.py`](../python-ml/main.py) |
| Auth sliding toggle | [`components/auth/AuthTabs.tsx`](../components/auth/AuthTabs.tsx) |
| Broadcast system | [`components/ui/Broadcasts.tsx`](../components/ui/Broadcasts.tsx) |
| Volunteer guilds | [`components/empire/GuildsInterface/index.tsx`](../components/empire/GuildsInterface/index.tsx) |
| Colony tycoon | [`components/empire/TycoonInterface/index.tsx`](../components/empire/TycoonInterface/index.tsx) |
| System settings | [`lib/supabase/settings.ts`](../lib/supabase/settings.ts) |
| Maintenance mode | [`proxy.ts`](../proxy.ts) · [`app/maintenance/page.tsx`](../app/maintenance/page.tsx) |
| Certificate verification | [`app/verify/volunteer/[id]/page.tsx`](../app/verify/volunteer/%5Bid%5D/page.tsx) |
| Weather proxy | [`app/api/weather/route.ts`](../app/api/weather/route.ts) |
| Clerk-Supabase bridge | [`components/auth/AuthBridge/index.tsx`](../components/auth/AuthBridge/index.tsx) |

---

## Architecture Overview

```
Browser
  |
Next.js 16 (Vercel Edge)
  +-- Clerk Social Login      <---- Google / GitHub OAuth
  +-- Supabase Direct DB      <---- Staff / Judge credentials (no OTP)
  +-- /api/* routes           <---- Proxy for ML, weather, catfacts, GIFs
  +-- Server Actions          <---- Secure mutations (admin, cats, events)
  |
Supabase (PostgreSQL + PostGIS)
  +-- RLS on every table
  +-- Location fuzzing trigger (ST_SnapToGrid)
  +-- Login expiry + usage limit triggers
  +-- Realtime subscriptions (guilds, chat, map, system_settings)
  +-- system_settings (maintenance, point config, weather threshold)
  |
Python FastAPI (Docker -> Render)
  +-- HuggingFace breed + mood AI
  +-- X-Service-Secret auth + slowapi rate limiting
```

---

## Post-Session Security Hardening Notes (v0.7.0 / v0.8.0)

- **Security Header Accuracy** — All documented header values verified against `next.config.ts`. `X-Frame-Options` is `SAMEORIGIN` (permits Vercel preview embeds while blocking third-party frames).
- **Source Map Protection** — `productionBrowserSourceMaps: false` — JavaScript source maps are not served in production.
- **Powered-By Suppression** — `poweredByHeader: false` — the `X-Powered-By: Next.js` fingerprinting header is removed.
- **Code Quality Audit** — 637 code smells, accessibility violations, and strict TypeScript warnings resolved across all major components.
- **GIF Proxy** — Community chat uses a server-side Tenor proxy (`/api/tenor`) so GIF searches never leave through the browser.

---

## Judge Checklist

Use this to guide a structured evaluation:

| Area | What to Check | Where |
|------|--------------|-------|
| Authentication | Log in via Database Direct (no OTP) | [Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login) |
| Privacy — location | Cat map markers are approximate, not exact | [/map](https://meownet-sr.vercel.app/map) |
| Privacy — EXIF | Upload a photo with GPS — EXIF is stripped before storage | Cats → Log New Cat |
| AI integration | Breed estimate with consent gate + vet disclaimer | Cats → Log New Cat |
| Welfare Score | 0–100 welfare breakdown on any cat profile | Any cat detail page |
| Gamification | Points, leaderboard, badges, guilds, trivia, bingo | Empire section |
| Admin power | System settings, user management, audit logs | Admin Dashboard |
| Maintenance mode | Toggle ON → non-admin redirect → Toggle OFF | Admin → System Settings |
| Verification | Generate certificate → copy token → verify at /verify | Profile → Certificate |
| Community | Chat channels, DMs, GIF search | Community section |
| Weather | Geolocation-based feline safety grid | Weather section |
| Code quality | TypeScript strict, 0 type errors, ESLint clean | Source code |
| Security | HMAC bridge, RLS, CSP headers, no service keys in client | [docs/security.md](security.md) |

---

*MeowNet — #hackthekitty 2026 · v0.8.0 · [SynthReaper](https://github.com/SynthReaper) · synthreaperx@gmail.com*
