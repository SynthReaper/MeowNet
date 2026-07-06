# MeowNet — Full Product Pitch & Feature Reference
> **Version:** 0.9.0 · **Hackathon:** #hackthekitty 2026 · **Author:** [SynthReaper](https://github.com/SynthReaper)  
> **Live App:** [meownet-sr.vercel.app](https://meownet-sr.vercel.app/) · **Source:** [github.com/SynthReaper/MeowNet](https://github.com/SynthReaper/MeowNet)

---

## AGENT CONTEXT — HOW TO USE THIS DOCUMENT

This document is a comprehensive, self-contained reference for MeowNet. It is structured for AI agents (NotebookLM, presentation generators, slide builders, or pitch deck creators) to extract any needed information without additional research. Everything from the problem statement to every individual feature, the full tech stack, security architecture, database schema, and the people behind it is documented here. Use the section headers as slide titles or chapter anchors.

---

## PART 1 — THE PITCH

### The Problem: Urban Cat Crisis Is Invisible and Uncoordinated

Millions of stray cats live in cities worldwide. In most urban areas:

- Rescue volunteers rely on **WhatsApp groups, Excel spreadsheets, and paper logs** to coordinate
- Colony GPS locations shared in plain text **put vulnerable cats at risk** of targeted harm
- There is **no unified data layer** — one volunteer cannot see what another documented last week
- TNR (Trap-Neuter-Return) campaigns lose efficiency because **event coordination is fragmented**
- Individual volunteers burn out with **no recognition, no progress tracking, and no community**
- Welfare organizations cannot access aggregated data to **prove impact to funders**

The result: cats suffer, volunteers quit, and funding dries up because impact cannot be measured.

---

### The Solution: MeowNet

MeowNet is a **full-stack, privacy-first, gamified urban cat rescue platform** that transforms fragmented rescue operations into a coordinated, data-driven, community-powered mission.

**In one sentence:** MeowNet gives every rescue volunteer a professional-grade operations platform in their pocket — and gives the cats a fighting chance.

---

### Why MeowNet Wins

| Dimension | Traditional Tools | MeowNet |
|-----------|------------------|---------|
| Coordination | WhatsApp, spreadsheets | Unified platform: map, events, chat, notices |
| Privacy | GPS in plain text | PostGIS 500m fuzzing, EXIF stripping |
| Engagement | No rewards | Empire Points, leaderboards, badges, guilds |
| Data | Siloed and lost | Centralized, anonymized, exportable for research |
| Accountability | Word of mouth | Cryptographic volunteer certificates |
| AI | None | Breed estimation, mood classifier, personal AI copilot |
| Scale | Per-organization | Multi-organization with Regional Chapters |

---

### Impact Metrics MeowNet Enables

- Number of cats logged, sighted, and tracked over time
- TNR event attendance and completion rates
- Colony welfare scores trending over weeks and months
- Supply inventory utilization across organizations
- Volunteer hours contributed with verifiable audit trail
- Emergency incident response times
- Educational course completion rates per cohort
- Regional chapter growth and territory coverage

---

## PART 2 — FEATURE DEEP-DIVE

### Feature Group 1: Core Cat Operations

#### 1.1 Cat Logging System
**What it does:** Multi-step form for volunteers to register new cat sightings.

**Workflow:**
1. Volunteer opens "Log New Cat" form
2. Photo upload triggers client-side EXIF stripping (GPS metadata removed before transmission)
3. Optional GDPR consent gate unlocks AI breed estimation
4. AI breed estimator runs via secure server-side proxy to HuggingFace model
5. Volunteer completes TNR status, vaccination record, BCS (Body Condition Score), health flags
6. Location is captured but fuzzed to ~500m grid at database level (never stored precisely)
7. Cat Welfare Score (0–100) is calculated algorithmically on save
8. Empire Points awarded for the contribution (idempotent — no double-counting possible)

**Why it matters:** Creates a permanent, privacy-safe, welfare-scored record for every cat. Replaces paper logs and WhatsApp photos with a searchable, queryable database.

**Code:** `app/(app)/cats/new` · `lib/security/exif.ts` · `lib/welfare/welfare-score.ts`

---

#### 1.2 Cat Welfare Score Algorithm
**What it does:** Calculates a 0–100 welfare score for every logged cat using a weighted algorithm.

**Inputs:** TNR status, vaccination record, BCS rating (1–9 scale), health flags (injury, illness, behavior), caregiver assignment, last sighting recency.

**Why it matters:** Gives moderators and administrators a single number to triage the most vulnerable cats first. Enables welfare trend analytics over time.

**Code:** `lib/welfare/welfare-score.ts`

---

#### 1.3 Colony Management
**What it does:** Dedicated management interface for stray cat colonies — groups of cats in a defined territory.

**Features:** Colony registry, caregiver assignments, medical log history, community fund tracking, colony-level welfare aggregation.

**Code:** `app/(app)/colonies`

---

#### 1.4 Live Cat Map
**What it does:** Interactive Leaflet map showing all logged cat sightings and upcoming TNR events in real-time.

**Key privacy feature:** All cat markers are fuzzed to a ~500-metre grid. Exact GPS coordinates are **permanently discarded** at database write time — not just hidden from display.

**Features:**
- Point marker mode (individual sightings)
- Heatmap density toggle (high-activity area visualization)
- TNR event overlays
- Realtime updates via Supabase Realtime subscriptions
- Moderator view with inline status editing from map popups

**Code:** `app/(app)/map` · `components/map/CatMap/index.tsx`

---

#### 1.5 Field Reports
**What it does:** Volunteers submit structured field reports from colony visits — conditions observed, actions taken, photos.

**Code:** `app/(app)/reports`

---

#### 1.6 TNR Events
**What it does:** Full event management for Trap-Neuter-Return operations.

**Features:**
- Create TNR events with capacity limits, location, and date
- Volunteer sign-up with over-capacity prevention (DB-enforced trigger)
- Real-time capacity tracking
- Empire Points awarded for attendance

**Code:** `app/(app)/events`

---

### Feature Group 2: AI & Machine Learning

#### 2.1 AI Breed Estimator
**What it does:** Uploads a cat photo to a HuggingFace image classification model and returns a breed estimate with confidence score and veterinary disclaimer.

**Privacy pipeline:**
1. EXIF stripped client-side (GPS metadata removed before leaving the device)
2. GDPR consent gate — user must explicitly opt in before AI analysis
3. Request proxied through `/api/ai/breed` — browser never contacts ML service directly
4. `X-Service-Secret` header validates request at ML service
5. Rate limited at 10 requests/minute (slowapi)

**Why it matters:** Provides volunteer-usable AI insights without compromising privacy or bypassing consent requirements.

**Code:** `app/api/ai/breed` · `python-ml/main.py`

---

#### 2.2 Meow Mood Classifier
**What it does:** Analyzes cat vocalizations to classify emotional state — happy, distressed, hungry, playful, etc.

**Infrastructure:** Same Python FastAPI ML service as breed estimator. HuggingFace audio classification model.

**Code:** `app/api/ai/meow`

---

#### 2.3 Personal AI Copilot (Helper)
**What it does:** A full-screen AI assistant cockpit and collapsible floating widget that uses the volunteer's own API keys (Gemini, OpenAI, or Anthropic) to provide personalized cat care advice.

**Key features:**
- Volunteer supplies their own API key — stored encrypted client-side (AES-GCM-256), never on the server
- AI parses structured JSON action templates from its own responses
- Interactive "commit" buttons rendered inside chat bubbles allow one-click database record creation
- Keyless bypass mode — uses server defaults if user prefers not to manage their own key

**Why it matters:** Turns AI from a generic chatbot into a Direct Action Copilot that can log actual database records from a conversation.

**Code:** `components/personal-care/HelperPage.tsx` · `components/personal-care/HelperWidget.tsx` · `app/api/ai/personal-helper`

---

### Feature Group 3: Gamification & Community Engagement

#### 3.1 Empire Points System
**What it does:** A comprehensive reward system that awards points for every positive volunteer action.

**Point-earning actions:** Cat logging, TNR event attendance, daily trivia, bingo task completion, educational course completion, volunteer hours.

**Architecture:** Points awarded exclusively through the `award_points` PostgreSQL RPC (SECURITY DEFINER). The same `action_key` can never award points twice — idempotent by design.

**Code:** `app/(app)/empire` · `lib/actions/empire.ts`

---

#### 3.2 Live Leaderboard
**What it does:** Weekly Empire Points rankings updated in real-time. Auto-refreshes every 30 seconds.

**Privacy protection:** Proximity-sorted leaderboard data is processed server-side — coordinate details are **never sent to the client**.

---

#### 3.3 Impact Badges
**What it does:** Achievement badges unlocked based on cumulative point milestones and specific action types.

---

#### 3.4 Volunteer Guilds
**What it does:** Regional volunteer guilds for coordinated community action.

**Features:**
- Configurable Empire Points join threshold per guild
- Search by name, filter by category (TNR, Feeding, Medical, General), sort by points or member count
- Supabase Realtime keeps the guild list live for all viewers simultaneously

**Code:** `components/empire/GuildsInterface/index.tsx`

---

#### 3.5 Colony Tycoon (Idle Builder)
**What it does:** An offline idle progression game built into the Empire hub. Stray blessings accumulate in real-time while the user is away (capped at 24 hours). Claiming converts offline progress into Empire Points.

**Why it matters:** Maintains engagement even when volunteers are not actively using the platform.

**Code:** `components/empire/TycoonInterface/index.tsx`

---

#### 3.6 Daily Trivia
**What it does:** Admin-managed trivia question bank with daily educational rescue/TNR challenges. Answer streaks multiply rewards.

**Code:** `app/(app)/empire/trivia`

---

#### 3.7 Stray Bingo
**What it does:** Weekly quest bingo board. Admins define task templates. Volunteers complete bingo squares for point multipliers.

**Code:** `app/(app)/empire/bingo`

---

### Feature Group 4: Privacy & Zero-Knowledge Features

#### 4.1 Personal Care Center (Zero-Knowledge Vault)
**What it does:** A private, encrypted workspace for volunteers to track their own personal cats — completely hidden from the platform, MeowNet admins, and even the server.

**Encryption:** Web Crypto API AES-GCM-256 encryption, in-browser. Data stored as ciphertext in Supabase — decrypted locally only.

**Tracking includes:**
- Vital metrics and health logs
- Medication schedules and vaccine boosters
- Nutrition and hydration trackers
- Custom key-value metadata registry
- Chronological Care Ledger activity stream
- Dynamic safety alerts

**Design:** Cyberpunk cockpit aesthetic with 3D cursor perspective tilts, staggered domino entrance animations, neon telemetry status rings, and custom responsive SVG vitals charts.

**Key security:** If the user forgets their master password, data is permanently lost — no recovery path exists because no one else has the key.

**Code:** `app/(app)/profile/care-center` · `components/personal-care/CareCenterDashboard.tsx`

---

#### 4.2 Location Fuzzing (GPS Privacy)
**What it does:** All cat GPS coordinates are fuzzed to a ~500m grid at database INSERT time. Raw coordinates are permanently discarded — never stored, never accessible.

**Implementation:** A `BEFORE INSERT` PostgreSQL trigger applies `ST_SnapToGrid(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 0.005)`.

**Why it matters:** Exact colony locations enable targeted harm (poisoning, trapping). Fuzzing permanently removes this attack vector.

---

#### 4.3 EXIF Metadata Stripping
**What it does:** Strips all EXIF metadata (including GPS coordinates, device serial numbers, and timestamps) from photos before they leave the user's device.

**Implementation:** `sharp` WASM runs client-side. Supports JPEG, PNG, WebP, and AVIF with magic bytes verification.

**Why it matters:** Modern smartphone photos embed precise GPS coordinates. EXIF stripping ensures uploaded cat photos cannot be used to locate volunteers or precise colony positions.

---

#### 4.4 GDPR Compliance Suite
**What it does:** Full GDPR compliance implementation.

**Controls:**
- Article 6(1)(a) consent gate before AI analysis — stored in `user_consents` table with timestamp
- One-click GDPR erasure — cascading DELETE removes all user data and signs out all sessions
- `erasure_audit` table records SHA-256 hash of deleted user IDs for compliance proof
- Data retention logs

**Code:** `app/api/privacy/delete-account` · `lib/privacy/consent.ts`

---

### Feature Group 5: Social Impact & Coordination

#### 5.1 Volunteer Management System (VMS)
**What it does:** Full volunteer coordination hub for organizations managing multiple volunteers.

**Features:**
- Interactive availability grids showing volunteer time slots
- Skill check panels with multi-phase verification workflow
- Hours logs with audit trail
- Mentor-matching queues connecting experienced volunteers with newcomers
- Admin elevated management view at `/admin/volunteers`

**Code:** `app/(app)/volunteers`

---

#### 5.2 Emergency Response Registry
**What it does:** Real-time crisis coordination system for emergency incidents involving cats.

**Features:**
- Realtime Leaflet incident map — incidents appear live via Supabase Realtime
- Emergency report submission forms
- Live LIVE-badged pulsing notices in the navbar during active incidents
- Dispatch tools for coordinating response
- Staff-only internal tracking fields (dispatch notes, internal status) — hidden from volunteers

**Code:** `app/(app)/emergency`

---

#### 5.3 Supply Chain Registry
**What it does:** Live inventory management for food, medicine, and equipment across colonies and organizations.

**Features:**
- Grid views with current stock levels
- Request fulfillment modals
- Re-order threshold tracking
- Atomic `decrement_supply_quantity` RPC (prevents race conditions on concurrent requests)

**Code:** `app/(app)/supplies`

---

#### 5.4 Regional Chapters
**What it does:** Geographic chapter system for multi-region organizations.

**Features:**
- Circle boundary maps showing each chapter's territory
- Volunteers can browse, join, and leave chapters
- Admin chapter creation and management
- Chapter member list protected — only visible to members or staff

**Code:** `app/(app)/chapters`

---

#### 5.5 Impact Analytics
**What it does:** Recharts-powered welfare trend dashboards aggregating data from all volunteer activity.

**Visualizations:** Population welfare trends, sighting density charts, TNR completion rates, volunteer growth.

**Code:** `app/(app)/analytics`

---

#### 5.6 Educational Academy
**What it does:** Course catalog with graded multiple-choice assessments.

**Features:**
- Volunteers earn Empire Points on quiz pass
- Course completion tracked per user
- Unpublished courses hidden from non-staff
- Correct answers stripped from API responses for non-staff

**Code:** `app/(app)/education`

---

#### 5.7 Partner Network
**What it does:** Verified NGO and veterinary partner registry. Organizations register and join MeowNet's coalition network.

**Code:** `app/(app)/partners`

---

#### 5.8 Research Portal
**What it does:** Anonymized population metadata JSON exporter for academic and research purposes.

**Privacy guarantee:** Data is aggregated at colony level — no individual cat GPS coordinates are ever exported.

**Code:** `app/(app)/research`

---

#### 5.9 Cat Success Stories
**What it does:** Verified success story grid where volunteers submit narratives about cats they rescued or rehomed.

**Code:** `app/(app)/stories`

---

### Feature Group 6: Staff & Administration

#### 6.1 Admin Dashboard
**What it does:** Full administrative control center for platform management.

**Capabilities:**
- **Analytics** — Recharts visualizations of user growth, role distribution, database sizes
- **User Management** — Create direct-credential accounts with configurable expiry and usage limits, adjust Empire Points, promote/demote roles
- **Audit Logs** — Searchable immutable log of all administrative actions with dispute filing
- **System Settings** — Toggle maintenance mode, change point rewards, adjust weather safety thresholds — all live without redeployment
- **Supreme Management** — Direct CRUD access to all cats, colonies, events, and guilds
- **Live Activity Feed** — Supabase Realtime feed of sightings, chat posts, and TNR events as they happen
- **Gamification Management** — Trivia bank, bingo templates, guild management

**Code:** `app/(app)/admin`

---

#### 6.2 Moderator Dashboard
**What it does:** Dedicated workflow interface for community moderation.

**Capabilities:**
- Interactive Leaflet hotspot map with inline status editing
- Moderation queue with query escalation controls
- Volunteer application processing
- Skill verification queue

**Code:** `app/(app)/moderator`

---

#### 6.3 Three-Tier Support Query Escalation
**What it does:** Structured support system ensuring no query is silently dropped.

**Workflow:**
```
Volunteer raises query → status: open
  → Moderator reviews
       → Resolved: Moderator closes with resolution
       → Unresolved: Moderator escalates with written reason → status: escalated
            → Admin receives escalated query with moderator's reasoning
            → Admin resolves → status: resolved
```

**Why it matters:** Creates an auditable chain of responsibility. Every escalation documents the reason, preventing gaps in support coverage.

**Code:** `app/(app)/support` · `app/(app)/moderator`

---

#### 6.4 Targeted Broadcast System
**What it does:** Page-specific announcements delivered instantly via Supabase Realtime.

**Example:** A notice targeted to `/map` only appears on the map page — login warnings only appear on the login page.

**Implementation:** `target_page` column in `notices` table. Client component filters notices by current pathname using `usePathname()`.

**Code:** `components/ui/Broadcasts.tsx`

---

#### 6.5 Maintenance Mode
**What it does:** One-click site-wide maintenance gate with admin bypass.

**Implementation:** Toggle in System Settings. Middleware (`proxy.ts`) checks `maintenance_mode` system setting and redirects all non-admin visitors to `/maintenance`. Admins retain full access.

**Code:** `proxy.ts` · `app/maintenance`

---

#### 6.6 Cryptographic Certificate Verification
**What it does:** Verifiable volunteer impact certificates using stateless HMAC-SHA256 signatures.

**Workflow:**
1. Volunteer generates a certificate from their profile — includes cumulative impact stats
2. Server signs stats with HMAC-SHA256 using `SUPABASE_SERVICE_ROLE_KEY`
3. Anyone can visit `/verify` and paste the token to validate authenticity
4. Verification is **stateless** — no database lookup required, only server-side cryptographic comparison
5. Any tampered statistics produce a different hash and are rejected immediately

**Why it matters:** Volunteers can prove their rescue contributions to employers, NGOs, and grant bodies without relying on MeowNet being online.

**Code:** `app/(app)/profile/certificate` · `app/verify`

---

### Feature Group 7: Weather & Safety

#### 7.1 Feline Weather Safety Watch
**What it does:** Real-time weather-based safety alerts for outdoor community cats.

**Implementation:**
- Geolocation API detects user's position
- Weather data fetched from Open-Meteo via server-side proxy (`/api/weather`)
- Safety classifications calculated from temperature, apparent temperature, precipitation probability, and time of day
- Configurable thresholds stored in `system_settings` (changeable without redeployment)
- Batch mode fetches weather for multiple districts in parallel (`Promise.all`)

**Why it never fails:** Open-Meteo is fetched server-side. Browser ad-blockers and privacy extensions that block third-party API calls cannot interfere.

**Code:** `app/(app)/weather` · `app/api/weather`

---

#### 7.2 Interactive 3D Cat Companion
**What it does:** A WebGL 3D cat companion on the landing page that dynamically responds to local weather and user interaction.

**Behaviors:**
- Shivers when local temperature is dangerously cold
- Breathes slowly during sleep cycles (simulated based on time of day)
- Tracks cursor dynamically with eye movement
- Interactive laser play (click to activate)
- Petting spawns floating 3D hearts

**Technology:** React Three Fiber + Three.js + GSAP counter animations.

**Why it matters:** Creates an immediate emotional connection and demonstrates the platform's technical quality at first glance.

**Code:** `components/ui/InteractiveCat`

---

### Feature Group 8: Community

#### 8.1 Community Chat
**What it does:** Real-time public and private channel messaging with direct messaging.

**Features:**
- Public and private channels
- Direct messaging between users
- Message soft-delete (removes content, preserves edit history)
- Edit audit log for moderation
- GIF search powered by server-side Tenor proxy (never browser-direct)

**Code:** `app/(app)/community`

---

#### 8.2 Notice Board
**What it does:** Volunteer-facing targeted announcement board for community notices distinct from admin broadcasts.

**Code:** `app/(app)/notices`

---

#### 8.3 Colony Safety Guides
**What it does:** Staff-curated educational content library on colony safety best practices.

**Code:** `app/(app)/safety`

---

### Feature Group 9: User Profile & Identity

#### 9.1 User Profile
**What it does:** Volunteer profile with activity logs, earned badges, Empire Points history, and GDPR self-service.

**Features:**
- Activity history timeline
- Earned impact badges display
- Points leaderboard position
- One-click GDPR erasure with two-step confirmation

**Code:** `app/(app)/profile`

---

#### 9.2 Role-Tiered Navigation
**What it does:** Navbar that adapts dynamically to the authenticated user's role.

**Five semantic nav groups (all users):**
1. Field Ops — Map, Weather Watch, Colonies, Events, Reports
2. Social Impact — Volunteer Hub, Emergency Response, Supply Registry, Regional Chapters, Impact Analytics
3. Learn & Connect — Educational Academy, Community Forum, Success Stories, Safety Guides
4. Partners & Research — Partner Network, Research Portal
5. My Space — Profile, Care Center, AI Copilot, Certificates

**Staff-exclusive groups (appended at runtime by role):**
- Moderator Ops (amber MOD badge) — Moderator Dashboard, Support Queue
- Admin Command (red-gold ADMIN badge) — Admin Dashboard, User Management, System Settings

**Search:** Cmd+K / Ctrl+K command palette indexes all 30+ routes for instant navigation.

---

## PART 3 — TECHNOLOGY STACK

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16 (App Router) | Framework — RSC, Server Actions, API Routes, Edge Runtime |
| **React** | 19 | UI — transitions, optimistic UI, concurrent features |
| **TypeScript** | 5 strict | Full type safety — 0 type errors in production |
| **React Three Fiber** | 9 | 3D WebGL cat companion |
| **Three.js** | 0.184 | 3D scene, geometry, lighting |
| **Leaflet** | 1.9 | Interactive realtime maps |
| **Recharts** | 3.8 | Admin analytics dashboards |
| **GSAP** | 3.15 | Counter animations, scroll-triggered effects |
| **DOMPurify** | 3.4 | XSS sanitization for user-supplied URLs |
| **Zod** | 4.4 | Schema validation on all form inputs |
| **Vanilla CSS** | — | Design tokens, glassmorphism, dark/light mode |

### Backend, Database & Infrastructure

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | PostgreSQL + PostGIS | Auth, database, storage, realtime subscriptions |
| **Clerk** | 7.5 | Primary user identity + Google/GitHub OAuth |
| **Python FastAPI** | — | ML microservice for breed and mood estimation |
| **Docker** | — | Containerized ML service |
| **Render** | — | ML service hosting |
| **Vercel** | — | Next.js hosting with Edge Runtime |
| **HuggingFace** | — | AI model inference (breed classification, mood classification) |
| **Open-Meteo** | — | Weather API (proxied server-side) |
| **Nominatim** | — | Privacy-respecting reverse geocoding (display only) |
| **Tenor** | — | GIF search proxy for community chat |

### Security Libraries

| Library | Purpose |
|---------|---------|
| **sharp** | EXIF metadata stripping (WASM, client-side) |
| **Web Crypto API** | AES-GCM-256 + PBKDF2 for zero-knowledge encryption |
| **HMAC-SHA256** | Cryptographic certificate signing and verification |
| **gitleaks** | CI secret scanning (GitHub Actions) |
| **slowapi** | ML service rate limiting |
| **DOMPurify + encodeURI** | DOM XSS prevention for user-supplied URLs |

---

## PART 4 — ARCHITECTURE

### System Diagram

```
Browser
  │
  ├── Next.js 16 App Router (Vercel Edge)
  │     ├── Server Components (RSC)   — DB reads, zero hydration cost
  │     ├── Client Components          — Interactive UI, realtime subscriptions
  │     ├── Client-Side Cryptography   — AES-GCM-256 (Web Crypto API)
  │     ├── Server Actions (use server)— Secure form mutations, no API exposure
  │     └── API Routes (/api/*)        — External proxies + GDPR endpoint
  │
  ├── Supabase (PostgreSQL + PostGIS)
  │     ├── Auth     — email/password + Google/GitHub OAuth + direct credentials
  │     ├── Database — 10 migration files, 35+ tables
  │     ├── Storage  — Cat photos (EXIF stripped before write)
  │     ├── Realtime — Live cat map, chat, guilds, emergency incidents
  │     └── system_settings — Dynamic key-value configuration store
  │
  ├── Python FastAPI (Docker → Render)
  │     └── /breed + /meow — HuggingFace AI inference
  │
  └── External APIs (server-side only — never from browser)
        ├── Open-Meteo    → /api/weather (single + batch mode)
        ├── Catfact.ninja → /api/catfact (with local fallback)
        ├── Tenor GIF CDN → /api/tenor
        ├── AI Providers  → /api/ai/personal-helper (Gemini, OpenAI, Anthropic)
        └── Nominatim     → reverse geocoding (display only, client-side)
```

### Authentication Architecture

MeowNet runs two parallel authentication systems without conflict:

**Path 1 — Clerk Social Login (Volunteers)**
- Google or GitHub OAuth via Clerk
- `AuthBridge` server component syncs Clerk session into Supabase on every page load using HMAC
- Used by standard volunteers

**Path 2 — Database Direct Login (Staff/Judges)**
- Email + password directly against Supabase Auth
- No OTP, no email verification, no Clerk involvement
- Admin-created accounts with optional: `password_expires_at`, `max_usages`
- PostgreSQL trigger `on_auth_user_login` enforces both constraints server-side
- Auto-lock on expiry or usage limit reached

**AuthTabs Component:** A sliding pill-style segmented control on a single login card. `?method=db` URL parameter auto-selects Database Direct. Used on moderator-login and admin-login pages.

### Data Flow: Cat Logging

```
Volunteer fills LogCatForm
  → EXIF stripped client-side (sharp WASM — GPS permanently removed)
  → ConsentGate: GDPR consent checkpoint for AI (stored in user_consents)
  → Server Action: lib/actions/cats.ts
    → Upload photo to Supabase Storage (signed URL)
    → INSERT cats — ST_SnapToGrid trigger fuzz coordinates to 500m grid
    → award_points RPC (SECURITY DEFINER — idempotent, bypasses RLS safely)
  → Realtime broadcast to all subscribed CatMap clients
  → Landing page metrics updated
```

### Database Schema (35+ Tables)

**Core tables:**
- `profiles` — extends auth.users, role column, DB-enforced expiry
- `cats` — sighting logs with fuzzy geolocation (PostGIS)
- `tnr_events` + `event_signups` — TNR event management with capacity guard
- `colonies` — stray cat colony registry
- `point_log` — idempotent Empire Points ledger
- `badges` — badge definitions and earn tracking
- `community_messages` + `community_channels` — chat infrastructure
- `direct_messages` — private messaging
- `notices` — page-targeted broadcast board
- `guilds` + `guild_members` — volunteer guild system
- `trivia_questions` + `bingo_task_templates` — gamification content
- `system_settings` — live platform configuration
- `moderator_queries` + `query_messages` — three-tier support system
- `staff_audit_log` — immutable administrative action log
- `personal_cats` + `user_private_config` — zero-knowledge encrypted personal data
- `user_consents` + `erasure_audit` — GDPR compliance tables

**Materialized views:**
- `leaderboard_weekly` — weekly Empire Points rankings (refreshed by pg_cron)
- `impact_summary` — global rescue statistics

---

## PART 5 — SECURITY ARCHITECTURE

MeowNet applies a layered defense-in-depth model across four independent layers:

### Layer 1: Browser
- EXIF stripping (sharp WASM) — GPS metadata removed before any upload
- Client-side AES-GCM-256 encryption (Web Crypto API) for personal care data
- PBKDF2 with SHA-256 and random 16-byte salt, 100,000 iterations for key derivation
- Content Security Policy enforcement via HTTP headers
- No raw GPS coordinates ever transmitted

### Layer 2: Server
- `supabase.auth.getUser()` at top of every Server Action and API route — no exceptions
- Role re-read from DB (`profiles.role`) — no client JWT claims trusted
- Zod schema validation on all form inputs (cats, colonies, events, notices)
- `sanitizeText()` — linear O(N) HTML tag strip + entity encoding (immune to ReDoS)
- `getSafeImageSrc()` — DOMPurify + encodeURI fallback for user-supplied URLs
- MIME type allowlist on all community uploads
- UUID format guard on all admin delete/update operations
- `ALLOWED_SETTING_KEYS` allowlist for system settings mutations
- `ALLOWED_MODELS` allowlist on AI proxy — prevents SSRF via free-form model URLs
- All external APIs proxied server-side — browsers never contact external services directly
- `SUPABASE_SERVICE_ROLE_KEY` never included in client bundle

### Layer 3: Database
- Row-Level Security (RLS) on every single table — least privilege
- `SECURITY DEFINER` for privileged operations (Empire Points, account deletion)
- Location fuzzing `BEFORE INSERT` trigger — raw GPS permanently discarded
- `check_role_update` trigger — blocks self-escalation
- `on_auth_user_login` trigger — enforces expiry and usage limits
- `action_key UNIQUE` in `point_log` — double-awarding mathematically impossible
- CSV injection prevention (cell values starting with `=`, `+`, `-`, `@` prefixed with `'`)

### Layer 4: Infrastructure
- CSP, HSTS, `X-Frame-Options: SAMEORIGIN`, COOP, CORP headers (6+ in `next.config.ts`)
- `productionBrowserSourceMaps: false` — TypeScript not readable in DevTools
- `poweredByHeader: false` — hides `X-Powered-By: Next.js` fingerprint
- GitHub Actions gitleaks secret scan on every push
- Non-root Docker user for ML service
- ML service `X-Service-Secret` header — fails closed if secret not configured

### Security Audit
- Aikido Security automated audit completed — [security-audit-report.pdf](aikido-security-audit/security-audit-report.pdf)
- 637 SonarQube code smells, accessibility violations, and TypeScript warnings resolved
- CodeQL alerts #31–40 resolved (DOM XSS, SSRF, clear-text storage)

---

## PART 6 — GDPR & PRIVACY COMPLIANCE

| Requirement | Implementation |
|------------|----------------|
| **Lawful Basis (Article 6)** | Explicit consent gate before AI analysis. Stored with timestamp and consent text version. |
| **Right to Erasure (Article 17)** | One-click account deletion cascades all tables. SHA-256 hash logged in `erasure_audit`. |
| **Data Minimization** | GPS fuzzed at write time. EXIF stripped before upload. Location names not stored. |
| **Privacy by Design** | Zero-knowledge encryption for personal data. No server ever sees plaintext vault contents. |
| **Data Export** | Research portal exports anonymized, aggregated metadata only. No individual identifiers. |

---

## PART 7 — DESIGN PRINCIPLES

### Visual Design
- Dark and light mode with complete theme support (CSS custom properties throughout)
- Glassmorphism UI cards with backdrop blur
- GSAP scroll-triggered counter animations on landing page
- Cyberpunk cockpit aesthetic for the Personal Care Center
- Material Symbols icons throughout (no emoji in source code)
- Mega Menu dropdowns with dual-column structured navigation and descriptive captions

### Accessibility
- WCAG contrast compliance for both light and dark themes
- Proper ARIA labels on all interactive elements
- `<track kind="captions">` on all audio elements
- Placeholder text contrast hardened across all inputs
- Unique IDs on all interactive form controls

### Performance
- Next.js Server Components for DB reads — zero hydration cost on data pages
- ISR (Incremental Static Regeneration) on cat grid pages (300s cache)
- `@tanstack/react-virtual` for virtualized long lists
- Batch weather API calls with `Promise.all`
- `pg_cron` refreshes materialized views on a schedule (not at query time)

---

## PART 8 — DIFFERENTIATORS

### 1. Privacy-First by Architecture
Most platforms collect precise GPS and store it indefinitely. MeowNet's location fuzzing is implemented at the PostgreSQL trigger level — raw coordinates are discarded at write time, not just hidden at display time. This is not a UI feature. It is a database guarantee.

### 2. Dual Authentication for Different User Types
Volunteers use modern OAuth (Google, GitHub via Clerk). Staff and temporary accounts (field operatives, judges, event-specific logins) use Database Direct — email/password, no OTP, with PostgreSQL-enforced expiry and usage limits. Both paths work in parallel on the same platform.

### 3. Zero-Knowledge Personal Data
The Personal Care Center encrypts data client-side with a user-held password. Even if the Supabase database were compromised, personal cat logs and AI API keys would be inaccessible ciphertext. The server never sees plaintext.

### 4. AI That Commits Database Records
The Personal AI Copilot doesn't just answer questions. It parses structured JSON action templates from its own responses and renders interactive "commit" buttons inside chat bubbles. A conversation can directly result in a database log entry.

### 5. Stateless Cryptographic Certificates
Volunteer certificates are HMAC-SHA256 signed. Anyone can verify authenticity at `/verify` without a database lookup. Tampered statistics produce a different hash and are immediately rejected.

### 6. Gamification With Idempotent Safety
Empire Points are awarded through a `SECURITY DEFINER` RPC with a `UNIQUE` constraint on `action_key`. The same action mathematically cannot award points twice, regardless of network retries or race conditions.

### 7. Real-Time Without Polling
Map updates, chat messages, guild changes, emergency incidents, system settings, and broadcast notices all propagate via Supabase Realtime subscriptions. No polling loops anywhere in the codebase.

---

## PART 9 — FUTURE ROADMAP

| Feature | Status | Description |
|---------|--------|-------------|
| Winter Micro-Shelter Allocator | Planned | Hypothermia warning indicators, shelter allocation suggestions, insulative R-value tracking |
| AI Facial Recognition | On Hold | Facial vector embeddings for duplicate cat merging across volunteers |
| Meow Acoustic Translator | On Hold | Meow acoustics state classifier with natural language output |
| Autonomous AI Agent Ecosystem | On Hold | Multi-agent council: Bastet, Hermes, Anubis, Socrates, Archimedes, Freya, Odin |

---

## PART 10 — QUICK REFERENCE

### Live URLs
| Resource | URL |
|----------|-----|
| Production App | [meownet-sr.vercel.app](https://meownet-sr.vercel.app/) |
| ML Service | [meownet-ml.onrender.com](https://meownet-ml.onrender.com/) |
| GitHub Repository | [github.com/SynthReaper/MeowNet](https://github.com/SynthReaper/MeowNet) |

### Judge Credentials (Instant Access)
| Role | Email | Password |
|------|-------|----------|
| Volunteer | `judge-user@meownet.org` | `JudgeUser2026!` |
| Sub-Moderator | `judge-submod@meownet.org` | `JudgeSubMod2026!` |

**Recommended login method:** Visit [Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login) → scroll to pre-loaded credential cards → click any card → Sign In. No email verification required.

### Key Code Locations

| Feature | Code Location |
|---------|--------------|
| Interactive 3D Cat | `components/ui/InteractiveCat/index.tsx` |
| Cat Welfare Score | `lib/welfare/welfare-score.ts` |
| EXIF Stripping | `lib/security/exif.ts` |
| AES-GCM-256 Encryption | `lib/security/encryption.ts` |
| URL Sanitization | `lib/security/url.ts` |
| Text Sanitization | `lib/security/sanitize.ts` |
| Cat Map (Leaflet) | `components/map/CatMap/index.tsx` |
| Auth Sliding Toggle | `components/auth/AuthTabs.tsx` |
| Clerk-Supabase Bridge | `components/auth/AuthBridge/index.tsx` |
| Broadcast System | `components/ui/Broadcasts.tsx` |
| Volunteer Guilds | `components/empire/GuildsInterface/index.tsx` |
| Colony Tycoon | `components/empire/TycoonInterface/index.tsx` |
| Zero-Knowledge Cockpit | `components/personal-care/CareCenterDashboard.tsx` |
| AI Copilot Widget | `components/personal-care/HelperWidget.tsx` |
| AI Copilot Full Page | `components/personal-care/HelperPage.tsx` |
| System Settings | `lib/supabase/settings.ts` |
| Maintenance Middleware | `proxy.ts` |
| Certificate Generation | `app/(app)/profile/certificate/page.tsx` |
| Certificate Verification | `app/verify/volunteer/[id]/page.tsx` |
| Weather Proxy | `app/api/weather/route.ts` |
| AI Breed Proxy | `app/api/ai/breed/route.ts` |
| AI Personal Helper Proxy | `app/api/ai/personal-helper/route.ts` |
| Empire Actions | `lib/actions/empire.ts` |
| Admin Actions | `lib/actions/admin.ts` |
| ML Service | `python-ml/main.py` |
| Role-Tiered Navbar | `components/nav/Navbar/index.tsx` |

### Navigation Groups Reference

| Group | Visible To | Key Routes |
|-------|-----------|------------|
| Field Ops | All | Map, Weather, Colonies, Events, Reports |
| Social Impact | All | Volunteers, Emergency, Supplies, Chapters, Analytics |
| Learn & Connect | All | Academy, Community, Stories, Safety |
| Partners & Research | All | Partners, Research Portal |
| My Space | All | Profile, Care Center, AI Copilot, Certificates |
| Moderator Ops | Moderator + | Moderator Dashboard, Support Queue |
| Admin Command | Admin only | Admin Dashboard, User Management, System Settings |

---

## PART 11 — TECHNICAL QUALITY GATES

Every code change in MeowNet must pass:

```powershell
npm run type-check   # 0 TypeScript errors required
npm run lint         # ESLint clean
npm run build        # Production build must succeed
```

**Achieved standards:**
- TypeScript strict mode — 0 type errors
- 637 SonarQube issues resolved across v0.8.0–v0.9.0
- CodeQL alerts #31–#40 resolved (Critical/High severity)
- Aikido Security audit completed
- ReDoS vulnerability in text sanitization eliminated (O(N) linear scan)
- All prohibited patterns enforced: no emoji in source code, no raw GPS storage, no service_role key in client bundle, no plain-text passphrase in localStorage

---

## PART 12 — ABOUT THE PROJECT

**Project Name:** MeowNet  
**Hackathon:** #hackthekitty 2026  
**Version:** 0.9.0  
**Author:** [SynthReaper](https://github.com/SynthReaper) · synthreaperx@gmail.com  
**License:** MIT  
**Repository:** [github.com/SynthReaper/MeowNet](https://github.com/SynthReaper/MeowNet)

### Acknowledgements
- **Kiro AI** — Social Impact feature specification and modeling via .kiro spec files
- **Aikido Security** — Automated security audits and vulnerability scanning
- **Supabase** — Database, Auth, Storage, Realtime infrastructure
- **Clerk** — User identity and OAuth management
- **Leaflet** — Interactive mapping
- **HuggingFace** — AI breed and mood classification models
- **Open-Meteo** — Free, open weather API
- **Nominatim / OpenStreetMap** — Privacy-respecting reverse geocoding
- **Recharts** — Data visualization library
- **React Three Fiber / Three.js** — WebGL 3D cat companion
- **GSAP** — Animation library

---

*This document was generated from the MeowNet v0.9.0 source code and documentation on 2026-07-06. All feature descriptions, code locations, and security controls are verified against the actual implementation.*

*MeowNet — Built for #hackthekitty 2026 · by [SynthReaper](https://github.com/SynthReaper)*
