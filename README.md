<div align="center">

# MeowNet

**Community-powered urban cat rescue — log strays, coordinate TNR, earn Empire Points.**

[![CI Status](https://github.com/SynthReaper/MeowNet/actions/workflows/ci.yml/badge.svg)](https://github.com/SynthReaper/MeowNet/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostGIS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.9.0-blueviolet)](CHANGELOG.md)

*Built for **#hackthekitty 2026** · by [SynthReaper](https://github.com/SynthReaper)*

</div>

---

## Quick Links

| Resource | URL |
|----------|-----|
| **Production App** | [meownet-sr.vercel.app](https://meownet-sr.vercel.app/) |
| **ML Service** | [meownet-ml.onrender.com](https://meownet-ml.onrender.com/) |
| **Judge Guide** | [docs/HACKATHON.md](docs/HACKATHON.md) |
| **Developer** | [github.com/SynthReaper](https://github.com/SynthReaper) |

---

> ### Judge Credentials
>
> **Recommended:** Use the **[Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login)** — judge credential cards are pre-loaded at the bottom. Clicking any card auto-switches to **Database Direct** mode and pre-fills the login form (no OTP, no Clerk, instant access).
>
> | Role | Email | Password |
> |------|-------|----------|
> | Standard Volunteer | `judge-user@meownet.org` | `JudgeUser2026!` |
> | Sub-Moderator | `judge-submod@meownet.org` | `JudgeSubMod2026!` |
>
> **Note on Clerk social login:** Standard email sign-in via Clerk has a ~30% chance of verification link failure on this domain. Social logins (Google, GitHub) work correctly. For guaranteed instant access, always use the **Database Direct** tab.

---

## What Is MeowNet?

Millions of stray cats live in cities with no unified support infrastructure. Rescue volunteers rely on fragmented tools — WhatsApp groups, spreadsheets, separate apps — to coordinate TNR (Trap-Neuter-Return) campaigns. Colony locations shared in plain text put vulnerable cats at risk.

MeowNet is a full-stack, privacy-first web platform that turns urban cat rescue into a **gamified, coordinated, data-driven mission**.

---

## Feature Overview

| Feature | Description | Code Location |
|---------|-------------|---------------|
| **Interactive Cat** | SVG companion that reacts to local temperature | `components/ui/InteractiveCat` |
| **Live Cat Map** | Leaflet realtime map with status markers and heatmap toggle | `app/(app)/map` |
| **Cat Welfare Score** | Dynamic 0–100 welfare algorithm (TNR, vaccines, BCS, health flags) | `lib/welfare/welfare-score.ts` |
| **Cat Logging** | Photo upload → EXIF strip → AI breed estimation → geo-fuzzing → DB | `app/(app)/cats/new` |
| **TNR Events** | Create, join, and manage Trap-Neuter-Return events with realtime capacity | `app/(app)/events` |
| **Empire Points** | Weekly leaderboards, impact badges, idempotent point RPCs | `app/(app)/empire` |
| **Weather Watch** | Geolocation-aware feline safety alerts (proxied Open-Meteo) | `app/(app)/weather` |
| **AI Breed Estimator** | HuggingFace image classification, GDPR gate, vet disclaimers | `app/api/ai/breed` |
| **Admin Dashboard** | RBAC, analytics (Recharts), audit logs, system settings, live activity feed | `app/(app)/admin` |
| **Moderator Dashboard** | Leaflet hotspot map, inline verification from map popups, query queue | `app/(app)/moderator` |
| **Colony Tycoon** | Idle offline progress engine, real-time accumulation counter | `app/(app)/empire/tycoon` |
| **Daily Trivia** | Admin-managed questions, answer streaks, daily educational challenges | `app/(app)/empire/trivia` |
| **Stray Bingo** | Weekly quest board, admin-defined tasks, bingo cards | `app/(app)/empire/bingo` |
| **Volunteer Guilds** | Regional guilds, join conditions, realtime sync, rank display | `app/(app)/empire/guilds` |
| **Maintenance Mode** | One-click site-wide gate with admin bypass | `app/maintenance` |
| **Targeted Broadcasts** | Page-specific banner/popup routing via Supabase Realtime | `components/ui/Broadcasts` |
| **Community Chat** | Public/private channels, DMs, soft-delete, edit log | `app/(app)/community` |
| **EXIF Stripping** | Client-side metadata removal before any photo upload | `lib/security/exif.ts` |
| **Location Fuzzing** | PostGIS `ST_SnapToGrid(0.005°)` — colony GPS never stored raw | `supabase/migrations` |
| **GDPR Erasure** | One-click account deletion cascading all tables + session invalidation | `app/api/privacy` |
| **Verification Registry** | Public portal for authenticating Proof of Neuter UUIDs and volunteer reports | `app/verify` |
| **Support Query System** | Three-tier escalation: Volunteer → Moderator → Admin | `app/(app)/moderator` |
| **Meow Translator** | Mood-classifier ML endpoint for cat vocalisation analysis | `app/api/ai/meow` |
| **Personal Care Center** | Zero-knowledge cockpit tracking physical metrics, treatments, nutrition, sleep, behavior, and custom registry metadata | `app/(app)/profile/care-center` |
| **Personal AI Helper** | Interactive Direct Action AI Copilot parsing response templates to suggest log entries and alert thresholds | `app/(app)/personal-helper` |
| **Volunteer Hub (VMS)** | Availability grids, skill panels, hours logs, and mentor-matching queues | `app/(app)/volunteers` |
| **Emergency Response** | Realtime Leaflet crisis map, incident dispatch, live LIVE-badge notices | `app/(app)/emergency` |
| **Supply Registry** | Inventory grid, stock tracking, request fulfillment modals | `app/(app)/supplies` |
| **Regional Chapters** | Territory boundary maps, chapter join/leave, admin management | `app/(app)/chapters` |
| **Impact Analytics** | Welfare trend charts, sighting density, population Recharts dashboards | `app/(app)/analytics` |
| **Educational Academy** | Courses, graded quizzes awarding Empire Points on pass | `app/(app)/education` |
| **Partner Network** | Verified NGO and vet partner registry | `app/(app)/partners` |
| **Research Portal** | Anonymized population metadata JSON exporter for academic requests | `app/(app)/research` |
| **Role-Tiered Navbar** | 5 nav groups + staff groups with amber MOD / red-gold ADMIN badge tiers | `components/nav/Navbar` |

---

## Tech Stack

### Frontend & App Shell

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16 (App Router) | Framework — RSC, Server Actions, API Routes |
| **React** | 19 | UI — transitions, optimistic UI, hooks |
| **TypeScript** | 5 strict | Type safety across entire codebase |
| **Leaflet** | 1.9 | Interactive realtime cat map |
| **Recharts** | 2.15 | Admin analytics dashboards |
| **GSAP** | 3 | Counter animations, scroll-triggered effects |
| **Vanilla CSS** | — | Design tokens, glassmorphism, dark mode |

### Backend, Database & Storage

| Technology | Purpose |
|-----------|---------|
| **Supabase (PostgreSQL + PostGIS)** | Auth, database, storage, realtime subscriptions |
| **Clerk** | Primary user identity + OAuth (Google, GitHub) |
| **Supabase AuthBridge** | Client component syncing Clerk sessions to Supabase |
| **Python FastAPI** | ML microservice for breed and mood estimation |
| **Docker** | Containerized ML service deployment |
| **Render** | ML service hosting |
| **Vercel** | Next.js hosting with edge runtime |

---

## Architecture

```
Browser
  |
  +-- Next.js 16 App (Vercel Edge)
  |     +-- Server Components (RSC)   -- DB reads, no hydration cost
  |     +-- Client Components          -- Interactive UI, realtime
  |     +-- Server Actions             -- Secure mutations (no exposed API)
  |     +-- API Routes (/api/*)        -- External proxies + GDPR
  |
  +-- Supabase (PostgreSQL + PostGIS)
  |     +-- Auth            -- email/password + Google/GitHub + direct creds
  |     +-- Database        -- cats, events, profiles, gamification (10 migrations)
  |     +-- Storage         -- Cat photos (EXIF stripped before upload)
  |     +-- Realtime        -- Live cat map + community chat + guilds
  |     +-- system_settings -- Dynamic key-value configuration store
  |
  +-- Python FastAPI (Docker -> Render)
  |     +-- /breed + /meow -- HuggingFace inference (breed + mood)
  |
  +-- External APIs (server-side proxied -- never from browser)
        +-- Open-Meteo    -> /api/weather
        +-- Catfact.ninja -> /api/catfact
        +-- Tenor GIF CDN -> /api/tenor
        +-- Nominatim     -> reverse geocoding (display only)
```

### Project Structure

```
MeowNet/
+-- app/
|   +-- (app)/              # Auth-gated shell (force-dynamic)
|   |   +-- admin/          # Admin dashboard, RBAC, system settings, supreme management
|   |   +-- cats/           # Cat logging, profiles, edits
|   |   +-- colonies/       # Stray cat colony management
|   |   +-- community/      # Public/private chat channels + DMs
|   |   +-- empire/         # Leaderboard, badges, guilds, trivia, bingo, tycoon
|   |   +-- events/         # TNR event management
|   |   +-- map/            # Realtime Leaflet cat map
|   |   +-- moderator/      # Moderator dashboard + verification map
|   |   +-- notices/        # Targeted notices and announcements
|   |   +-- personal-helper/# Full-screen Personal AI Helper console page
|   |   +-- profile/        # Profile + GDPR account erasure
|   |   |   +-- care-center/# Private client-side encrypted Care Center
|   |   +-- reports/        # Field reports
|   |   +-- safety/         # Colony safety guides
|   |   +-- stories/        # Cat success stories
|   |   +-- weather/        # Feline weather safety watch
|   |   +-- volunteers/     # Volunteer Management System (VMS)
|   |   +-- emergency/      # Emergency Case Registry + incident map
|   |   +-- supplies/       # Supply Chain Registry
|   |   +-- chapters/       # Regional chapters + territory maps
|   |   +-- analytics/      # Impact analytics & welfare trends
|   |   +-- education/      # Educational Academy + quizzes
|   |   +-- partners/       # Partner NGO & vet registry
|   |   +-- research/       # Research data exporter
|   |   +-- support/        # Volunteer support query submission
|   +-- api/
|   |   +-- ai/breed/       # ML breed estimation proxy
|   |   +-- ai/meow/        # ML meow mood classification proxy
|   |   +-- ai/health/      # ML service warmup ping
|   |   +-- ai/personal-helper/# User-supplied keys AI proxy API
|   |   +-- catfact/        # Cat fact API proxy
|   |   +-- privacy/        # GDPR cascading account deletion
|   |   +-- tenor/          # Tenor GIF search proxy
|   |   +-- weather/        # Open-Meteo server proxy
|   +-- auth/               # Login, signup, OAuth callback
|   +-- maintenance/        # Full-site maintenance mode page
|   +-- verify/             # Public certificate verification portal
+-- components/
|   +-- auth/AuthBridge/    # Clerk->Supabase session sync
|   +-- auth/AuthTabs/      # Sliding Clerk <-> Database Direct toggle
|   +-- forms/ConsentGate/  # GDPR Article 6(1)(a) consent UI
|   +-- nav/Navbar/         # Dual auth-provider aware navbar
|   +-- ui/InteractiveCat/  # Interactive SVG cat companion
+-- docs/                   # Developer and judge documentation
+-- lib/
|   +-- actions/            # Server Actions (admin, auth, cats, events)
|   +-- privacy/            # GDPR consent text (client-safe)
|   +-- security/           # EXIF stripping + sanitization
|   +-- supabase/           # Browser + server Supabase clients + settings helper
|   +-- welfare/            # Cat welfare score algorithm
+-- python-ml/              # FastAPI Docker service
|   +-- Dockerfile
|   +-- docker-compose.yml
|   +-- main.py
+-- supabase/
|   +-- migrations/         # 0001-0007 & fix migrations (including personal care, security tables, and audit trigger fixes)
|   +-- seed.sql
+-- proxy.ts                # Next.js middleware (auth guard + maintenance gate)
```

---

## Security & Privacy

| Control | Implementation |
|---------|---------------|
| **EXIF Stripping** | `sharp` WASM strips GPS metadata client-side before any upload |
| **Zero-Knowledge Encryption** | In-browser AES-GCM-256 + PBKDF2 local key derivation for private cat logs & user AI keys |
| **Location Fuzzing** | PostGIS `ST_SnapToGrid(0.005°)` — colony GPS never stored raw |
| **Auth Bridge** | Clerk sessions sync to Supabase; direct credential accounts isolated |
| **GDPR Erasure** | Cascade `DELETE` removes all user data and signs out all sessions |
| **Points Idempotency** | `action_key UNIQUE` in `point_log` — points awarded exactly once |
| **ML Auth** | `X-Service-Secret` header + slowapi rate limiting (10/min breed) |
| **Security Headers** | CSP, HSTS, `X-Frame-Options: SAMEORIGIN`, COOP, CORP + 6 more in `next.config.ts` |
| **Source Maps** | `productionBrowserSourceMaps: false` — TypeScript not readable in DevTools |
| **Fingerprint Removal** | `poweredByHeader: false` — hides `X-Powered-By: Next.js` |
| **RLS** | Row-Level Security on every Supabase table — least privilege |
| **Admin Credentials** | Admin-created accounts use DB-enforced expiry and login usage limits |

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker Desktop
- Supabase CLI

### Quickstart (5 commands)

```bash
git clone https://github.com/SynthReaper/MeowNet.git && cd MeowNet
npm install
cp .env.example .env.local          # Fill in your Supabase + Clerk keys
npx supabase db push                 # Apply migrations (0001-0007 + fixes)
npm run dev                          # Start at localhost:3000
```

### ML Service (Docker)

```bash
cd python-ml
docker-compose up                    # Starts FastAPI at localhost:8000
```

### QA Commands

```bash
npm run type-check    # TypeScript -- 0 errors required
npm run lint          # ESLint
npm run build         # Production build
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/HACKATHON.md](docs/HACKATHON.md) | **Start here** — Judge guide and demo walkthrough |
| [docs/architecture.md](docs/architecture.md) | System design, ADRs, data flow |
| [docs/database.md](docs/database.md) | Migrations, schema, RLS matrix |
| [docs/api.md](docs/api.md) | API route reference |
| [docs/security.md](docs/security.md) | Threat model, GDPR compliance |
| [docs/deployment.md](docs/deployment.md) | Vercel + Render + Docker guide |
| [docs/weather.md](docs/weather.md) | Open-Meteo integration |
| [aikido-security-audit/](aikido-security-audit/) | Aikido Security Audit Report |

---

## Acknowledgements

Created for **#hackthekitty 2026** by [SynthReaper](https://github.com/SynthReaper).

- **Kiro AI** — Specifying, modeling, and designing the new Social Impact features (.kiro specifications)
- **Aikido Security** — Automated security audits and vulnerability scanning ([security-audit-report.pdf](aikido-security-audit/security-audit-report.pdf))
- **Supabase** — Database, Auth, Storage, Realtime
- **Clerk** — User identity and OAuth
- **Leaflet** — Interactive map
- **HuggingFace** — AI breed and mood image classification
- **Open-Meteo** — Weather forecasting API
- **Nominatim** — Privacy-respecting geocoder
- **Recharts** — Data visualisation

---

**Author:** [SynthReaper](https://github.com/SynthReaper) · synthreaperx@gmail.com · **Version:** 0.9.0 · **License:** [MIT](LICENSE)
