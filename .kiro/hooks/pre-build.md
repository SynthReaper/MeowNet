# Kiro Pre-Build Hook

> **Hook:** `pre-build`  
> **Trigger:** Before any feature build step  
> **Agent:** All agents working on v0.9.0

## Validation Checklist

Run all checks before beginning implementation of any feature:

### 1. Schema Validation
- [ ] `supabase/migrations/0004_social_impact.sql` exists
- [ ] All new table names have corresponding TypeScript interfaces in `lib/supabase/types.ts`
- [ ] All new tables have `ENABLE ROW LEVEL SECURITY` in migration
- [ ] Location columns use `GEOMETRY(POINT, 4326)` and have snap trigger attached

### 2. Security Gate Validation
- [ ] Every new `lib/actions/*.ts` starts with `supabase.auth.getUser()`
- [ ] Every new `app/api/*/route.ts` starts with `supabase.auth.getUser()`
- [ ] No new `SUPABASE_SERVICE_ROLE_KEY` references in client components
- [ ] All photo upload handlers import and call `stripExif()`

### 3. TypeScript Gate
- [ ] Run `npm run type-check` and confirm 0 errors before starting new feature
- [ ] No `any` types introduced (except `(supabase as any).rpc()`)
- [ ] All new state variables have explicit types

### 4. Design System Gate
- [ ] New components use CSS variables from `app/globals.css`
- [ ] No hardcoded color values in JSX (use `var(--token)`)
- [ ] `prefers-reduced-motion` block added for any new CSS animation

## Auto-Generated Stubs (Kiro Output Simulation)

When this hook runs, Kiro generates:
- TypeScript interface stubs for any new DB tables found in migration
- API route templates with auth boilerplate
- Component skeleton files with design system imports

```typescript
// Kiro-generated stub: components/volunteers/AvailabilityCalendar.tsx
'use client';
// [KIRO GENERATED - 2026-07-05]
// Feature: VMS-1 Volunteer Availability Calendar
// Steering: .kiro/steering/social-impact.md
// Spec: .kiro/specs/SPEC.md#VMS-1

import { useState } from 'react';
// TODO: Implement weekly availability grid
// Design: Glassmorphism cells, life-teal selection
// Touch: 48px min tap targets for mobile field use

export default function AvailabilityCalendar() {
  // Kiro placeholder — implement per spec
  return <div className="kiro-stub" data-feature="VMS-1" />;
}
```
