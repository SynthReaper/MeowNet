# Kiro Post-Task Hook

> **Hook:** `post-task`  
> **Trigger:** After completing any implementation task  
> **Agent:** All agents working on v0.9.0

## Mandatory Post-Task Steps

### 1. Type Safety
```powershell
npm run type-check
# Expected: 0 errors
```
If errors exist: DO NOT mark task as complete. Fix all errors first.

### 2. Lint Check
```powershell
npm run lint
# Review all warnings — no new errors introduced
```

### 3. Security Audit (per modified file)

For every new/modified Server Action:
- [ ] Auth check at top (`supabase.auth.getUser()`)
- [ ] Role from DB, never JWT
- [ ] `sanitizeText()` on all string form fields
- [ ] `isValidUUID()` on all UUID params

For every new photo upload:
- [ ] EXIF stripped via `lib/security/exif.ts`
- [ ] Display via `getSafeImageSrc()` only

For every new coordinate input:
- [ ] DB insert goes through `snap_to_grid()` trigger
- [ ] Raw GPS never stored

### 4. Documentation Update
Per AGENTS.md mandatory post-task documentation sync:
- [ ] `CHANGELOG.md` — Add [Unreleased] entry for this feature
- [ ] `README.md` — Update if new feature added to public surface
- [ ] `docs/api.md` — If new API route added
- [ ] `docs/database.md` — If new migration/table added
- [ ] `docs/security.md` — If new security control added

### 5. Kiro Task Completion Report
```yaml
# Kiro generates this on task completion:
task_completed:
  feature_code: "VMS-1"
  files_modified:
    - components/volunteers/AvailabilityCalendar.tsx
    - lib/actions/volunteers.ts
    - app/(app)/volunteers/page.tsx
  security_gates_passed:
    - auth_check: true
    - sanitize_text: true
    - exif_strip: true
    - location_fuzzing: false  # N/A for this feature
  type_check: passed
  build: not_run  # Run before marking phase complete
  tests:
    manual: pending
    automated: not_applicable
  acceptance_criteria:
    VMS-1-AC1: "Volunteer can set availability" # pending manual test
```
