# Changelog

All notable changes to MeowNet are documented here. We follow [Semantic Versioning](https://semver.org/) and structure updates using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned (Future Expansion)
- **Winter Weather Micro-Shelter Allocator**: Hypothermia warning indicators, location allocation suggestions, and insulative R-value trackings.
- **AI Feline Facial & Acoustic Translation (On Hold)**: Facial vector embeddings for duplicate merging, and meow acoustics state classifier translation.
- **Autonomous AI Agent Ecosystem (On Hold)**: Multi-agent council comprising Bastet-Agent, Hermes-Agent, Anubis-Agent, Socrates-Agent, Archimedes-Agent, Freya-Agent, and Odin-Agent.

---

## [0.8.0] — 2026-06-30 · Database Consolidation, Cat Welfare Score, Map Heatmap Toggle and Agent Version Bump

### Added
- **Cat Welfare Score Logic & Component**: Implemented dynamic Welfare Score calculator (`lib/welfare/welfare-score.ts`) that evaluates cat health (0-100) based on sterilized status, vaccinations, microchip, BCS rating, and health flags. Integrated a detailed progress-bar breakdown widget on the cat details profile page.
- **Leaflet Map Heatmap**: Added point marker vs. density heatmap layer toggles on Leaflet Mission Control Map page.

### Changed
- **Documentation Overhaul**: Complete rewrite of `README.md` and `docs/HACKATHON.md` for professional judge-ready presentation. README now features an HTML banner, clean feature table (emojis removed from table rows), and a structured judge credentials callout. HACKATHON.md is a full rewrite with a 60-second overview, numbered section headers, judge checklist scoring table, and a detailed architecture walkthrough. `AGENTS.md` (root and `.agents/`) updated with emoji-in-code prohibition, `npm run type-check` gate enforcement, and `lib/welfare/welfare-score.ts` + `/api/tenor` route additions.
- **Migration Consolidation**: Consolidated all 61 database migration files into `0001_extensions.sql` and `0002_production_schema.sql` for streamlined deployment, ensuring completely non-destructive migrations (`IF NOT EXISTS` syntax).
- **Agent Instructions Version Bump**: Updated root `AGENTS.md` and workspace `.agents/AGENTS.md` to `v0.8.0`, defining absolute prohibitions for `correct.sql`, homepage styling, and database safety rules.

### Fixed
- **Code Smells & Accessibility Compliance Audit**: Resolved 637 code smells, accessibility warnings, and strict typescript compilation errors across major components (`AdminDashboardClient.tsx`, `CommunityClient.tsx`, `EditCatForm/index.tsx`, `LogCatForm/index.tsx`, `StaffProfileView/index.tsx`, `Navbar/index.tsx`, `InteractiveCat.tsx`, etc.), improving code maintainability, markup semantics, and WAI-ARIA compliance.
- **Hydration Mismatch Fix**: Resolved page-load hydration discrepancy on the Landing Page by moving the client-only `sessionStorage` intro-loader trigger into a client-side `useEffect` hook.
- **Client Script Render Warning**: Prevented the "Encountered a script tag while rendering React component" React 19 console warning by converting the inline `beforeInteractive` theme script into a native `<script>` tag inside the `<head>` of the root layout.
- **Historical Timeline Status Fix**: Configured the "First Sighting Logged" event description to calculate and display the cat's original registration status (e.g. `tnr_needed`) dynamically when it is sterilized and updated to adoptable, ensuring the timeline doesn't overwrite historical facts.
- **Timeline Height Stretching Fix**: Applied `h-fit` class to the timeline container section, ensuring the element wrapper only spans its active items height and does not stretch down with empty white space.

---

## [0.7.0] — 2026-06-30 · Documentation Accuracy Pass, UI/UX Polish & Security Header Hardening

### Changed
- **Documentation Accuracy Pass**: Comprehensive audit of all docs against live codebase. Fixed `X-Frame-Options` value from `DENY` to `SAMEORIGIN` (the actual configured value in `next.config.ts`). Added all 6 previously undocumented security headers (`COOP`, `CORP`, `OAC`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`, `X-XSS-Protection: 0`).
- **Database Documentation**: Schema overview updated with 14 missing tables added in migrations 0043–0059 (`guilds`, `guild_members`, `guild_quests`, `bingo_tasks`, `bingo_task_templates`, `trivia_questions`, `colony_tycoon_sanctuaries`, `system_settings`, `medical_logs`, `proof_of_neuter`, `moderator_queries`, `query_messages`). Added `moderator_queries` and `system_settings` table schemas. Added `get_user_by_email` SECURITY DEFINER function entry.
- **Architecture Documentation**: Added Tenor GIF proxy (`/api/tenor`) to external API diagram. Corrected `X-Frame-Options` value and added source-map / powered-by header suppression notes.
- **API Reference**: Documented previously missing routes: `GET /api/ai/meow` (meow mood classifier) and `GET /api/tenor` (GIF search proxy). Updated rate limits table.
- **Deployment Documentation**: Updated migration count from 33 → 59 in `supabase db push` instructions. Added note that Vercel and Render use direct Git integration (no `deploy.yml` workflow file).
- **SETUP.md**: Migration count corrected (33 → 59). Removed stale reference to deleted `deploy.yml` workflow.
- **Source Map Hardening**: Documented `productionBrowserSourceMaps: false` and `poweredByHeader: false` in all relevant security sections.

### Security
- **Documentation Accuracy**: The previously documented `X-Frame-Options: DENY` was incorrect — the actual value is `SAMEORIGIN`, which allows Vercel preview embeds while still preventing third-party clickjacking. This was a documentation-only error; the code was always correct.

---

## [0.6.0] — 2026-06-28 · Cryptographic Verification Registry, Dynamic Staff Certificates, and Audit Log Dispute Panel

### Added
- **Dynamic Certificate Verification Portal** (`app/verify/page.tsx`): A general validation portal where anyone can verify certificates (Proof of Neuter UUID or Volunteer Impact Token) by entering their token ID.
- **Cryptographic Volunteer & Staff Verification** (`app/verify/volunteer/[id]/page.tsx`): Dynamic validation page for volunteer/staff certificates. Re-hashes query parameters (cats, events, points) server-side via HMAC-SHA256 signed by the `SUPABASE_SERVICE_ROLE_KEY` to verify record authenticity without database lookups.
- **Dynamic Staff Certificate Layouts**: The certificate page (`app/(app)/profile/certificate/page.tsx`) automatically adapts for moderators and admins. It changes headers to "Staff Impact Report" and showcases resolved support queries and audited actions instead of sightings/TNR stats.
- **Staff Certificate Navigation**: Added a direct access link to view certificates inside the header card of the staff profile view (`components/profile/StaffProfileView/index.tsx`).
- **Footer Verification link**: Inserted a "Verify Certificate" item under the Resources column in the global footer layout.
- **Unique UUID Indicators on Audit Logs**: The Timestamp column on `FuturisticAuditDashboard.tsx` renders short UUID badges of every log ID, supporting individual transaction tracing.
- **Realtime Audit Log Disputes Panel**: A cybernetic dispute pane integrated inside the audit logs dashboard drawer, backed by `raiseAuditLogDispute` server action, allowing moderators to raise questions on specific log IDs.

### Changed
- **Certificate Print Directives**: Configured print CSS media queries to set `size: landscape; margin: 0mm` and bound container layout to `100vw/100vh`, ensuring that certificates fit exactly on a single landscape sheet with pure white background.
- **Credentials Persistence**: Bypassed inefficient user listing page loops in Auth synchronizations (`lib/actions/auth.ts`) by introducing a database-native `SECURITY DEFINER` RPC helper `get_user_by_email` targeting isolated user record lookup.
- **Image Upload Allowlist**: Expanded the EXIF stripping validation (`lib/security/exif.ts`) to verify WebP files by parsing their magic bytes.

---

## [0.5.0] — 2026-06-28 · Supreme Admin Controls, Maintenance Mode & Dynamic Gamification

### Added
- **Maintenance Mode**: Full-site maintenance gate added. When enabled by an admin, all non-admin users are redirected to a beautiful `/maintenance` page featuring an animated sleeping cat SVG. Admins bypass the gate automatically and retain full site access.
- **Maintenance Page** (`app/maintenance/page.tsx`): Standalone static page with a paw-pattern background, custom SVG grooming cat illustration, animated decorative sparkles, and a "Refresh & Check Signals" button.
- **System Settings Database** (`supabase/migrations/0050_system_settings.sql`): Created `public.system_settings` key-value configuration store. Added Row-Level Security (RLS: admins write, authenticated read). Seeded initial settings: `MAINTENANCE_MODE`, `TNR_POINTS_AWARDED`, `CAT_LOG_POINTS_AWARDED`, `WEATHER_WARNING_THRESHOLD`, `MAX_EMPIRE_LEADERBOARD_ENTRIES`. Enabled realtime publication.
- **Settings Utility** (`lib/supabase/settings.ts`): Helper `getSystemSetting<T>(key, defaultValue)` for database-driven configuration lookup.
- **Dynamic Points Configurations**: Cat logging points (`cats.ts`) and TNR event attendance points (`events.ts`) now read from `system_settings` instead of hardcoded values.
- **Dynamic Weather Thresholds**: Feline Weather Watch (`app/(app)/weather/page.tsx`) queries `WEATHER_WARNING_THRESHOLD` from the database and subscribes to realtime updates — safety comfort levels recalculate instantly when the threshold is adjusted by an admin.
- **Admin Settings Tab** (Admin Dashboard): New interactive tab allowing admins to toggle boolean flags and adjust numeric platform parameters directly in the UI, backed by `updateSystemSetting` server action.
- **Admin Supreme Management Tab** (Admin Dashboard): New tab with tabular lists of Cats, Colonies, Events, and Guilds from the database. Admins can view, edit metadata, or hard-delete any entry via dedicated server actions (`adminDeleteCat`, `adminUpdateCat`, `adminDeleteColony`, `adminDeleteEvent`, `adminDeleteGuild`).
- **Admin Server Actions** (`lib/actions/admin.ts`): Added `getSystemSettings`, `updateSystemSetting`, `adminDeleteCat`, `adminUpdateCat`, `adminDeleteColony`, `adminDeleteEvent`, `adminDeleteGuild` — all gated to admin role.
- **Realtime Volunteer Guilds Portal**: Full Supabase Realtime subscriptions for `guilds`, `guild_members`, and `guild_quests` tables. Guild list reflects live state instantly without manual refresh.
- **Guild Realtime Publication** (`supabase/migrations/0049_enable_guild_realtime.sql`): Added `guilds`, `guild_members`, and `guild_quests` to Supabase realtime publication.
- **Guild Join Conditions** (`supabase/migrations/0048_guild_join_conditions.sql`): Added `min_points_required`, `category`, and `creator_id` columns to the guilds table. Join validation enforced in Server Actions.
- **Guild Search & Filters**: Name/description full-text search, category filter (TNR, Feeding, Medical, etc.), and multi-column sort within the guilds browser.
- **Global Rank Display**: Calculated Empire Points rank across all users shown on each guild card.
- **User Guild Creation**: Any authenticated volunteer can launch a new guild from the right-hand sidebar. Configurable category, description, and minimum join points required.
- **Admin Gamification Controls** (`admin/gamification`): Admin-only route with interfaces to create trivia questions, bingo templates, and manage guilds from a dedicated sub-dashboard.
- **Dynamic Trivia & Bingo** (`supabase/migrations/0044_admin_gamification_creation.sql`): `public.trivia_questions` and `public.bingo_task_templates` tables with admin-only write RLS and pre-seeded data.
- **Colony Tycoon Idle Engine** (`supabase/migrations/0046_tycoon_idle_progress_engine.sql`): `last_claimed_at` timestamp column. Offline points accumulate over time (capped at 24 hours), visualised with a live real-time counter in the tycoon interface.
- **Feline Empire Navbar Group**: Dedicated navigation section exposing all gamification routes (Empire Dashboard, Trivia, Bingo, Guilds, Colony Tycoon).

### Changed
- **Proxy Middleware** (`proxy.ts`): Integrated maintenance mode redirect logic. All non-bypass paths check `system_settings.MAINTENANCE_MODE` before continuing. Admin role bypasses the gate; all others redirect to `/maintenance`.
- **Migration Count**: All references updated to reflect 50 active migrations (0001–0050).
- **Guilds Fallback Removal**: Removed static mock fallback arrays in `app/(app)/empire/guilds/page.tsx`; all data sourced live from database.
- **AuthBridge Clerk Bypass** (`proxy.ts`): Added `/__clerk` to the maintenance bypass whitelist to prevent `unauthorized_clerk` errors during Clerk session sync and user onboarding.

### Fixed
- **JSX Ternary Parse Error** (`AdminDashboardClient.tsx` line 1831): Converted implicit `else` to explicit `activeTab === 'live' ? (…)` chain to resolve Turbopack JSX parsing failure.
- **Middleware Conflict**: Removed standalone `middleware.ts` file that conflicted with the existing `proxy.ts` (Next.js only permits one middleware entry point).
- **Guild UUID Seed** (`supabase/migrations/0045_user_guild_creation.sql`): Seeded guilds with valid static UUIDs to resolve `invalid input syntax for type uuid` cast error.
- **Search Panel Layout**: Replaced CSS Grid with Flexbox in the guilds filter panel to prevent text truncation and placeholder overflow across all viewports.
- **Dark Mode Readability**: Fixed `bg-white` containers replaced with translucent glassmorphic tokens across guild cards and search panels.

### Security
- **System Setting Key Allowlist** (`lib/actions/admin.ts`): `updateSystemSetting` now validates `key` against a strict Set of 5 known setting names before touching the database. Unknown keys are rejected with `invalid_setting_key`. Value type narrowed from `any` to `boolean | number | string`.
- **UUID Guards on Admin Delete Actions** (`lib/actions/admin.ts`): All four admin delete functions (`adminDeleteCat`, `adminDeleteColony`, `adminDeleteEvent`, `adminDeleteGuild`) now validate the `id` parameter against a UUID regex before any DB call, closing a potential IDOR vector via malformed IDs.
- **MIME Allowlist — Community File Upload** (`lib/actions/community.ts`): Server-side allowlist enforced before the file buffer is read. Only `image/*` (jpeg/png/gif/webp/avif), `video/mp4`, `video/webm`, `video/ogg`, and `application/pdf` are accepted. All other types return an error immediately.
- **MIME Allowlist — AI Breed Endpoint** (`app/api/ai/breed/route.ts`): Non-image MIME types are rejected with `HTTP 415` before forwarding to the Python ML service.
- **Three-Pass HTML Strip** (`lib/security/sanitize.ts`): `sanitizeText()` upgraded from single-pass to three-pass regex strip, closing the nested/malformed tag bypass (e.g. `<<script>script>`). Added `typeof` input guard and cleaned entity map.

---

## [0.4.1] — 2026-06-28 · Dependency Upgrades, Security Disclaimers & Gamification Foundations

### Added
- **Gamification Schemas**: Created migration `0043_upcoming_features_schemas.sql` defining database schemas, constraints, and Row-Level Security policies for upcoming features:
  - **Volunteer Guilds**: Tables for guilds, member rosters, and cooperative guild quests.
  - **Stray Bingo**: Table for tracking weekly bingo cards and completed tasks.
  - **Colony Tycoon**: Tables for virtual sanctuaries and upgrade levels purchased using Empire Points.
  - **Winter Shelters**: Table for tracking insulation R-values and capacity limits.
  - **Daily Trivia**: Table for tracking streaks and overall trivia statistics.
- **Robust LICENSE with Custom Disclaimers**: Added a comprehensive `LICENSE` file containing the MIT License supplemented with specific liability disclaimers for physical TNR safety, geofuzzing location privacy, AI vet diagnosis, and GDPR erasure backup latency.
- **Targeted Security Audit Document**: Relocated and integrated the Aikido security report under `aikido-security-audit/security-audit-report.pdf` and linked it directly in `README.md` and `docs/security.md`.
- **Plans & Ideas Catalog**: Added `plans/ideas.md` containing conceptual designs for multi-agent councils (Bastet, Hermes, Anubis, Socrates, Archimedes, Freya, Odin), territory coverage heatmaps, and CV ear-notch verifiers.

### Changed
- **Direct Git Deployments**: Deleted redundant `.github/workflows/deploy.yml` and updated `docs/deployment.md` to reflect Vercel (Next.js) and Render (Python ML) direct Git repository integration triggers.
- **Normalized Migration Audits**: Updated `docs/database.md` to document migrations `0034` through `0043` (detailing private channels, sub-moderator edit limits, recursion fixes, and gamification tables).

### Fixed
- **Credentials Persistence**: Added `persist-credentials: false` to all actions checkout steps in `.github/workflows/ci.yml` to prevent local GITHUB_TOKEN storage leakage.
- **Starlette / FastAPI Conflict**: Upgraded `starlette` to `1.0.1` and `fastapi` to `0.133.0` in `python-ml/requirements.txt` to patch CVE-2026-48710.
- **Clerk/Supabase Race Condition**: Patched session check logic in `JudgeWelcomePopup` (`components/ui/JudgeWelcomePopup/index.tsx`) to query Clerk session email first, preventing incorrect popups during account switching.

---

## [0.4.0] — 2026-06-27 · Auth Sliding Toggle, Query Escalation & Documentation

### Added
- **Sliding Auth Toggle (AuthTabs)**: New `components/auth/AuthTabs.tsx` segmented switcher replaces stacked login forms. Users slide between **Clerk Social** and **Database Direct** auth on a single card — no button-click page redirects.
- **Query Escalation Pipeline**: Volunteers can raise support queries. Moderators review them first; if a moderator cannot resolve an issue, they can escalate to admin with a written reason. Admins handle unresolved escalations.
- **OTP Warning Banner**: Added popup on `/auth/login` and `/auth/signup` informing users of the ~30% Clerk email verification failure rate (no custom domain) and directing them to social login or Database Direct.
- **Author Metadata**: Added `author`, `version`, `description`, `repository`, `keywords` fields to `package.json`. Added `LABEL` metadata to `python-ml/Dockerfile`.
- **Comprehensive Documentation Update**: Rewrote `docs/HACKATHON.md` for hackathon judges with plain-language feature descriptions, step-by-step login instructions, escalation flow, and architecture summary. Updated all docs timestamps to 2026-06-27.
- **Logo Image in Navbar**: Replaced SVG icon with `pet-logo.avif` in the navigation bar.

### Changed
- **Moderator Login**: Moderator and Admin login pages now default to the Database Direct tab without requiring any option selection. Simple login page (`/auth/login`) handles only Clerk auth.
- **Migration Count**: All references updated to reflect 42 active migrations (0001–0042).
- **Repository URLs**: Fixed typo `MeoNet` → `MeowNet` in README badge URLs, clone command, and CHANGELOG comparison links.

### Security
- **Clerk OTP Warning**: Users are now clearly informed on sign-in/sign-up pages that email verification may fail (~30%) due to absent custom domain. Google/GitHub OAuth and Database Direct are presented as reliable alternatives.

---

## [0.3.0] — 2026-06-27 · Analytics & Notice Board Routing

### Added
- **Admin Dashboard Visuals**: Added Recharts visualization components including area charts for registration growth, pie charts for role distribution, and a custom registry table mapping actual database size growth. Also added audit log search filters and CSV export tools.
- **Moderator Dashboard Map**: Integrated an interactive hotspots map using Leaflet. Added inline status editing via popups and visual utilization metrics showing moderation queues and capacity.
- **Dynamic Banners & Notice Board**: Created a custom notice router that maps notices to targeted pages (like `/auth/login` or `/map`) using Next.js `usePathname` and Supabase realtime subscriptions.

### Changed
- **Notice Component Mounting**: Moved the notice banner component from the authenticated layout to the root layout to allow displaying targeted announcements on public auth pages (like `/auth/login`).

### Fixed
- **Contrast & Z-Index Polish**: Fixed color contrast on Reset Counter buttons, resolved modal overlap layering issues on the admin profiles tab, and corrected notice list rendering fallbacks for direct Supabase auth sessions.

---

## [0.2.0] — 2026-06-26 · Admin Direct Credentials

### Added
- **Direct Database Auth for Admins**: Created a custom credential manager (using `adminCreateUser()`) enabling direct Supabase Auth users that bypass Clerk completely. Added database triggers that validate account expiration dates and count down login usage limits.
- **Bridge Support**: Modified the Clerk-to-Supabase synchronization bridge to recognize direct Supabase sessions and prevent signing them out when Clerk is inactive.
- **Navbar Integration**: Rebuilt the navigation bar to support and switch between Clerk and direct Supabase sessions.
- **Developer Documentation**: Drafted a comprehensive live testing walk-through guide for judges and set up local development compose configurations.

---

## [0.1.0] — 2026-06-25 · #hackthekitty 2026 Launch 🐾

### Added
- **Core Stack Setup**: Set up Next.js 16 App Router (Strict TS), Supabase with PostGIS spatial tracking, and Clerk primary authentication.
- **AI Breed Estimator**: Created a Dockerized Python FastAPI service calling HuggingFace models, with a GDPR-compliant consent gate.
- **Interactive Visuals**: Built a 3D WebGL globe with GLSL shaders mapping coordinates, and an interactive Leaflet map.
- **Feline Weather Watch**: Integrated Open-Meteo API proxies to display safety guidelines based on local weather conditions.
- **Security & Privacy Policies**: Configured PostGIS coordinate fuzzing (500m grid), RLS on all 20+ tables, EXIF metadata stripping, and explicit GDPR Article 17 cascading account deletions.

---

[Unreleased]: https://github.com/SynthReaper/MeowNet/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/SynthReaper/MeowNet/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/SynthReaper/MeowNet/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/SynthReaper/MeowNet/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/SynthReaper/MeowNet/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/SynthReaper/MeowNet/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/SynthReaper/MeowNet/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/SynthReaper/MeowNet/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SynthReaper/MeowNet/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SynthReaper/MeowNet/releases/tag/v0.1.0
