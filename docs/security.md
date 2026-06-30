# MeowNet Security Documentation

> Last updated: 2026-06-30 · v0.8.0

---

## Security Architecture

MeowNet applies a layered security model: browser, server, database, and infrastructure controls each provide independent defense-in-depth.

```
Layer           Control
─────────────────────────────────────────────────────
Browser         EXIF stripping (sharp WASM)
                No raw GPS transmitted
                Content Security Policy enforcement
─────────────────────────────────────────────────────
Server          Auth check on every API route + Server Action
                Role re-read from DB (no client-trusted claims)
                Zod schema validation on cats / colonies / events / notices
                sanitizeText() — 3-pass HTML strip + entity encoding
                sanitizeUrl() — http/https protocol allowlist
                MIME type allowlist on community uploads + AI breed route
                UUID format guard on all admin delete/update actions
                System setting key allowlist (5 known keys only)
                Service-secret header on ML proxy
                No secrets in client bundle
                External APIs proxied server-side only
─────────────────────────────────────────────────────
Database        Row-Level Security on every table (2 consolidated migrations)
                SECURITY DEFINER for privileged ops
                Location fuzzing trigger (BEFORE INSERT)
                Role escalation prevention trigger
                Login expiry + usage limit enforcement
                system_settings RLS (admin-write / authenticated-read)
─────────────────────────────────────────────────────
Infrastructure  CSP, HSTS, X-Frame-Options headers
                GitHub Actions secret scan (gitleaks)
                Non-root Docker user for ML service
                Vercel environment isolation
─────────────────────────────────────────────────────
```

---

## STRIDE Threat Model

### S — Spoofing

| Threat | Control |
|--------|---------|
| User impersonates another | Supabase JWT validated server-side on every request. RLS binds `auth.uid()` to rows. |
| Admin endpoint accessed by non-admin | Every Server Action re-reads `role` from DB — no client-trusted claims. |
| ML service called without authorization | `X-Service-Secret` header required; missing = 401. |
| Direct credential user forges sign-in count | `usages_count` incremented only by `SECURITY DEFINER` trigger — no client write path. |
| Crafted `key` param injected into `updateSystemSetting` | Server-side `ALLOWED_SETTING_KEYS` Set allowlist — only 5 known keys accepted; all others rejected. |

### T — Tampering

| Threat | Control |
|--------|---------|
| Cat location modified to expose exact colony GPS | Location fuzzing trigger fires `BEFORE INSERT` — exact coordinates never stored. |
| Points double-awarded via retry | `action_key UNIQUE` in `point_log` — `ON CONFLICT DO NOTHING`. |
| User upgrades own role | `check_role_update` trigger rejects self-escalation unless caller is `admin` or `service_role`. |
| EXIF GPS data in uploaded photos | `sharp` WASM strips all EXIF metadata client-side before upload. |
| Malicious file disguised as image in community upload | Server-side MIME allowlist rejects any type not in `{image/*, video/mp4, video/webm, video/ogg, application/pdf}` before buffer is read. |
| Admin delete called with non-UUID string (IDOR attempt) | UUID regex guard `/^[0-9a-f]{8}-…-[0-9a-f]{12}$/i` on all four admin delete functions — malformed IDs rejected before DB call. |

### R — Repudiation

| Threat | Control |
|--------|---------|
| Admin denies taking action | `staff_audit_log` records actor ID, action, target, and timestamp for every admin operation. |
| GDPR erasure not provable | `erasure_audit` writes SHA-256 hash of deleted user ID with timestamp. |
| AI consent not recorded | `user_consents` table with recorded_at + consent text version. |

### I — Information Disclosure

| Threat | Control |
|--------|---------|
| Cat colony exact GPS exposed | PostGIS `ST_SnapToGrid(0.005°)` fuzz → ≈500m radius uncertainty. |
| Camera/device metadata in photos | EXIF strip before Supabase Storage write. |
| Supabase service_role key in bundle | CI gitleaks scan; `SUPABASE_SERVICE_ROLE` never in `NEXT_PUBLIC_*`. |
| ML API key exposed in client | All ML calls proxied through `/api/ai/breed` — key is server env var only. |
| User data cross-contamination | RLS `WHERE user_id = auth.uid()` on all user data tables. |
| HTML tag injection through text fields | `sanitizeText()` applies 3-pass regex strip then HTML-encodes `< > & " ' \`` — nested/malformed tags neutralised. |

### D — Denial of Service

| Threat | Control |
|--------|---------|
| ML service flooded | slowapi rate limiter: 10/min breed, 5/min meow, per IP. |
| Weather API rate limit exceeded | Open-Meteo called server-side with batch mode (1 fetch for 5 locations). |
| Storage bucket flooded | Supabase Storage RLS: authenticated users only, file size limits. |
| Leaderboard hammered | Materialized view — refresh is async (pg_cron), not per-request. |

### E — Elevation of Privilege

| Threat | Control |
|--------|---------|
| User sets own role to admin | `check_role_update` DB trigger + Server Action role re-read. |
| Direct credential user bypasses expiry | `on_auth_user_login` DB trigger enforces `password_expires_at` and `max_usages` — no client bypass path. |
| Unauthenticated insert into cats | RLS: `USING (auth.uid() IS NOT NULL)` |
| Direct `point_log` INSERT from browser | RLS: `point_log` insert only via `service_role` (i.e., `award_points` RPC). |

---

## GDPR Compliance

MeowNet processes personal data under the following legal bases:

| Processing Activity | Legal Basis | Article |
|--------------------|-------------|---------|
| Account creation + auth | Legitimate interest (security) | Art. 6(1)(f) |
| Cat sighting GPS | Performance of contract (core feature) | Art. 6(1)(b) |
| AI breed estimation | Explicit consent | Art. 6(1)(a) |
| Email for notifications | Legitimate interest | Art. 6(1)(f) |
| Erasure audit hash | Legal obligation (compliance) | Art. 6(1)(c) |

### Right to Erasure (Article 17)

1. User clicks "Delete My Account" in `/profile`
2. Two-step confirmation modal prevents accidental deletion
3. `POST /api/privacy/delete-account` is called
4. Server calls `delete_user_account(userId)` — SECURITY DEFINER RPC
5. CASCADE DELETE removes: auth user, profile, cats, signups, point_log, consents, storage
6. Anonymized SHA-256 hash written to `erasure_audit` (no PII retained)
7. All active sessions signed out

### Consent Management

- `user_consents` table records every AI consent event
- Consent text is versioned in `lib/privacy/consent-text.ts`
- Declining consent shows manual form — AI endpoint is NOT called
- Consent can be withdrawn; subsequent AI calls require re-consent

---

## Admin Credential User Security Model

Admin-created direct credential users (v0.2.0) have additional security controls:

| Control | Implementation |
|---------|---------------|
| Password strength | Minimum 8 characters; auto-generated passwords use 32-char alphanumeric |
| Account expiry | `password_expires_at` in profiles; enforced by `on_auth_user_login` DB trigger |
| Login usage limit | `max_usages` in profiles; `usages_count` incremented by trigger; auto-lock on reach |
| Session isolation | No `clerk_synced` flag → AuthBridge does not force sign-out on Clerk events |
| Audit trail | Admin account creation logged to `staff_audit_log` via `logAuditAction` |
| No Clerk sync | These accounts exist only in `auth.users` — no Clerk user record created |

---

## Security Headers

All headers are set in `next.config.ts` via the `securityHeaders` array and applied to all routes via `/:path*`.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://fonts.googleapis.com;
  img-src 'self' data: blob: *.supabase.co https://img.clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://images.unsplash.com https://media.tenor.com https://*.tenor.com;
  connect-src 'self' *.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com;
  frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev;
  font-src 'self' https://fonts.gstatic.com;
  worker-src blob:;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'self';
  form-action 'self';

Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=(self)
X-DNS-Prefetch-Control: on
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0   ← intentionally disabled (modern browsers use CSP)
```

> **Note:** `productionBrowserSourceMaps: false` is set in `next.config.ts`. JavaScript source maps are **not** served in production, preventing attackers from reading original TypeScript source code in browser DevTools. The `poweredByHeader: false` flag also removes the `X-Powered-By: Next.js` header.

---

## Input Validation Hardening (v0.5.0)

The following hardening controls were added in the security audit pass of 2026-06-28:

### 1. System Setting Key Allowlist

**File:** `lib/actions/admin.ts` — `updateSystemSetting`

Only the following five keys are accepted. Any other key string is immediately rejected with `invalid_setting_key`:

```ts
const ALLOWED_SETTING_KEYS = new Set([
  'MAINTENANCE_MODE',
  'TNR_POINTS_AWARDED',
  'CAT_LOG_POINTS_AWARDED',
  'WEATHER_WARNING_THRESHOLD',
  'MAX_EMPIRE_LEADERBOARD_ENTRIES',
]);
```

The `value` parameter type was tightened from `any` to `boolean | number | string`.

### 2. UUID Format Guards on Admin Delete Actions

**Files:** `adminDeleteCat`, `adminDeleteColony`, `adminDeleteEvent`, `adminDeleteGuild` — all in `lib/actions/admin.ts`

All admin delete functions validate the ID parameter against a strict UUID regex before making any database call:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(id)) return { success: false, error: 'invalid_id' };
```

This prevents IDOR via crafted non-UUID strings or SQL-adjacent input.

### 3. MIME Type Allowlist — Community File Upload

**File:** `lib/actions/community.ts` — `uploadChatMedia`

Server-side allowlist enforced before the file buffer is allocated:

| Allowed MIME types |
|--------------------|
| `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/avif` |
| `video/mp4`, `video/webm`, `video/ogg` |
| `application/pdf` |

All other types → `{ success: false, error: 'File type not allowed' }`.

### 4. MIME Type Allowlist — AI Breed Endpoint

**File:** `app/api/ai/breed/route.ts`

Only image MIME types are forwarded to the ML service. Non-image uploads receive `HTTP 415 Unsupported Media Type`.

```ts
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
if (!ALLOWED_IMAGE_MIME.has(photo.type)) return NextResponse.json({ error: 'invalid_file_type' }, { status: 415 });
```

### 5. Three-Pass HTML Strip in `sanitizeText`

**File:** `lib/security/sanitize.ts`

Upgraded from a single-pass regex to a three-pass strip. This closes the nested/malformed tag injection vector:

```
// Single-pass result (vulnerable):
"<<script>script>alert(1)<</script>/script>" → "<script>alert(1)</script>"

// Three-pass result (safe):
"<<script>script>alert(1)<</script>/script>" → "alert(1)"
```

Entity encoding covers all six high-risk characters: `< > & " ' \``.

---

## Cryptographic Validation & Scalable Auth Sync (v0.6.0)

The following security architecture enhancements were added in version 0.6.0:

### 1. Zero-Database Cryptographic Verification
To ensure certificate validation is fast, tamper-proof, and scales infinitely, MeowNet employs a mathematical HMAC verification pattern. Instead of writing issued certificates to a database table and querying them:
- Volunteer and staff certificate metadata (User ID, Sightings, Ops, Points) is hashed on the server side using the SHA256 HMAC algorithm, signed by the server's private `SUPABASE_SERVICE_ROLE_KEY`.
- The short signature is displayed as the Cryptographic Verification Token on printed/digital certificates.
- The public `/verify` portal re-hashes the incoming query parameters with the secret key to confirm data integrity. If a user tries to alter their feline sightings or XP points, the signature validation fails immediately.

### 2. Isolated Auth Synchronization via SECURITY DEFINER Helper
To prevent the client application from listing other users' metadata during authentication sync runs, the codebase was updated to bypass PostgREST's internal schema isolation:
- Declared a database-native helper `get_user_by_email` in migration `0059` running as `SECURITY DEFINER` with search path configured to `public, auth`.
- This RPC queries and returns only the single matching target user object instead of exposing user listing capabilities to the client, preventing leakage.

### 3. WebP Image Format Upload Sanity Check
Expanded the EXIF tags validation engine (`lib/security/exif.ts`) to permit WebP image buffers. The engine validates the file header's magic bytes (checking for `RIFF` and `WEBP` headers) and passes the file safely to the EXIF sanitization wrapper, preventing format injection attempts.

---

## Security Audits

An independent automated security audit was performed via Aikido Security. The full report is available in the repository at [security-audit-report.pdf](../aikido-security-audit/security-audit-report.pdf).

An internal security audit was performed on 2026-06-28 (v0.6.0) covering XSS, SQL injection, CSRF, file upload injection, IDOR, auth bypass, and secret exposure. Six controls were added/updated as a result — see [Input Validation Hardening](#input-validation-hardening-v050) and [Cryptographic Validation & Scalable Auth Sync](#cryptographic-validation--scalable-auth-sync-v060) above.

A documentation accuracy pass was performed on 2026-06-30 (v0.7.0). All security header values were verified against `next.config.ts` and corrected (notably `X-Frame-Options: SAMEORIGIN`, not `DENY` as previously documented). Missing headers were added to the reference table.

An internal CodeQL & Dependabot vulnerability audit was performed on 2026-06-30 (v0.8.0). 29 findings were remediated:
- **Dependency Upgrades**: Upgraded `python-multipart` to `0.0.32` and `starlette` to `1.3.1` in the python-ml FastAPI service, resolving all 11 Dependabot high/medium vulnerabilities.
- **Insecure Randomness Mitigations**: Replaced insecure `Math.random()` usage with Node's cryptographically secure `crypto.getRandomValues()` and `crypto.randomUUID()` for security-sensitive areas (password fallback generation, username slugs, invitation codes, and fallbacks in weather endpoints).
- **URL Protocol Sanitization**: Implemented a global client/server-safe URL sanitizer `getSafeImageSrc` in `lib/security/url.ts` to mitigate XSS (DOM text reinterpreted as HTML) warnings on profile avatars, cat previews, translation audio playback, and chat attachment downloading.
- **ICS Line Injection Safeguards**: Added newline/CRLF stripping to events ICS invite generator, preventing potential calendar invite injection.
- **Support Query Parsing**: Replaced `.replace(']', '')` with a global regex replace `.replace(/]/g, '')` in moderator/admin dashboards to guarantee full sanitization of bracketed metadata.
- **CI Workflow Security**: Hardened GitHub Actions runners (`ci.yml`, `health.yml`) by declaring strict read-only execution permissions (`permissions: contents: read`) across all jobs.

---

## Vulnerability Disclosure

See [SECURITY.md](../SECURITY.md) at the root of the repository for the security policy, responsible disclosure process, and response timelines.

**Do not file GitHub Issues for security vulnerabilities.** Email the maintainer directly via the GitHub security advisory system.

---

## Known Limitations & Caveats

### Clerk Email Verification (No Custom Domain)

MeowNet's Clerk instance is not configured with a verified custom email domain. This means Clerk's email verification links (OTP codes, magic links) may be flagged as spam or fail to deliver in approximately **30% of cases**. This is a deployment constraint, not a security vulnerability.

**Mitigations available to users:**
- Use **Google or GitHub OAuth** (social login) — no email verification required
- Use the **Database Direct** tab on any login page — bypasses Clerk entirely
- Judges can use the pre-loaded credential cards on the [Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login)

**Impact:** Low (alternative auth paths are provided and prominently documented). No security data is at risk.

---

## Middleware, Optimization & Telemetry Audit Alignment

The following mappings outline how MeowNet aligns with essential middleware, performance optimization, and telemetry requirements within its Next.js App Router architecture:

### 1. Essential Security Middleware
* **Security Headers (Helmet equivalent):** Implemented natively in Next.js config via the `securityHeaders` declaration block in [next.config.ts](../next.config.ts). This enforces strict HTTP headers including a Content Security Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options (Clickjacking defense), X-Content-Type-Options (nosniff), and Referrer-Policy.
* **Rate Limiting:** Auth endpoints and direct login are rate-limited via Clerk and Supabase's built-in platform security controls. For heavy ML services, rate limiting is handled per-IP using FastAPI `slowapi` limits (10/min breed, 5/min meow) inside the FastAPI container.
* **DDoS Mitigation:** Handled at the infrastructure layer. All traffic to MeowNet passes through Vercel's Edge network, which filters malicious DDoS attacks and packet sniffing before hitting origin services.
* **Input Sanitization:** Neutralized across both the client and server:
  * Safe client-side HTML output rendering via `dompurify`.
  * Multi-pass HTML tag strip and entity encoding (`< > & " ' \``) via `sanitizeText` in [lib/security/sanitize.ts](../lib/security/sanitize.ts).
  * Strict schema parameter parsing on API routes and Server Actions using `zod`.
* **CORS Management:** Managed via Next.js config rules under `allowedOrigins` in [next.config.ts](../next.config.ts), restricting cross-origin requests to trusted domains.

### 2. Performance & Traffic Optimization
* **Payload Compression:** Next.js automatically applies Gzip and Brotli compression to static files and dynamic API responses at the edge.
* **HTTP/2 & HTTP/3 Protocols:** Enabled at the edge network layer via Vercel's global CDN and router infrastructure, allowing asset multiplexing over single TCP/UDP connections.
* **Caching Layers:** Avoids database load on heavy query surfaces (e.g., the Global Leaderboard) by computing statistics asynchronously and caching results through database Materialized Views and SWR stale-while-revalidate client caches.

### 3. Reliability, Logging, & Telemetry
* **Request Logging:** Telemetry streams, status codes, and endpoint execution times are captured by standard container stdout logs, Vercel logging integrations, and dedicated staff operations auditing logs (`staff_audit_log`).
* **Global Error Handlers:** Handled through Next.js global boundaries (`error.tsx`/`not-found.tsx`) and robust try-catch response structures in Server Actions to catch exceptions and conceal database schemas or stack traces from users.
* **Health Check Endpoints:** Exposed via the root health path [/health](../app/health/route.ts) returning `200 OK` with timestamp and uptime telemetry, alongside the target [/api/ai/health](../app/api/ai/health/route.ts) warmup route.

