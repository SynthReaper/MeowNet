# Changelog

All notable changes to MeowNet are documented here. We follow [Semantic Versioning](https://semver.org/) and structure updates using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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

[Unreleased]: https://github.com/SynthReaper/MeowNet/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/SynthReaper/MeowNet/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/SynthReaper/MeowNet/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SynthReaper/MeowNet/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SynthReaper/MeowNet/releases/tag/v0.1.0
