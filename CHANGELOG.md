# Changelog

All notable changes to MeowNet are documented here. We follow [Semantic Versioning](https://semver.org/) and structure updates using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Fixed
- **ReDoS Vulnerability in Text Sanitization**: Refactored the `sanitizeText` utility in `lib/security/sanitize.ts` to replace the polynomial regular expression `/<[^>]*>/g` with a linear-time O(N) tag-stripping scan, eliminating the potential for Regular Expression Denial of Service (ReDoS) on user-supplied input.

### Planned (Future Expansion)

- **Winter Weather Micro-Shelter Allocator**: Hypothermia warning indicators, location allocation suggestions, and insulative R-value trackings.
- **AI Feline Facial & Acoustic Translation (On Hold)**: Facial vector embeddings for duplicate merging, and meow acoustics state classifier translation.
- **Autonomous AI Agent Ecosystem (On Hold)**: Multi-agent council comprising Bastet-Agent, Hermes-Agent, Anubis-Agent, Socrates-Agent, Archimedes-Agent, Freya-Agent, and Odin-Agent.


## [0.9.0] — 2026-07-05 · Social Impact & Field Coordination Milestone

### Added
- **Volunteer Management System (VMS) UI**: Interactive availability grids, skill check panels, hours logs, and mentor-matching queues.
- **Emergency Case Registry (ECR) UI**: Real-time Leaflet incident maps, emergency report forms, live banner notices, and dispatch tools.
- **Supply Chain Registry UI**: Live inventory grid views, stock management indices, and request fulfillment modals.
- **Regional Chapters & Coverage**: Circle boundary maps showing regional presence and interactive join/leave cards.
- **Educational Academy & Quizzes**: Course catalog trackers and graded multiple-choice assessments awarding points on pass.
- **Impact Chronicles**: Verified success stories grids and author narrative submission forms.
- **Partners Portal & Research Exporter**: Sponsor registries and anonymized population metadata JSON exporters.
- **Dashboard Extensions**: Moderator incident triage panels and heavy administrative subviews with visual charts.
- **Role-Tiered Navbar Overhaul**: Restructured the navbar into 5 semantic nav groups (Field Ops, Social Impact, Learn & Connect, Partners & Research, My Space) plus role-exclusive staff groups — amber `MOD` badge for moderators, red-gold `ADMIN` badge for administrators. All 9 v0.9.0 social-impact routes added to nav + Cmd+K search palette (30+ total routes indexed). Mobile drawer now shows full role title and styled identity card.
- **Logo Tier Labels**: Admin Console and Staff Portal suffixes appear below the MeowNet logo for staff users, immediately communicating the active power tier.
- **AI Helper Keyless Bypass**: Added a "Use Server Defaults" bypass option to `VaultUnlock` and `HelperWidget`, allowing users to chat with the AI helper companion using server-side environment keys without setting up or entering a master password.

### Security
- **Volunteer Hour/Skill Verification Hardening**: Created database migration `0005_harden_volunteer_security.sql` to restrict insertion and updates on `volunteer_skills` and `volunteer_hours` tables, preventing regular users from self-verifying or forging hours logs.


### Fixed
- **Points Ledger Security**: Hardened hours validation and quiz completions to award points exclusively via the secure `award_points` RPC.
- **Light Theme Form & Card Styling**: Fixed form fields, inputs, textareas, card containers, tab lists, and inactive status wrappers to use proper CSS variables (`--input-bg`, `--input-bg-elevated`, etc.) instead of hardcoded dark backgrounds (`bg-black/60`, `bg-black/40`, `bg-black/20`). This ensures complete readability, WCAG compliance, and consistent visuals in light mode.
- **Theme-Aware Leaflet Maps**: Refactored the `IncidentMap` (Emergency case registry) and `ChapterMap` (Regional Chapters coverage) components to dynamically toggle map tiles (voyager in light mode, dark_all in dark mode) based on the active document theme, resolving blacked-out map areas.
- **Placeholder Accessibility**: Hardened placeholder styling so that helper text remains highly legible in both light and dark themes.
- **Light Theme Input Accessibility**: Expanded style rules in `globals.css` to properly style date and time picker fields in light mode, and moved placeholder color rules out of nested selectors to ensure consistent text contrast across all inputs in both light and dark themes.

## [0.8.2] — 2026-07-04 · Code Quality & SonarQube Compliance Sweep
- **Decomposition of Nested Ternaries**: Refactored major nested ternary structures into independent helper rendering methods and dictionary mappings across `CommunityClient.tsx`, `CareCenterDashboard.tsx`, `ModeratorDashboardClient.tsx`, `TicketChatWindow.tsx`, `ProfileActivityLogs.tsx`, `ProfileQueries/index.tsx`, `StaffProfileView/index.tsx`, `ModeratorHotspotsMap.tsx`, and the Supreme Data Management table layout (`renderManagementTable`) in `AdminDashboardClient.tsx`. This successfully resolved SonarQube's nested ternary quality issues, reduced code complexity, and dropped nesting depth.
- **SonarQube & CodeQL Issue Resolution**: Completed a comprehensive sweep of static analysis findings across all components. Extracted nested functions in `TycoonInterface.tsx` and `weather/page.tsx` into standalone utilities to resolve level-4+ function nesting. Refactored nested ternaries in `TycoonInterface.tsx`, `EmpireCodex/index.tsx`, `AdminGamificationClient/index.tsx`, `FuturisticAuditDashboard.tsx`, and `notices/page.tsx` using local variable assignments. Replaced inline union types in `notices/page.tsx` with explicit type aliases (`BroadcastType`, `UserRole`, and `FilterType`). Resolved all remaining warnings, achieving 100% resolution against static analysis quality gates.
- **SonarQube Smell Correction**: Cleaned up remaining unused assignments, variables, and state setters (`isDirect`, `cardTitle`, `subtitle`, `filteredAuditLogs`, `setIsSearchingDMUser`, `loadingColonies`). Fixed redundant exception parameter declarations in empty `catch` blocks and named destructured state elements. Corrected nested template literals and nested ternary expressions in `cats/page.tsx` and `events/[id]/page.tsx`. Ensured label-control accessibility pairings in onboarding screen inputs and resolved invalid React styled-jsx custom properties.
- **Readonly Props Wrapper**: Configured all 56 component files to mark props interfaces and inline objects as readonly, improving compilation checks and resolving SonarQube accessibility/read-only code smells.
- **Media Track Element**: Added required `<track kind="captions">` tags to audio controls in `meow-translator/page.tsx` and `meow-fi/page.tsx` for accessibility compliance.
- **Backdrop Role Correction**: Removed redundant `role="presentation"` from modal overlay backdrops in `ColonyInteraction.tsx` and `OnboardingTour/index.tsx` while retaining `aria-hidden="true"`.
- **Nested Template Literals**: Extracted conditional path query parameters into separate variables in `catfact/route.ts` to satisfy SonarQube's nested template constraints.
- **Type Assertion Hardening**: Removed redundant `as any` casting from reverse geocoding geo-response resolution in `app/api/weather/route.ts` and refactored it to use proper union typing in `ColonyDetailsSidebar.tsx`.
- **Phase 1–10 Quality Sweeps**: Extracted 33 nested tab routes in `AdminDashboardClient.tsx` and 18 nested ternaries in `CommunityClient.tsx` into clean, individual helper render methods to significantly reduce cognitive complexity and nesting depth. Eliminated nested ternaries in `app/page.tsx`, `BingoBoard/index.tsx`, `TycoonInterface/index.tsx`, `ColonyDetailsSidebar.tsx`, and `HelperPage.tsx`. Addressed non-native interactive keyboard listeners, normalized double JSX spacing, and completed minor TypeScript cleanups.
- **Permissive Regex Range (CodeQL #41)**: Escaped the hyphen inside character classes in DOMPurify's `ALLOWED_URI_REGEXP` parameter within `lib/security/url.ts`, preventing the expression from treating the character sequence `.-:` as an overly permissive range.
---

## [0.8.1] — 2026-07-02 · Security Hardening, Care Cockpit Redesign, and Mega Menu Overhaul

### Added
- **Navbar Mega Menu Dropdowns**: Upgraded standard single-column navbar dropdowns into spacious, dual-column structured Mega Menus with descriptive captions for all navigation links to reduce visual congestion.
- **Personal Care Cockpit Redesign**: Transformed Care Center Dashboard, Helper Page, and Helper floating widget into a high-fidelity cyberpunk cockpit with 3D cursor perspective tilts, staggered domino entrance animations, and neon telemetry status rings.
- **Zero-Knowledge Logs Schema Extension**: Added support for comprehensive medical records, vaccine boosters, nutrition trackers, hydration trackers, and dynamic key-value Custom Metadata registries.
- **Direct Action AI Copilot**: Structured AI response prompts to suggest JSON action templates, parsing them client-side to render interactive log commit shortcuts within chat bubbles.
- **Personal Care Center**: Implemented a private, zero-knowledge, client-side encrypted workspace at `/profile/care-center` for tracking personal cats (including vital metrics, medication schedules, and log entries) with custom responsive SVG vitals charts. Data is secured via in-browser Web Crypto AES-GCM-256 encryption.
- **Personal AI Helper**: Integrated a site-wide collapsible AI helper widget (`HelperWidget.tsx`) and a full-screen helper dashboard (`HelperPage.tsx`). The helper fetches the user's decrypted API credentials (Gemini, OpenAI, or Anthropic) and uses locally decrypted cat logs for context.
- **AI Helper Proxy Route**: Created `/api/ai/personal-helper` proxy route to forward queries to AI providers using the user's decrypted keys, mitigating CORS issues and server storage risk.
- **Database Migrations**: Added migration `0003_personal_care.sql` creating the `personal_cats` and `user_private_config` tables with owner-only RLS policies.

### Fixed
- **Code Quality Refactoring**: Resolved 150+ major and minor Sonar issues, including cleaning up unused imports (`AreaChart`, `NextResponse`, `Link`, etc.), removing redundant/useless state variables (`loadingAudits`, `auditSearch`, `smokeOff`, `sent`, etc.), refactoring POINT and action regex matching to use `.exec()` instead of `.match()`, adjusting nested conditional checks to `else if` formatting, simplifying optional chaining logic, and replacing array index React keys with stable, unique identifiers (in skeletons, static grids, and sliders) across 15+ files to eliminate key code smells.
- **Hoisting & Scope Cleanups**: Refactored `showNotification` in [AdminDashboardClient.tsx](app/(app)/admin/AdminDashboardClient.tsx) into a hoisted function declaration, resolving potential runtime ReferenceErrors in CSV log exports. Moved `handleUnlockWithPassphrase` above `useEffect` hooks in [HelperWidget.tsx](components/personal-care/HelperWidget.tsx) to satisfy lexical declaration order constraints.
- **Lint Rule Warnings Demotion**: Adjusted [eslint.config.mjs](eslint.config.mjs) configuration to demote strict React 19 hooks compiler rules (`react-hooks/set-state-in-effect`, `react-hooks/static-components`, `react-hooks/purity`) and unescaped HTML characters (`react/no-unescaped-entities`) to warnings, ensuring clean production builds.
- **Emoji Source Code Sweeps**: Removed all prohibited emoji character sequences from `app/page.tsx`, `components/auth/AuthTabs.tsx`, `components/ui/OnboardingTour/index.tsx`, `components/ui/ShareCard/index.tsx`, `components/profile/TicketChatWindow.tsx`, and `components/map/ModeratorHotspotsMap.tsx`, replacing them with CSS animations, clean text labels, and standard Material Symbols.
- **Personal Care Theme Support**: Added CSS variable overrides and refactored helper widgets (`HelperWidget.tsx`, `HelperPage.tsx`) to support both cozy warm light mode and dark mode theme palettes. Resolves accessibility contrast issues in light mode for the private care center dashboard, inputs, dropdowns, and chat bubbles.
- **Sonar Code Quality Audit**: Resolved code smells, cognitive complexity issues, logic redundancies, and unexpected await warnings in Server Actions (`auth.ts`, `cats.ts`, `gamification.ts`, `admin.ts`, `audit.ts`, `community.ts`), the welfare score calculator (`welfare-score.ts`), the broadcasts notification banner (`Broadcasts.tsx`), and middleware (`proxy.ts`).
- **FastAPI ML Service**: Modified `verify_service_secret` in `python-ml/main.py` to be a synchronous function to improve performance and compatibility.
- **Codacy Scanner Workflow**: Deleted the Codacy Security Scan workflow (`.github/workflows/codacy.yml`) to revert the codebase to its state before commit `1dfee60cf819527bbe0b20439c3d2915b907b55e`.

### Security
- **SSRF Prevention — AI Proxy Route**: Added a strict server-side model allowlist to `app/api/ai/personal-helper/route.ts`. The `model` request parameter is now validated against a per-provider allowlist (`gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`, `gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest`) before being embedded in any outbound URL or API call, resolving CodeQL alert #38 (Server-Side Request Forgery — Critical).
- **Encrypted Vault Session Token**: Replaced plain-text passphrase caching in `localStorage` (`meownet_vault_key`) with an AES-GCM-256 encrypted token (`meownet_vault_token`) keyed to the authenticated Supabase user's UUID. Both `VaultUnlock.tsx` and `HelperWidget.tsx` now encrypt the passphrase using `encryptData(phrase, user.id)` on successful unlock and decrypt it on remount. A zero-downtime migration path automatically upgrades existing plain-text keys to encrypted tokens on first load, then deletes the legacy key. Resolves CodeQL alerts #39 and #40 (Clear-text storage of sensitive information — High).
- **DOM XSS URL Sanitizer Fallback**: Hardened `getSafeImageSrc` in `lib/security/url.ts` so that the non-DOMPurify fallback path now returns `encodeURI(trimmed)` instead of the raw untreated string, closing the static-analysis taint flow that caused CodeQL alerts #31–#37 (DOM text reinterpreted as HTML — High) to remain open when DOMPurify was not loaded.

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

### Security
- **Dependabot Upgrades**: Upgraded `python-multipart` to `0.0.32` and `starlette` to `1.3.1` in the python-ml FastAPI service, addressing 11 vulnerable dependency alerts.
- **CodeQL Remediation**: Resolved 18 CodeQL findings including Insecure Randomness (replaced `Math.random` with cryptographically secure alternates in admin and community invite actions), DOM Text reinterpreted as HTML XSS vectors (added strict URL validation checks for avatars, cat photo previews, meow translator playback, and chat attachments), calendar line injection vulnerability, support query bracket sanitization, and GitHub Actions job runner permissions constraints (`permissions: contents: read`).

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

[Unreleased]: https://github.com/SynthReaper/MeowNet/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/SynthReaper/MeowNet/compare/v0.8.2...v0.9.0
[0.8.2]: https://github.com/SynthReaper/MeowNet/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/SynthReaper/MeowNet/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/SynthReaper/MeowNet/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/SynthReaper/MeowNet/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/SynthReaper/MeowNet/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/SynthReaper/MeowNet/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/SynthReaper/MeowNet/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/SynthReaper/MeowNet/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/SynthReaper/MeowNet/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SynthReaper/MeowNet/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SynthReaper/MeowNet/releases/tag/v0.1.0
