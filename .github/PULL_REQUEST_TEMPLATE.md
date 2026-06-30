## Summary

<!-- One sentence: what does this PR do and why? -->

Closes #<!-- issue number -->

## Type of Change

- [ ] 🐛 Bug fix (non-breaking, fixes an issue)
- [ ] ✨ New feature (non-breaking, adds functionality)
- [ ] 💥 Breaking change (modifies existing behavior)
- [ ] 🔒 Security fix (addresses a vulnerability or hardens a control)
- [ ] 📝 Documentation only
- [ ] 🔧 Chore (tooling, deps, config, refactor with no behavior change)
- [ ] 🗄️ Database migration (new `supabase/migrations/` file)

## What Changed

<!-- Bullet points of what you changed and why. Reference affected files. -->

-
-
-

## Testing Done

- [ ] `npm run type-check` passes (0 errors in source files)
- [ ] `npx eslint path/to/changed/file.tsx` passes
- [ ] `npm run build` passes
- [ ] Tested in browser at `localhost:3000`
- [ ] Tested mobile viewport (375px)
- [ ] Tested authenticated + unauthenticated states (if applicable)
- [ ] Tested admin role path (if applicable)
- [ ] Tested moderator role path (if applicable)

## Database Changes

- [ ] No database changes
- [ ] New migration added: `supabase/migrations/XXXX_description.sql`
- [ ] RLS enabled on new table(s) — policy reviewed
- [ ] `SECURITY DEFINER` used for privileged ops
- [ ] Realtime publication updated (if new table needs live updates)
- [ ] Seed data updated

## Security Checklist

*(Complete every applicable item — skip non-applicable ones with ~~strikethrough~~)*

**Data & Storage**
- [ ] No raw GPS coordinates stored (DB trigger handles fuzzing)
- [ ] EXIF stripping called before any photo upload (`stripExifAndNormalize`)
- [ ] Empire Points awarded via `award_points` RPC only — no direct `INSERT` into `point_log`
- [ ] `sanitizeText()` applied to all new user-supplied string fields
- [ ] `sanitizeUrl()` applied to any URL fields

**Auth & Access Control**
- [ ] `supabase.auth.getUser()` called at the top of every new Server Action / API route
- [ ] Role re-read from DB (`profiles.role`) — not from client-supplied claims
- [ ] RLS policies verified on any new/modified table
- [ ] No secrets committed (env vars only)

**File Uploads** *(if applicable)*
- [ ] MIME type checked against allowlist before buffer allocation
- [ ] File size limit enforced
- [ ] EXIF stripped for images

**Admin Actions** *(if applicable)*
- [ ] UUID format validated on any ID parameter before DB call
- [ ] New system settings key added to `ALLOWED_SETTING_KEYS` in `lib/actions/admin.ts`
- [ ] Action logged to `staff_audit_log` via `logAuditActionInternal`

**Server Actions & API Routes**
- [ ] `'use server'` directive present in all new server action files
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` used outside of `lib/supabase/server.ts`
- [ ] Weather / ML / GIF calls go through the server proxy (`/api/weather`, `/api/ai/breed`, `/api/tenor`) — not direct browser fetch

## 📝 Documentation Checklist

*(Required by AGENTS.md post-task doc mandate)*

- [ ] `CHANGELOG.md` updated with this change
- [ ] `README.md` feature table / migration count current
- [ ] `docs/api.md` updated (if new or changed routes)
- [ ] `docs/database.md` updated (if schema changed)
- [ ] `docs/security.md` updated (if security controls changed)
- [ ] `docs/architecture.md` updated (if architecture changed)
- [ ] `SETUP.md` updated (if env vars or CLI changed)
- [ ] Version strings consistent across README, CHANGELOG, HACKATHON.md, AGENTS.md

## Screenshots / Recordings

<!-- For UI changes, include before/after screenshots or a short screen recording. -->

## Migration Plan

<!-- If this is a breaking change, describe the migration path for existing users/data. -->

## Reviewer Notes

<!-- Anything specific you want reviewers to focus on or be aware of? -->
