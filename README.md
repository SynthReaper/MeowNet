# MeowNet 🐾👑

> **The community-powered cat empire.** Log strays, coordinate TNR, earn Empire Points — every particle on that globe is a cat with a better life.

[![CI Status](https://github.com/SynthReaper/MeowNet/actions/workflows/ci.yml/badge.svg)](https://github.com/SynthReaper/MeowNet/actions/workflows/ci.yml)
[![Deploy Status](https://github.com/SynthReaper/MeowNet/actions/workflows/deploy.yml/badge.svg)](https://github.com/SynthReaper/MeowNet/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostGIS-green?logo=supabase)](https://supabase.com/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🔗 Live Links

| Resource | URL |
|----------|-----|
| 🌐 **Production App** | [meownet-sr.vercel.app](https://meownet-sr.vercel.app/) |
| 🤖 **ML Service** | [meownet-ml.onrender.com](https://meownet-ml.onrender.com/) |
| 👤 **Developer** | [github.com/SynthReaper](https://github.com/SynthReaper) |

> **Demo Account:** `demo@meownet.app` / `demo1234`
>
> 🐾 **Hackathon Judge Credentials (30-Day Expiration):**
>
> | Role | Email | Password | How to Login |
> |------|-------|----------|--------------|
> | 🧑 Standard Volunteer | `judge-user@meownet.org` | `JudgeUser2026!` | [Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login) → click judge card → **DATABASE DIRECT** tab |
> | 🛡️ Sub-Moderator | `judge-submod@meownet.org` | `JudgeSubMod2026!` | [Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login) → click judge card → **DATABASE DIRECT** tab |
>
> ⚠️ **OTP / Verification Notice:** Standard email sign-in (Clerk) has approximately a **30% chance** of verification link failure because the app is not deployed on a custom Clerk-verified domain. **Social logins (Google, GitHub) work fine.** To avoid any issues, always use the **Database Direct** tab on the login card — no email verification or OTP required.
>
> 💡 **Quick Access:** Go to the [Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login). Judge credential cards are pre-loaded at the bottom. Clicking any card auto-switches to **Database Direct** mode, pre-fills the form, and takes you straight to the dashboard.

---

## 🎯 What Is MeowNet?

Millions of stray cats live in cities with no unified support infrastructure. Rescue volunteers rely on fragmented tools — WhatsApp groups, spreadsheets, separate apps — to coordinate TNR (Trap-Neuter-Return) campaigns. Colony locations are shared in plain text, which puts vulnerable cats at risk.

MeowNet changes that. It's a full-stack, privacy-first web platform that turns urban cat rescue into a **gamified, coordinated, data-driven mission**. Built for **#hackthekitty 2026** — a hackathon celebrating technology for animal welfare.

### What You Can Do

| Feature | Description | Code Location |
|---------|-------------|---------------|
| 🌍 **3D Impact Globe** | WebGL globe with custom GLSL atmospheric shader — every point is a logged cat | `components/three/GlobeScene` |
| 🗺️ **Live Cat Map** | Leaflet interactive map, realtime subscriptions, cat status markers | `app/(app)/map` |
| 🐱 **Cat Logging** | Photo upload → EXIF strip → AI breed estimation → geofuzzing → DB save | `app/(app)/cats/new` |
| 📅 **TNR Events** | Create, join, and manage Trap-Neuter-Return events with realtime capacity | `app/(app)/events` |
| 👑 **Empire Points** | Weekly leaderboards, impact badges, idempotent point RPCs | `app/(app)/empire` |
| 🌤️ **Weather Watch** | Geolocation-aware feline weather safety alerts (proxied Open-Meteo) | `app/(app)/weather` |
| 🤖 **AI Breed Estimator** | HuggingFace image classification, GDPR gate, vet disclaimers | `app/api/ai/breed` |
| 🛡️ **Admin Dashboard** | RBAC, Recharts analytics, bento metrics, audit logs, credential management | `app/(app)/admin` |
| 🕵️ **Moderator Dashboard** | Moderation queue, Leaflet hotspots, inline verification from map popups | `app/(app)/moderator` |
| 📢 **Targeted Broadcasts** | Notice Board with page-specific banner/popup routing | `components/ui/Broadcasts` |
| 💬 **Community Chat** | Public and private channels, DMs, moderated with soft-delete + edit log | `app/(app)/community` |
| 🔒 **EXIF Stripping** | Client-side metadata removal before any photo upload | `lib/security/exif.ts` |
| 📍 **Location Fuzzing** | PostGIS `ST_SnapToGrid(0.005°)` — colony GPS never stored raw | `supabase/migrations` |
| 🗑️ **GDPR Erasure** | One-click account deletion cascading all tables + signs out all sessions | `app/api/privacy` |

---

## 🚀 Tech Stack

### Frontend & App Shell
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16 (App Router) | Framework — RSC, Server Actions, API Routes |
| **React** | 19 | UI — transitions, optimistic UI, hooks |
| **TypeScript** | 5 strict | Type safety across entire codebase |
| **Three.js + GLSL** | r168 | WebGL 3D globe with atmospheric shader |
| **Leaflet** | 1.9 | Interactive realtime cat map |
| **Recharts** | 2.15 | Admin analytics dashboards |
| **GSAP** | 3 | Counter animations, scroll-triggered effects |
| **Vanilla CSS** | — | Design tokens, glassmorphism, dark mode |

### Backend, Database & Storage
| Technology | Purpose |
|-----------|---------|
| **Supabase (PostgreSQL + PostGIS)** | Auth, database, storage, realtime |
| **Clerk** | Primary user identity + OAuth (Google, GitHub) |
| **Supabase AuthBridge** | Client component syncing Clerk sessions to Supabase |
| **Python FastAPI** | ML microservice for breed estimation |
| **Docker** | Containerized ML service deployment |
| **Railway / Render** | ML service hosting |
| **Vercel** | Next.js hosting with edge runtime |

---

## 🏗️ Architecture

```
Browser
  │
  ├── Next.js 16 App (Vercel Edge)
  │     ├── Server Components (RSC)   — DB reads, no hydration cost
  │     ├── Client Components          — Interactive UI, realtime
  │     ├── Server Actions             — Secure mutations (no exposed API)
  │     └── API Routes (/api/*)        — External proxies + GDPR
  │
  ├── Supabase (PostgreSQL + PostGIS)
  │     ├── Auth            — email/password + Google/GitHub + direct creds
  │     ├── Database        — cats, events, profiles, gamification (28 migrations)
  │     ├── Storage         — Cat photos (EXIF stripped before upload)
  │     └── Realtime        — Live cat sighting map + community chat
  │
  ├── Python FastAPI (Docker → Railway)
  │     └── /breed + /meow — HuggingFace inference (breed + mood)
  │
  └── External APIs (server-side proxied — never from browser)
        ├── Open-Meteo  → /api/weather
        ├── Catfact.ninja → /api/catfact
        └── Nominatim   → reverse geocoding (display only)
```

### Project Structure
```
MeowNet/
├── app/
│   ├── (app)/              # Auth-gated shell (force-dynamic)
│   │   ├── admin/          # Admin dashboard + RBAC controls
│   │   ├── cats/           # Cat logging, profiles, edits
│   │   ├── colonies/       # Stray cat colony management
│   │   ├── community/      # Public/private chat channels + DMs
│   │   ├── empire/         # Leaderboard, badges, gamification
│   │   ├── events/         # TNR event management
│   │   ├── map/            # Realtime Leaflet cat map
│   │   ├── moderator/      # Moderator dashboard + verification map
│   │   ├── notices/        # Targeted notices and announcements
│   │   ├── profile/        # Profile + GDPR account erasure
│   │   ├── reports/        # Field reports + cat fact bulletins
│   │   ├── safety/         # Colony safety guides
│   │   ├── stories/        # Cat success stories
│   │   └── weather/        # Feline weather safety watch
│   ├── api/
│   │   ├── ai/breed/       # ML breed estimation proxy
│   │   ├── ai/health/      # ML service warmup ping
│   │   ├── catfact/        # Cat fact API proxy
│   │   ├── privacy/        # GDPR cascading account deletion
│   │   └── weather/        # Open-Meteo server proxy
│   ├── auth/               # Login, signup, OAuth callback
│   └── rules/              # Community Rules & Regulations page
├── components/
│   ├── auth/AuthBridge/    # Clerk→Supabase session sync
│   ├── forms/ConsentGate/  # GDPR Article 6(1)(a) consent UI
│   ├── nav/Navbar/         # Dual auth-provider aware navbar
│   └── three/GlobeScene/   # Three.js + GLSL WebGL globe
├── docs/                   # Developer & judge documentation
├── lib/
│   ├── actions/            # Server Actions (admin, auth, cats, events)
│   ├── privacy/            # GDPR consent text (client-safe)
│   ├── security/           # EXIF stripping + sanitization
│   └── supabase/           # Browser + server Supabase clients
├── python-ml/              # FastAPI Docker service
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── main.py
└── supabase/
    ├── migrations/         # 0001–0042 applied migrations
    └── seed.sql
```

---

## 🔒 Security & Privacy

| Control | Implementation |
|---------|---------------|
| **EXIF Stripping** | `sharp` WASM strips GPS metadata client-side before any upload |
| **Location Fuzzing** | `ST_SnapToGrid(0.005°)` ≈ 500m grid in PostGIS — raw GPS never stored |
| **Auth Bridge** | Clerk sessions sync to Supabase; direct credential accounts isolated |
| **GDPR Erasure** | Cascade `DELETE` removes all user data + signs out all sessions |
| **Points Idempotency** | `action_key UNIQUE` in `point_log` — points awarded exactly once |
| **ML Auth** | `X-Service-Secret` header + slowapi rate limiting (10/min breed) |
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options in `next.config.ts` |
| **RLS** | Row-Level Security on every Supabase table — least privilege |
| **Admin Credentials** | Admin-created accounts use DB-enforced expiry + login usage limits |

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- Docker Desktop
- Supabase CLI

### Quickstart (5 commands)
```bash
git clone https://github.com/SynthReaper/MeowNet.git && cd MeowNet
npm install
cp .env.example .env.local          # Fill in your Supabase + Clerk keys
npx supabase db push                 # Apply all 33 migrations
npm run dev                          # Start at localhost:3000
```

### ML Service (Docker)
```bash
cd python-ml
docker-compose up                    # Starts FastAPI at localhost:8000
```

### QA Commands
```bash
npm run type-check    # TypeScript — 0 errors required
npm run lint          # ESLint
npm run build         # Production build
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [docs/HACKATHON.md](docs/HACKATHON.md) | **Start here** — Judge guide, demo walkthrough |
| [docs/architecture.md](docs/architecture.md) | System design, ADRs, data flow |
| [docs/database.md](docs/database.md) | 33 migrations, schema, RLS matrix |
| [docs/api.md](docs/api.md) | API route reference |
| [docs/security.md](docs/security.md) | Threat model, GDPR compliance |
| [docs/deployment.md](docs/deployment.md) | Vercel + Railway + Docker guide |
| [docs/weather.md](docs/weather.md) | Open-Meteo integration |

---

## 🙏 Acknowledgements

Created for **#hackthekitty 2026** 🐾 by [SynthReaper](https://github.com/SynthReaper).

- **Supabase** — Database, Auth, Storage, Realtime
- **Clerk** — User identity and OAuth
- **Three.js & GLSL** — Hardware-accelerated 3D globe
- **Leaflet** — Interactive map
- **HuggingFace** — AI breed image classification
- **Open-Meteo** — Weather forecasting API
- **Nominatim** — Privacy-respecting geocoder

---

*Every particle on that globe is a cat with a better life.* 🐾

---

**Author:** [SynthReaper](https://github.com/SynthReaper) · synthreaperx@gmail.com · **Version:** 0.4.0 · **License:** MIT

