# Agent Instructions — MeowNet

> **Author:** SynthReaper · synthreaperx@gmail.com · https://github.com/SynthReaper
> **Project:** MeowNet — #hackthekitty 2026 · v0.9.0

---

## Package Manager

Use **npm** exclusively: `npm install`, `npm run dev`, `npm run build`, `npm run type-check`

Never use yarn, pnpm, or bun unless explicitly requested by the user.

---

## File-Scoped Commands

| Task | Command |
|------|---------|
| Typecheck single file | `npx tsc --noEmit path/to/file.ts` |
| Typecheck all | `npm run type-check` |
| Lint file | `npx eslint path/to/file.tsx` |
| Build | `npm run build` |
| Dev server | `npm run dev` |

---

## Project Structure

```
app/(app)/               -> Auth-gated routes (force-dynamic)
  admin/                 -> Admin dashboard, RBAC, audit logs, credential manager
  cats/                  -> Browse, log, cat profiles
  colonies/              -> Stray cat colony management
  community/             -> Public/private chat channels + DMs
  empire/                -> Leaderboard, badges, guilds, trivia, bingo, tycoon
  events/                -> TNR event list, create, detail
  map/                   -> Leaflet realtime cat map
  moderator/             -> Moderator dashboard, query escalation queue
  notices/               -> Targeted notice board
  personal-helper/       -> Full-screen Personal AI Helper console
  profile/               -> User profile + GDPR deletion
    care-center/         -> Private client-side encrypted Personal Care Center
  reports/               -> Volunteer field reports
  safety/                -> Colony safety guides
  stories/               -> Cat success stories
  weather/               -> Feline Weather Safety Watch
  volunteers/            -> Volunteer Management System (VMS) — availability, skills, mentoring
  emergency/             -> Emergency Case Registry — incident map, dispatch, crisis response
  supplies/              -> Supply Chain Registry — inventory grid, stock management, requests
  chapters/              -> Regional Chapters — territory boundary maps, join/leave
  analytics/             -> Impact Analytics — welfare trends, Recharts dashboards
  education/             -> Educational Academy — courses, graded quizzes, Empire Points on pass
  partners/              -> Partner Network — NGO & vet registry, coalition management
  research/              -> Research Portal — anonymized population metadata JSON exporter
  support/               -> Volunteer support query submission (raises to moderator queue)

app/auth/                -> Login, signup, callback (force-dynamic)
  login/                 -> Clerk social login (no direct-db option for volunteers)
  signup/                -> Clerk social signup
  moderator-login/       -> Staff login: BOTH Clerk + Database Direct (AuthTabs slider)
  admin-login/           -> Admin login: BOTH Clerk + Database Direct (AuthTabs slider)

app/api/                 -> API routes
  ai/breed/              -> ML proxy (breed estimation)
  ai/meow/               -> ML proxy (meow mood classifier)
  ai/health/             -> ML warmup ping
  ai/personal-helper/    -> Secure multi-provider AI chat proxy (model allowlist enforced)
  privacy/delete-account/ -> GDPR erasure
  weather/               -> Open-Meteo server proxy (single + batch)
  catfact/               -> Catfact.ninja proxy with local fallback
  tenor/                 -> Tenor GIF search proxy

app/not-found.tsx        -> Custom 404 page
app/verify/              -> Public certificate verification portal

components/              -> UI components (client = 'use client', else server)
  auth/AuthTabs/         -> Sliding segmented auth toggle (Clerk <-> Database Direct)
  auth/AuthBridge/       -> Clerk->Supabase session synchronization
  auth/AuthForm/         -> Database Direct login form
  personal-care/
    VaultUnlock.tsx      -> Passphrase gate — encrypts vault token to localStorage
    HelperWidget.tsx     -> Collapsible floating AI helper (auto-unlock from vault token)
    HelperPage.tsx       -> Full-screen AI helper console with lock handler
  ui/InteractiveCat/     -> Interactive SVG cat companion
  ui/Broadcasts.tsx      -> Page-targeted notice broadcast system

lib/actions/             -> Server Actions (always 'use server')
lib/privacy/consent-text.ts  -> Client-safe copy (NO server imports)
lib/privacy/consent.ts       -> Server-only GDPR functions
lib/security/
  encryption.ts          -> Web Crypto AES-GCM-256 encryptData / decryptData helpers
  exif.ts                -> EXIF strip (sharp WASM) — mandatory before photo upload
  sanitize.ts            -> sanitizeText() — 3-pass HTML strip + entity encoding
  url.ts                 -> getSafeImageSrc() — DOMPurify + encodeURI fallback
lib/supabase/server.ts       -> Server client (next/headers — server only)
lib/supabase/client.ts       -> Browser client (safe in client components)
lib/welfare/welfare-score.ts -> Cat welfare score algorithm (0-100)

supabase/migrations/         -> 0001-0003, run in order
python-ml/                   -> FastAPI ML service, separate deploy

docs/                        -> Developer documentation
  HACKATHON.md               -> Judge guide (start here)
  architecture.md            -> System design + ADRs
  database.md                -> Schema + migrations
  api.md                     -> API + Server Actions reference
  security.md                -> STRIDE threat model + GDPR
  deployment.md              -> Vercel + Render + Docker
```

---

## Key Conventions

- **No `any` except `(supabase as any).rpc()`** for custom DB functions not in generated types
- **`as never`** for untyped Supabase table names, then cast result explicitly
- `force-dynamic` required on any layout/page that calls `supabase.auth.getUser()`
- Client components using Supabase -> import from `@/lib/supabase/client`
- Server components / actions -> import from `@/lib/supabase/server`
- EXIF stripping is mandatory before any photo upload — see `lib/security/exif.ts`
- Location fuzzing happens in DB via `ST_SnapToGrid(0.005)` — do not store raw GPS
- Empire Points awarded via `award_points` RPC (SECURITY DEFINER) — never direct INSERT into `point_log`
- Weather API calls: NEVER fetch Open-Meteo directly from the browser; always use `/api/weather` proxy
- All footer "SynthReaper" text must link to `https://github.com/SynthReaper`
- Auth pages: `/auth/login` and `/auth/signup` handle Clerk only. `/auth/moderator-login` and `/auth/admin-login` use `AuthTabs` (both Clerk + Database Direct sliding toggle)
- Do not add emoji characters inside TypeScript/TSX source code, JSX comments, or inline code strings
- Run `npm run type-check` after every code change — 0 errors required before marking a task complete
- `decryptData()` returns `unknown` — always cast to the expected type: `as string`, `as PrivateConfig`, etc.

---

## Auth System Summary

### Two Parallel Auth Paths

1. **Clerk Social** — Google/GitHub OAuth for volunteers. Session synced to Supabase via HMAC bridge (`AuthBridge`).
2. **Database Direct** — email/password directly against Supabase Auth. Used by staff and judges. No OTP, no Clerk involvement.

### AuthTabs Sliding Toggle

- `components/auth/AuthTabs.tsx` — segmented slider between Clerk and Database Direct
- Auto-selects Database Direct tab when URL has `?method=db`
- Used by moderator-login and admin-login pages only

### Query Escalation Hierarchy

```
Volunteer -> raises query (status: open)
Moderator -> reviews
  -> if resolved: closes query
  -> if unresolved: escalates with written reason (status: escalated)
Admin -> resolves escalated queries (status: resolved)
```

---

## API Route Pattern

```ts
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // ...
}
```

## Server Action Pattern

```ts
'use server';
export async function myAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'unauthorized' };
  // ...
}
```

## Weather Proxy Pattern

```ts
// Correct — server-side proxy
const res = await fetch('/api/weather?lat=40.75&lng=-73.99&city=New+York');

// Batch mode for multiple locations
const res = await fetch(`/api/weather?lats=${lats}&lngs=${lngs}`);

// NEVER — direct browser fetch blocked by ad blockers
const res = await fetch('https://api.open-meteo.com/v1/forecast?...');
```

## AI Personal Helper Proxy Pattern

```ts
// Correct — use the secure server proxy with explicit provider + model
const res = await fetch('/api/ai/personal-helper', {
  method: 'POST',
  body: JSON.stringify({ apiKey, provider, model, messages }),
});

// Allowed models per provider (server enforces this allowlist):
// gemini:    gemini-2.5-flash | gemini-1.5-flash | gemini-1.5-pro
// openai:    gpt-4o | gpt-4o-mini
// anthropic: claude-3-5-sonnet-latest | claude-3-5-haiku-latest
```

## Vault / Zero-Knowledge Encryption Pattern

```ts
import { encryptData, decryptData } from '@/lib/security/encryption';

// On vault unlock — store encrypted passphrase, never plaintext
const encrypted = await encryptData(passphrase, user.id);
localStorage.setItem('meownet_vault_token', encrypted);
localStorage.removeItem('meownet_vault_key'); // remove legacy plaintext key

// On remount — auto-unlock by decrypting with user.id as the key
const token = localStorage.getItem('meownet_vault_token');
if (token) {
  const passphrase = await decryptData(token, user.id) as string;
  onUnlock(passphrase);
}

// On lock / logout — clear both keys
localStorage.removeItem('meownet_vault_token');
localStorage.removeItem('meownet_vault_key');
```

> **Never** store vault passphrases or API keys in localStorage as plaintext.
> **Never** log passphrases or keys to `console.*`.

---

## Security Gates (Non-Negotiable)

Before any code change is complete:

- `supabase.auth.getUser()` at top of every Server Action and API route
- Role read from DB (`profiles.role`) — never from client JWT claims
- EXIF stripped via `lib/security/exif.ts` before any photo upload
- `sanitizeText()` applied to all new user string inputs
- GPS not stored raw — DB trigger handles fuzzing
- Empire Points via `award_points` RPC only — no direct INSERT into `point_log`
- UUID params validated before DB calls
- No `SUPABASE_SERVICE_ROLE_KEY` in client bundles
- New system settings keys added to `ALLOWED_SETTING_KEYS` in `lib/actions/admin.ts`
- AI proxy `model` param validated against `ALLOWED_MODELS` allowlist — no free-form model URLs
- Vault passphrase never written to localStorage in plaintext — use `encryptData(phrase, user.id)`
- `getSafeImageSrc()` used for all user-supplied image URLs — never assign raw URL to `innerHTML` or `src` directly

---

## Verification Gates

```powershell
npm run type-check   # 0 errors required
npm run lint         # Review warnings
npm run build        # Must succeed
```

---

## Absolute Prohibitions

| Prohibited | Reason |
|-----------|--------|
| `any` type (except `(supabase as any).rpc()`) | TypeScript discipline |
| Raw GPS storage | Cat safety |
| Direct browser Open-Meteo calls | Blocked by ad blockers |
| `service_role` key in client bundles | Security |
| Local file paths in documentation | GitHub repo compatibility |
| Skipping EXIF strip before upload | GDPR / Privacy |
| Skipping post-task doc update | Documentation discipline |
| Destructive database migrations | Must not affect pre-existing data |
| Homepage CSS modifications | Must keep existing styling unchanged |
| Creating `correct.sql` | Prohibited file name |
| Emoji characters inside TSX/TS source code or JSX comments | Code quality / tooling compatibility |
| Skipping `npm run type-check` before marking task done | TypeScript discipline |
| Storing vault passphrase as plaintext in `localStorage` | Security — use AES-GCM-256 via `encryptData` |
| Free-form `model` param in AI proxy without allowlist check | SSRF prevention |
| Assigning raw user-supplied URLs to `innerHTML` or DOM `.src` | DOM XSS |

---

## MANDATORY: Post-Task Documentation Sync

After completing any task that changes source code, database schema, configuration, or security controls, update:

### Tier 1 — Always Update

| File | What to update |
|------|---------------|
| `CHANGELOG.md` | Add entry under [Unreleased] or bump version |
| `README.md` | Feature table, architecture diagram, migration count, version badge |

### Tier 2 — Update When Relevant

| File | When to update |
|------|---------------|
| `docs/api.md` | New or changed API routes / Server Actions |
| `docs/database.md` | New migrations, tables, columns, RLS changes |
| `docs/security.md` | New headers, new threat mitigations, audit dates |
| `docs/architecture.md` | New services, external APIs, ADRs |
| `docs/deployment.md` | Config changes, migration count, workflow changes |
| `docs/HACKATHON.md` | Major feature additions visible to judges |
| `SETUP.md` | Env var changes, CLI command changes |
| `SECURITY.md` | Supported version table when bumping version |

### Tier 3 — Update When Applicable

| File | When |
|------|------|
| `.github/PULL_REQUEST_TEMPLATE.md` | New security checklist items |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Version bump — update example version strings |
| `python-ml/README.md` | ML service changes |
| `app/globals.css` | Version comment block when bumping version |
| `app/(app)/admin/AdminDashboardClient.tsx` | Version watermark string when bumping version |

### Version Consistency Rule

When bumping the version, these files must ALL be updated atomically:

```
CHANGELOG.md          -> promote [Unreleased] to [X.Y.Z] + add comparison link
README.md             -> version badge
AGENTS.md             -> header + footer
.agents/AGENTS.md     -> header + footer
package.json          -> "version" field
package-lock.json     -> top-level "version" fields (x2, not node engine constraints)
SECURITY.md           -> supported versions table
docs/HACKATHON.md     -> header badge + footer credit
docs/api.md           -> Last updated header
docs/security.md      -> Last updated header
docs/architecture.md  -> Last updated header
docs/database.md      -> Last updated header
docs/deployment.md    -> Last updated header
app/globals.css       -> version comment
app/(app)/admin/AdminDashboardClient.tsx -> console watermark
.github/ISSUE_TEMPLATE/bug_report.md -> example version + feature gate note
```

### Documentation Update Rules

1. Read the actual source file before updating docs — never document assumptions.
2. Version strings must match across all files listed above.
3. Dates use `YYYY-MM-DD` format consistently.
4. Historical audit references (e.g., "audit performed on 2026-06-30 (v0.8.0)") are preserved — do not overwrite.
5. Node engine `>= X.Y.Z` constraints in `package-lock.json` third-party packages are NOT MeowNet version strings — leave them unchanged.

---

## Agent Roles

| Agent | Focus |
|-------|-------|
| Bastet | Next.js, Three.js, Supabase, UI |
| Anubis | RLS, EXIF, GDPR, security, vault encryption |
| Hermes | GraphQL / API schema, proxy routes |
| Archimedes | Obsidian vault, docs, ADRs, version sync |

---

## Contact

- **Email:** synthreaperx@gmail.com
- **GitHub:** https://github.com/SynthReaper
- **Project:** https://github.com/SynthReaper/MeowNet
- **Version:** 0.9.0
