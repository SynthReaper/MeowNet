# MeowNet Database Documentation

> Last updated: 2026-06-28 · v0.6.0 · Migrations: 0001–0059

---

## Schema Overview

```
public schema
├── profiles          — User profiles (extends auth.users)
├── cats              — Cat sighting logs with fuzzy geolocation
├── tnr_events        — Trap-Neuter-Return event listings
├── event_signups     — Volunteer sign-ups for TNR events
├── point_log         — Idempotent points transaction ledger
├── badges            — Badge definitions + user earn status
├── community_messages — Community chat messages
├── community_channels — Community chat channels
├── channel_members    — Chat channel participants
├── direct_messages    — Direct messages between users
├── user_notifications — User in-app notifications
├── caregivers        — Colony caregiver assignments
├── community_fund    — Colony community fund tracking
├── user_consents     — GDPR consent records (Article 6)
├── erasure_audit     — GDPR erasure compliance log (Article 17)
├── retention_log     — Data retention event log
├── moderator_applications — Moderator role applications
├── cat_reports       — Moderator report queue for cat content
├── staff_audit_log   — Admin + moderator action audit trail
├── safety_guides     — Stray colony safety guide content
└── safety_disputes   — User support dispute log associated with audit entries

Views (Materialized)
├── leaderboard_weekly  — Weekly Empire Points rankings
└── impact_summary      — Global cat rescue impact stats

Auth schema (Supabase managed)
└── auth.users         — Core identity (managed by Supabase/Clerk)
```

---

## Migration History

| # | File | Description |
|---|------|-------------|
| 0001 | `0001_extensions.sql` | PostGIS, pg_cron, pg_stat_statements |
| 0002 | `0002_profiles.sql` | Profiles table + auto-create trigger on auth.users insert |
| 0003 | `0003_cats.sql` | Cats table, GIST spatial index, 500m location fuzzing trigger |
| 0004 | `0004_events.sql` | TNR events, signups, over-capacity guard trigger |
| 0005 | `0005_gamification.sql` | point_log, badges, leaderboard_weekly materialized view |
| 0006 | `0006_impact.sql` | impact_summary materialized view |
| 0007 | `0007_rls.sql` | RLS policies on all tables (least privilege) |
| 0008 | `0008_security_definer.sql` | award_points, can_manage_event, delete_user_account RPCs |
| 0009 | `0009_cron.sql` | pg_cron: leaderboard refresh, weekly reset, audio purge |
| 0010 | `0010_gdpr.sql` | erasure_audit, retention_log, soft-delete pattern |
| 0011 | `0011_storage.sql` | Supabase Storage `meownet` bucket + RLS policies |
| 0012 | `0012_realtime.sql` | Realtime broadcast views + caregivers table |
| 0013 | `0013_caregivers.sql` | Caregiver user_id foreign key + community funds |
| 0014 | `0014_points_forfeiture.sql` | Points forfeiture trigger on account deletion |
| 0015 | `0015_profile_enhancements.sql` | bio, avatar_url, preferences columns |
| 0016 | `0016_rbac.sql` | RBAC role column + check_role_update trigger |
| 0017 | `0017_audit_log.sql` | staff_audit_log + logAuditAction SECURITY DEFINER |
| 0018 | `0018_moderator_applications.sql` | Moderator application + review system |
| 0019 | `0019_cat_reports.sql` | Cat content moderation report queue |
| 0020 | `0020_community_messages.sql` | Community chat table + RLS |
| 0021 | `0021_safety_guides.sql` | Colony safety guide content tables |
| 0022 | `0022_is_enabled.sql` | Profile suspension (`is_enabled` column + enforcement) |
| 0023 | `0023_consent_gate.sql` | user_consents with GDPR Article 6 metadata |
| 0024 | `0024_password_expires.sql` | password_expires_at column on profiles |
| 0025–0027 | Various | RLS refinements, index optimizations, enum additions |
| 0028 | `0028_custom_admin_users.sql` | max_usages, usages_count + on_auth_user_login trigger |
| 0029 | `0029_colonies.sql` | Colonies table, geographical points, caretakers, and RLS |
| 0030 | `0030_private_channels.sql` | Private chat channels, member mapping table, RLS isolation |
| 0031 | `0031_notice_board.sql` | notices table, triggers enforcing admin-only broadcasts |
| 0032 | `0032_notice_permissions_hardening.sql` | notices check function trigger extended to DELETE and UPDATE |
| 0033 | `0033_notice_target_page.sql` | target_page column added to notices to support target routing |
| 0034 | `0034_update_community_channels.sql` | Updates default community channel slugs and metadata |
| 0035 | `0035_mix_community_channels.sql` | Mixes both public and staff-only target community channel sets |
| 0036 | `0036_channels_policy_admin_only.sql` | Restricts public channel creation to Admins; others can create private channels |
| 0037 | `0037_sub_moderator_limits.sql` | Introduces sub_role and edits tracking columns, checks edit limit triggers |
| 0038 | `0038_sub_moderator_limits_expand.sql` | Expands sub-moderator edit limit checks to colonies and notices tables |
| 0039 | `0039_fix_channels_recursion.sql` | Helper bypass functions preventing RLS infinite recursion on channels and members |
| 0040 | `0040_update_max_edits_default.sql` | Updates sub-moderator max_edits default setting from 5 to 20 |
| 0041 | `0041_add_edited_at_to_dms.sql` | Adds edited_at column to direct_messages table for editing support |
| 0042 | `0042_add_rls_policies_for_dm_edits_deletes.sql` | RLS policies for updating, marking read, and deleting sent/received DMs |
| 0043 | `0043_upcoming_features_schemas.sql` | Foundation tables, RLS, and security policies for Guilds, Bingo, Tycoon, Winter Shelters, and Trivia |
| 0044 | `0044_admin_gamification_creation.sql` | Dynamic trivia questions, bingo templates tables + Admin-restricted RLS |
| 0045 | `0045_user_guild_creation.sql` | Allow authenticated users to insert guilds + Seed default guilds with valid UUIDs |
| 0046 | `0046_tycoon_idle_progress_engine.sql` | Add last_claimed_at timestamp column to colony_tycoon_sanctuaries for offline engine |
| 0047 | `0047_guild_quests_seed.sql` | Seeded initial default quests mapped to seeded guild UUIDs |
| 0048 | `0048_guild_join_conditions.sql` | Added min_points_required, category, and creator_id columns to guilds table |
| 0049 | `0049_enable_guild_realtime.sql` | Registered guilds, guild_members, and guild_quests in supabase_realtime publication |
| 0050 | `0050_system_settings.sql` | Created system_settings key-value config store, RLS (admin-write / authenticated-read), realtime publication, seeded initial settings |
| 0051 | `0051_medical_logs_and_features.sql` | Colony medical logs table, schemas, and RLS policies |
| 0052 | `0052_proof_of_neuter.sql` | Proof of neuter verification records, signature values, and RLS |
| 0053 | `0053_unify_audit_logs.sql` | Dropped old selection policies, updated staff_audit_logs RLS for roles |
| 0054 | `0054_query_chat_system.sql` | Realtime support ticket chat messages table and message length RLS constraints |
| 0055 | `0055_enable_realtime_queries.sql` | Registered moderator_queries in supabase_realtime publication |
| 0056 | `0056_auto_audit_logging.sql` | Auto audit triggers for cats, points, and support query logs |
| 0057 | `0057_realtime_replica_identity.sql` | REPLICA IDENTITY FULL configuration for moderator_queries |
| 0058 | `0058_auto_audit_profiles.sql` | Auto audit triggers for user role changes, suspends, and profile updates |
| 0059 | `0059_get_user_by_email.sql` | SECURITY DEFINER helper get_user_by_email to bypass internal auth schema constraints |

---

## Key Tables

### `public.profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | FK → `auth.users.id` (CASCADE DELETE) |
| `display_name` | `text` | |
| `role` | `text` | `'user'` \| `'moderator'` \| `'admin'` — default `'user'` |
| `empire_points` | `int` | Total earned points |
| `bio` | `text` | |
| `avatar_url` | `text` | Supabase Storage path |
| `preferred_role` | `text` | Volunteer specialty |
| `location_neighborhood` | `text` | Display-only neighborhood |
| `contact_phone` | `text` | Encrypted contact |
| `is_enabled` | `bool` | Default `true` — `false` = suspended |
| `password_expires_at` | `timestamptz` | Nullable — admin-set account expiry |
| `max_usages` | `int` | Nullable — max successful logins before lock |
| `usages_count` | `int` | Default `0` — incremented by DB trigger on sign-in |
| `sub_role` | `text` | `'sub_moderator'` \| `'full_moderator'` |
| `edits_count` | `int` | Default `0` — incremented on sub-moderator edits |
| `max_edits` | `int` | Default `20` — max allowed edits for sub-moderator |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `public.cats`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | Optional display name |
| `status` | `text` | `'stray'` \| `'adoptable'` \| `'tnr_needed'` \| `'tnr_done'` |
| `location` | `geography(Point, 4326)` | Fuzzy GPS — 500m grid |
| `photo_url` | `text` | Supabase Storage path (EXIF stripped) |
| `breed_estimate` | `text` | AI breed estimate (nullable) |
| `health_notes` | `text` | |
| `owner_id` | `uuid` | FK → profiles.id |
| `created_at` | `timestamptz` | |

### `public.tnr_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `title` | `text` | |
| `location` | `geography(Point, 4326)` | |
| `capacity` | `int` | Max volunteer slots |
| `organizer_id` | `uuid` | FK → profiles.id |
| `event_date` | `timestamptz` | |
| `created_at` | `timestamptz` | |

### `public.point_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → profiles.id |
| `action_type` | `text` | e.g. `'log_cat'`, `'join_event'` |
| `points` | `int` | Points awarded |
| `action_key` | `text` | **UNIQUE** — prevents double-awarding |
| `created_at` | `timestamptz` | |

### `public.colonies`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | Sighting colony name |
| `description` | `text` | Colony notes / care instructions |
| `location` | `geography(Point, 4326)` | Coordinates |
| `address_display` | `text` | Human-readable address |
| `caretaker_id` | `uuid` | FK → profiles.id |
| `population_estimate`| `int` | Default 0 |
| `tnr_count` | `int` | Number of cats neutered |
| `created_by` | `uuid` | FK → profiles.id |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `public.notices`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `title` | `text` | Title of notice |
| `content` | `text` | Body content |
| `created_by` | `uuid` | FK → profiles.id |
| `is_broadcast` | `bool` | Default `false` — banner alert |
| `broadcast_type` | `text` | `'info'` \| `'warning'` \| `'error'` \| `'success'` |
| `is_popup` | `bool` | Default `false` — modal alert |
| `target_page` | `text` | Default `'all'` — routing restriction |
| `expires_at` | `timestamptz` | Nullable |
| `active` | `bool` | Default `true` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `public.community_channels`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `slug` | `text` | **UNIQUE** |
| `name` | `text` | Display name |
| `description` | `text` | |
| `icon` | `text` | Material icon name |
| `is_private` | `bool` | Default `false` |
| `created_by` | `uuid` | FK → profiles.id |
| `invite_code` | `text` | **UNIQUE** |
| `is_archived` | `bool` | Default `false` |
| `created_at` | `timestamptz` | |

### `public.channel_members`

| Column | Type | Notes |
|--------|------|-------|
| `channel_id` | `uuid` | PK, FK → community_channels.id |
| `user_id` | `uuid` | PK, FK → profiles.id |
| `joined_at` | `timestamptz` | |

### `public.community_messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → auth.users.id |
| `channel_id` | `uuid` | FK → community_channels.id |
| `parent_id` | `uuid` | FK → community_messages.id (thread parent) |
| `message` | `text` | Max 2000 chars |
| `is_flagged` | `bool` | Default `false` |
| `edited_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | |

### `public.direct_messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `sender_id` | `uuid` | FK → profiles.id |
| `receiver_id` | `uuid` | FK → profiles.id |
| `message` | `text` | |
| `media_url` | `text` | Nullable |
| `media_type` | `text` | Nullable |
| `is_read` | `bool` | Default `false` |
| `edited_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | |

### `public.user_notifications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → profiles.id |
| `title` | `text` | |
| `message` | `text` | |
| `type` | `text` | e.g. `'chat_mention'`, `'private_message'` |
| `target_url` | `text` | Nullable |
| `is_read` | `bool` | Default `false` |
| `created_at` | `timestamptz` | |

---

## Security Functions (SECURITY DEFINER)

### `award_points(user_id, action_type, points, action_key)`
Awards Empire Points to a user. Runs as DB owner (bypasses RLS).
Idempotent: `INSERT ... ON CONFLICT (action_key) DO NOTHING`.

### `delete_user_account(user_id)`
GDPR Article 17 cascading deletion. Removes: auth user, profile, cats, event signups, point logs, consents, storage objects. Writes anonymized hash to `erasure_audit`. Only callable by the owning user or `service_role`.

### `logAuditAction(actor_id, action, target_id, details)`
Writes to `staff_audit_log`. SECURITY DEFINER so even non-admin callers can log their own actions under admin supervision.

### `is_channel_member(channel_id, user_id)`
Helper function to check if a user is a member of a channel. Bypasses RLS to prevent infinite recursion.

### `is_channel_creator(channel_id, user_id)`
Helper function to check if a user is the creator of a channel. Bypasses RLS to prevent infinite recursion.

---

## Row-Level Security Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | All authenticated | Own profile only | Own profile only | Via delete_user_account only |
| `cats` | All authenticated | Authenticated | Own cats only | Own cats only |
| `tnr_events` | All | Authenticated | Organizer only | Organizer only |
| `event_signups` | All | Authenticated (self) | — | Own signup |
| `point_log` | Own rows | `service_role` only | `service_role` only | `service_role` only |
| `erasure_audit` | — | Via function only | — | — |
| `staff_audit_log` | Admin only | Via function | — | — |
| `moderator_applications` | Own + moderator | Authenticated | Moderator/admin | Admin |
| `colonies` | Anyone (true) | Authenticated | Creator/caretaker/staff | Staff only |
| `notices` | Authenticated (active/unexpired) | Staff only | Staff only (admin for broadcast) | Staff only (admin for broadcast) |
| `community_channels` | Public OR member OR staff | Admin (public) / Anyone (private) | Creator / Staff | — |
| `channel_members` | Self OR channel creator OR staff | Authenticated | — | Self OR creator OR staff |
| `community_messages` | Channel visible OR staff | Member OR public channel OR staff | Message author OR staff | Message author OR staff |
| `direct_messages` | Sender OR receiver | Sender only | Sender (edit) / Receiver (read status) | Sender only |
| `user_notifications` | Notification owner | Anyone (system/trigger) | Notification owner | — |

---

## Key Triggers

### `on_auth_user_insert` (migration 0002)
Fires `AFTER INSERT ON auth.users`. Creates corresponding row in `public.profiles` with default role `'user'`.

### `fuzz_cat_location` (migration 0003)
Fires `BEFORE INSERT ON public.cats`. Applies `ST_SnapToGrid(location, 0.005)` to all cat coordinate inserts.

### `capacity_guard` (migration 0004)
Fires `BEFORE INSERT ON public.event_signups`. Rejects signup if `current_count >= capacity`.

### `check_role_update` (migration 0016)
Fires `BEFORE UPDATE ON public.profiles`. Rejects role changes unless the requesting session is `admin` role or `service_role`.

### `on_auth_user_login` (migration 0028)
Fires `AFTER UPDATE ON auth.users` (when `last_sign_in_at` changes). Checks:
1. If `password_expires_at` is past → sets `is_enabled = false`
2. If `usages_count >= max_usages` → sets `is_enabled = false`
3. Otherwise → `usages_count++`

### `check_notice_write` (migration 0031 & 0032)
Fires `BEFORE INSERT OR UPDATE OR DELETE ON public.notices`. Enforces that only administrators can write, modify, or delete notices where `is_broadcast` or `is_popup` is set to `true`.

### `check_sub_moderator_edit_limit` (migration 0037 & 0038)
Fires `BEFORE UPDATE OR DELETE ON public.cats, public.tnr_events, public.colonies, public.notices` and `BEFORE UPDATE ON public.moderator_queries`. For users with role `'moderator'` and sub_role `'sub_moderator'`, it tracks and increments edits, blocking action when `edits_count >= max_edits`.

---

## pg_cron Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| `0 * * * *` | `refresh_leaderboard` | Refresh `leaderboard_weekly` materialized view hourly |
| `0 0 * * 1` | `reset_weekly_points` | Weekly leaderboard reset every Monday 00:00 UTC |
| `0 3 * * *` | `purge_audio` | Delete audio files older than 30 days from Storage |
