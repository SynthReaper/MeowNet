# Agent Instructions — MeowNet

> **Author:** SynthReaper · synthreaperx@gmail.com · https://github.com/SynthReaper
> **Project:** MeowNet — #hackthekitty 2026 · v0.8.0

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
app/(app)/          -> Auth-gated routes (force-dynamic)
  admin/            -> Admin dashboard, RBAC, audit logs, credential manager
  cats/             -> Browse, log, cat profiles
  colonies/         -> Stray cat colony management
  community/        -> Public/private chat channels + DMs
  empire/           -> Leaderboard, badges, guilds, trivia, bingo, tycoon
  events/           -> TNR event list, create, detail
  map/              -> Leaflet realtime cat map
  moderator/        -> Moderator dashboard, query escalation queue
  notices/          -> Targeted notice board
  profile/          -> User profile + GDPR deletion
  reports/          -> Volunteer field reports
  safety/           -> Colony safety guides
  stories/          -> Cat success stories
  weather/          -> Feline Weather Safety Watch

app/auth/           -> Login, signup, callback (force-dynamic)
  login/            -> Clerk social login (no direct-db option for volunteers)
  signup/           -> Clerk social signup
  moderator-login/  -> Staff login: BOTH Clerk + Database Direct (AuthTabs slider)
  admin-login/      -> Admin login: BOTH Clerk + Database Direct (AuthTabs slider)

app/api/            -> API routes
  ai/breed/         -> ML proxy (breed estimation)
  ai/meow/          -> ML proxy (meow mood classifier)
  ai/health/        -> ML warmup ping
  privacy/delete-account/ -> GDPR erasure
  weather/          -> Open-Meteo server proxy (single + batch)
  catfact/          -> Catfact.ninja proxy with local fallback
  tenor/            -> Tenor GIF search proxy

app/not-found.tsx   -> Custom 404 page
app/verify/         -> Public certificate verification portal

components/         -> UI components (client = 'use client', else server)
  auth/AuthTabs/    -> Sliding segmented auth toggle (Clerk <-> Database Direct)
  auth/AuthBridge/  -> Clerk->Supabase session synchronization
  auth/AuthForm/    -> Database Direct login form
  ui/InteractiveCat/-> Interactive SVG cat companion
  ui/Broadcasts.tsx -> Page-targeted notice broadcast system

lib/actions/        -> Server Actions (always 'use server')
lib/privacy/consent-text.ts  -> Client-safe copy (NO server imports)
lib/privacy/consent.ts       -> Server-only GDPR functions
lib/supabase/server.ts       -> Server client (next/headers -- server only)
lib/supabase/client.ts       -> Browser client (safe in client components)
lib/welfare/welfare-score.ts -> Cat welfare score algorithm (0-100)

supabase/migrations/         -> 0001-0002, run in order
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
// Correct -- server-side proxy
const res = await fetch('/api/weather?lat=40.75&lng=-73.99&city=New+York');

// Batch mode for multiple locations
const res = await fetch(`/api/weather?lats=${lats}&lngs=${lngs}`);

// Wrong -- direct browser fetch intercepted by extensions
const res = await fetch('https://api.open-meteo.com/v1/forecast?...');
```

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

---

## Agent Roles

| Agent | Focus |
|-------|-------|
| Bastet | Next.js, Three.js, Supabase, UI |
| Anubis | RLS, EXIF, GDPR, security |
| Hermes | GraphQL / API schema |
| Archimedes | Obsidian vault, docs, ADRs |

---

## Contact

- **Email:** synthreaperx@gmail.com
- **GitHub:** https://github.com/SynthReaper
- **Project:** https://github.com/SynthReaper/MeowNet
- **Version:** 0.8.0
