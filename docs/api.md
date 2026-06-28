# MeowNet API Reference

> Last updated: 2026-06-28 · v0.6.0

All API routes live under `app/api/`. Server Actions (in `lib/actions/`) are covered separately.

---

## Authentication

All API routes that mutate data require an authenticated Supabase session. The server obtains the session via `createServerClient()` which reads the Supabase cookie from the request.

```ts
// Standard pattern — used in every API route
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
```

---

## API Routes

### `GET /api/weather`

Server-side Open-Meteo proxy. Prevents browser extensions from blocking weather fetches.

#### Single Location
```
GET /api/weather?lat=40.75&lng=-73.99&city=New+York
```

**Response:**
```json
{
  "city": "New York",
  "temp": 22.1,
  "apparentTemp": 24.3,
  "humidity": 65,
  "precipProb": 10,
  "windSpeed": 12.4,
  "windDirection": 270,
  "condition": "Partly cloudy",
  "icon": "partly_cloudy_day",
  "isDay": true,
  "dailyHigh": 26.0,
  "dailyLow": 18.5
}
```

#### Batch Mode (up to 15 locations)
```
GET /api/weather?lats=40.80,40.75,40.73&lngs=-73.95,-73.99,-74.01
```

**Response:**
```json
{
  "results": [
    { "city": "District 1", "temp": 22.1, ... },
    { "city": "District 2", "temp": 21.8, ... }
  ]
}
```

---

### `POST /api/ai/breed`

Proxies to the Python FastAPI ML service for cat breed estimation.

**Request:** `multipart/form-data` with `image` file field.

**Headers:** Automatically adds `X-Service-Secret` for ML service auth.

**Response:**
```json
{
  "breed": "Maine Coon",
  "confidence": 0.87,
  "alternatives": ["Norwegian Forest Cat", "Siberian"],
  "VETERINARY_DISCLAIMER": "This is an AI estimate only and should not replace professional veterinary assessment."
}
```

**Errors:**
- `400` — No image provided
- `401` — GDPR consent not recorded for this user
- `502` — ML service unavailable (graceful fallback)

---

### `GET /api/ai/health`

Warmup ping to keep the ML service warm. Called on app initialization.

**Response:**
```json
{ "status": "ok", "model": "loaded" }
```

---

### `GET /api/catfact`

Server-side catfact.ninja proxy with local fallback pool.

#### Single fact
```
GET /api/catfact
```
**Response:** `{ "fact": "Cats sleep 12-16 hours per day." }`

#### Multiple facts
```
GET /api/catfact?count=5
```
**Response:** `{ "facts": ["...", "...", ...] }`

#### Breed database
```
GET /api/catfact/breeds
```
**Response:** Array of breed objects from catfact.ninja breeds endpoint.

---

### `POST /api/privacy/delete-account`

GDPR Article 17 cascading account deletion.

**Auth:** Requires the user to be signed in as the account being deleted.

**Response:**
```json
{ "success": true }
```

**Side effects:**
- Deletes auth.users row (cascades to all FK tables)
- Writes anonymized hash to `erasure_audit`
- Signs out all active sessions
- Removes Supabase Storage objects for the user

---

## Server Actions Reference

Server Actions in `lib/actions/` are called directly from Client Components — no explicit `fetch()` required.

### Auth Actions (`lib/actions/auth.ts`)

#### `syncSupabasePassword(clerkUserId: string): Promise<ActionResponse>`
Derives a deterministic Supabase password for a Clerk user and syncs their session. Tags the account with `clerk_synced: true` in user metadata.

---

### Admin Actions (`lib/actions/admin.ts`)

All admin actions verify `role === 'admin'` server-side before execution.

#### `adminCreateUser(email, displayName, role, customPassword?, expiryDate?, maxUsages?)`
Creates a direct Supabase Auth account (bypassing Clerk). Optionally sets custom password, account expiry, and login usage limit.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `email` | `string` | ✅ | |
| `displayName` | `string` | ✅ | |
| `role` | `'user'`\|`'moderator'`\|`'admin'` | ✅ | |
| `customPassword` | `string` | ❌ | Auto-generated if blank |
| `expiryDate` | `string` (ISO) | ❌ | Account locks after this time |
| `maxUsages` | `number` | ❌ | Account locks after N sign-ins |

#### `updateProfileByStaff(userId, updates, newPassword?)`
Admin update of any user profile field including password, expiry, and usage limits.

#### `updateUserRole(userId, role)`
Change a user's role. Enforced by `check_role_update` DB trigger.

#### `adjustUserPoints(userId, points)`
Award or deduct Empire Points. Can be negative for deductions.

#### `adminDeleteUser(userId)`
Hard delete a user account (same cascade as GDPR erasure).

#### `toggleProfileEnabled(userId, isEnabled)`
Suspend or unsuspend a user account.

#### `resolveModeratorApplication(applicationId, decision)`
Approve or reject a moderator application.

#### `logAuditAction(action, targetId?, details?)`
Write an entry to `staff_audit_log`.

#### `getUserActivitySummary(userId)`
Fetch a user's cat count, event signups, total points, and last activity date.

#### `getSystemSettings(): Promise<SystemSetting[]>`
Returns all rows from `public.system_settings`. Accessible by authenticated users; write operations are admin-only.

#### `updateSystemSetting(key, value): Promise<ActionResponse>`
Update a platform configuration setting. Admin-only.

| Parameter | Type | Notes |
|-----------|------|-------|
| `key` | `string` | **Must** be one of: `MAINTENANCE_MODE`, `TNR_POINTS_AWARDED`, `CAT_LOG_POINTS_AWARDED`, `WEATHER_WARNING_THRESHOLD`, `MAX_EMPIRE_LEADERBOARD_ENTRIES` |
| `value` | `boolean \| number \| string` | Narrowed from `any` — arbitrary types rejected |

> **Security:** Key validated against server-side `ALLOWED_SETTING_KEYS` Set before DB write. Unknown keys return `invalid_setting_key`.

#### `adminDeleteCat(catId: string): Promise<ActionResponse>`
Hard-delete a cat sighting. Admin-only. UUID format validated before DB call.

#### `adminUpdateCat(catId, updates): Promise<ActionResponse>`
Update any field on a cat record. Admin-only. Supports `name`, `status`, `health_notes`, `breed_estimate`.

#### `adminDeleteColony(colonyId: string): Promise<ActionResponse>`
Hard-delete a colony. Admin-only. UUID format validated.

#### `adminDeleteEvent(eventId: string): Promise<ActionResponse>`
Hard-delete a TNR event. Admin-only. UUID format validated.

#### `adminDeleteGuild(guildId: string): Promise<ActionResponse>`
Hard-delete a volunteer guild. Admin-only. UUID format validated.

> **Security (UUID guards):** All four delete actions validate the ID parameter against `/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i` before making any DB call. Malformed IDs return `invalid_id` immediately.

---

### Cat Actions (`lib/actions/cats.ts`)

#### `logCat(formData: FormData): Promise<ActionResponse>`
Upload cat photo (EXIF stripped), log sighting with fuzzy location, award points.

#### `updateCat(catId, updates): Promise<ActionResponse>`
Update a cat's status, notes, or health flags.

---

### Event Actions (`lib/actions/events.ts`)

#### `createEvent(formData: FormData): Promise<ActionResponse>`
Create a new TNR event (auth-gated, awards points on creation).

#### `signupForEvent(eventId: string): Promise<ActionResponse>`
Optimistic signup with capacity guard at DB level.

---

## Verification Registry Paths (v0.6.0)

### `GET /verify`
General public portal for searching and resolving cryptographic tokens or Proof of Neuter UUIDs.
- **Search Parameters:** `error` (optional: set to `invalid_token` if signature check fails)

### `GET /verify/volunteer/[id]`
Verifies and displays dynamic certifications (Volunteer/Staff) matching the computed HMAC signature.
- **Path Parameter:** `id` (The volunteer/staff user UUID)
- **Query Parameters:**
  - `cats`: Count of sightings (for volunteers) or resolved support queries (for staff)
  - `events`: Count of TNR signups (for volunteers) or audited actions (for staff)
  - `points`: Karma/XP points balance at the time of certificate creation
  - `sig`: HMAC-SHA256 signature generated by server using `SUPABASE_SERVICE_ROLE_KEY`

---

## Error Response Format

All API routes and Server Actions return consistent error shapes:

```ts
// API routes
{ error: string }  // with appropriate HTTP status

// Server Actions
{ success: false, error: string }
{ success: true, data?: T }
```

---

## Rate Limits

| Endpoint | Limit | Implementation |
|----------|-------|----------------|
| `POST /api/ai/breed` | 10 req/min per IP | slowapi in Python ML service |
| `POST /api/ai/meow` | 5 req/min per IP | slowapi in Python ML service |
| Weather API | None (server-side) | Open-Meteo fair use |
| All other routes | Vercel platform limits | — |
