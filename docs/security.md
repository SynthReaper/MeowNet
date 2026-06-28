# MeowNet Security Documentation

> Last updated: 2026-06-27 · v0.4.0

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
                Service-secret header on ML proxy
                No secrets in client bundle
                External APIs proxied server-side only
─────────────────────────────────────────────────────
Database        Row-Level Security on every table
                SECURITY DEFINER for privileged ops
                Location fuzzing trigger (BEFORE INSERT)
                Role escalation prevention trigger
                Login expiry + usage limit enforcement
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

### T — Tampering

| Threat | Control |
|--------|---------|
| Cat location modified to expose exact colony GPS | Location fuzzing trigger fires `BEFORE INSERT` — exact coordinates never stored. |
| Points double-awarded via retry | `action_key UNIQUE` in `point_log` — `ON CONFLICT DO NOTHING`. |
| User upgrades own role | `check_role_update` trigger rejects self-escalation unless caller is `admin` or `service_role`. |
| EXIF GPS data in uploaded photos | `sharp` WASM strips all EXIF metadata client-side before upload. |

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

Set in `next.config.ts`:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data: blob:; connect-src *; font-src *; worker-src 'self' blob:;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Security Audits

An independent security audit was performed. The full report is available in the repository at [security-audit-report.pdf](../aikido-security-audit/security-audit-report.pdf).

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
