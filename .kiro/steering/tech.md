# Technical Steering Document

## Tech Stack
- **Framework**: Next.js 16, React 19, TypeScript 5.
- **Database & Auth**: Supabase, PostGIS, Clerk OAuth, Direct DB accounts.
- **Processing**: sharp WASM for EXIF stripping.

## Quality Constraints
- 0 TypeScript errors allowed in compiler (`npm run type-check`).
- No direct usage of raw GPS. Snapper functions snap coordinates to 0.005° grid.
