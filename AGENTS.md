# Agent Instructions — MeowNet

> **Author:** SynthReaper · synthreaperx@gmail.com · https://github.com/SynthReaper
> **Project:** MeowNet — #hackthekitty 2026 · v0.8.0

## Package Manager
Use **npm**: `npm install`, `npm run dev`, `npm run build`, `npm run type-check`

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck single file | `npx tsc --noEmit path/to/file.ts` |
| Typecheck all | `npm run type-check` |
| Lint file | `npx eslint path/to/file.tsx` |
| Build | `npm run build` |
| Dev server | `npm run dev` |

## Project Structure
```
app/(app)/          → Auth-gated routes (force-dynamic)
  admin/            → Admin dashboard, RBAC, audit logs, credential manager
  cats/             → Browse, log, cat profiles
  colonies/         → Stray cat colony management
  community/        → Public/private chat channels + DMs
  empire/           → Leaderboard, badges, impact
  events/           → TNR event list, create, detail
  map/              → Leaflet realtime cat map
  moderator/        → Moderator dashboard, query escalation queue
  notices/          → Targeted notice board
  profile/          → User profile + GDPR deletion
  reports/          → Volunteer field reports
  safety/           → Colony safety guides
  stories/          → Cat success stories
  weather/          → Feline Weather Safety Watch
app/auth/           → Login, signup, callback (force-dynamic)
  login/            → Clerk social login (no direct-db option for volunteers)
  signup/           → Clerk social signup
  moderator-login/  → Staff login: BOTH Clerk + Database Direct (AuthTabs slider)
  admin-login/      → Admin login: BOTH Clerk + Database Direct (AuthTabs slider)
app/api/            → API routes
  ai/breed/         → ML proxy (breed estimation)
  ai/health/        → ML warmup ping
  privacy/delete-account/ → GDPR erasure
  weather/          → Open-Meteo server proxy (single + batch)
  catfact/          → Catfact.ninja proxy with local fallback
app/not-found.tsx   → Custom 404 cat page
components/         → UI components (client = 'use client', else server)
  auth/AuthTabs/    → Sliding segmented auth toggle (Clerk ↔ Database Direct)
  auth/AuthBridge/  → Clerk→Supabase session synchronization
  auth/AuthForm/    → Database Direct login form
lib/actions/        → Server Actions (always 'use server')
lib/privacy/consent-text.ts  → Client-safe copy (NO server imports)
lib/privacy/consent.ts       → Server-only GDPR functions
lib/supabase/server.ts       → Server client (next/headers — server only)
lib/supabase/client.ts       → Browser client (safe in client components)
supabase/migrations/         → 0001–0002, run in order
python-ml/                   → FastAPI ML service, separate deploy
docs/                        → Developer documentation
  HACKATHON.md               → Judge guide (start here!)
  architecture.md            → System design + ADRs
  database.md                → Schema + migrations
  api.md                     → API + Server Actions reference
  security.md                → STRIDE threat model + GDPR
  deployment.md              → Vercel + Railway + Docker
```

## Key Conventions
- **No `any` except `(supabase as any).rpc()`** for custom DB functions not in generated types
- **`as never`** for untyped Supabase table names, then cast result explicitly
- `force-dynamic` required on any layout/page that calls `supabase.auth.getUser()`
- Client components using Supabase → import from `@/lib/supabase/client`
- Server components / actions → import from `@/lib/supabase/server`
- EXIF stripping is mandatory before any photo upload — see `lib/security/exif.ts`
- Location fuzzing happens in DB via `ST_SnapToGrid(0.005°)` — do not store raw GPS
- Empire Points awarded via `award_points` RPC (SECURITY DEFINER) — never direct INSERT into `point_log`
- **Weather API calls** — NEVER fetch Open-Meteo directly from the browser; always use `/api/weather` proxy
- **SynthReaper links** — all footer "SynthReaper" text must link to `https://github.com/SynthReaper`
- **Auth pages** — `/auth/login` and `/auth/signup` handle Clerk only. `/auth/moderator-login` and `/auth/admin-login` use `AuthTabs` (both Clerk + Database Direct sliding toggle)

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
Volunteer → raises query (status: 'open')
Moderator → reviews; if unresolved, escalates with reason (status: 'escalated')
Admin     → resolves escalated queries
```

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
// ✅ Correct — server-side proxy
const res = await fetch('/api/weather?lat=40.75&lng=-73.99&city=New+York');

// ✅ Batch mode for multiple locations
const res = await fetch(`/api/weather?lats=${lats}&lngs=${lngs}`);

// ❌ Wrong — direct browser fetch intercepted by extensions
const res = await fetch('https://api.open-meteo.com/v1/forecast?...');
```

## Agent Roles
| Agent | Focus |
|-------|-------|
| Archimedes | Obsidian vault, docs, ADRs |
| Hermes | GraphQL / API schema |
| Bastet | Next.js, Three.js, Supabase, UI |
| Anubis | RLS, EXIF, GDPR, security |

## Contact
- **Email:** synthreaperx@gmail.com
- **GitHub:** https://github.com/SynthReaper
- **Project:** https://github.com/SynthReaper/MeowNet
