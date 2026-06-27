# Contributing to MeowNet 🐾

Thank you for helping build the community-powered cat empire. Every cat logged is a life improved — and every contribution matters.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Security Contributions](#security-contributions)
- [Documentation](#documentation)

---

## Code of Conduct

All contributors must read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold these standards.

---

## Getting Started

### Prerequisites

| Tool         | Version                |
| ------------ | ---------------------- |
| Node.js      | 20+                    |
| npm          | 10+                    |
| Python       | 3.11+ (for ML service) |
| Git          | Any recent version     |
| Supabase CLI | Latest                 |

### Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/SynthReaper/MeowNet.git
cd MeowNet

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY etc.
# See .env.example for all required variables

# 4. Run database migrations (requires Supabase CLI + local Supabase)
npx supabase start
npx supabase db push
npx supabase db seed

# 5. Start dev server
npm run dev          # Next.js on http://localhost:3000

# 6. (Optional) Start ML service
cd python-ml
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Verify Everything Works

```bash
npm run type-check   # 0 errors expected
npm run lint
npm run build        # Build must pass
```

---

## How to Contribute

### Reporting Bugs

Use the **Bug Report** issue template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, browser, Node version)
- Relevant error messages / screenshots

### Suggesting Features

Use the **Feature Request** issue template. Describe:

- The problem you're solving (not the solution)
- How it benefits the cat rescue community
- Any relevant design considerations

### Security Vulnerabilities

**Do NOT create a public issue.** See [SECURITY.md](SECURITY.md) for private disclosure.

### Code Contributions

1. Comment on the issue you want to work on — avoid duplicated effort
2. Fork the repo and create a branch (see [Branch Strategy](#branch-strategy))
3. Make your changes following our [Code Standards](#code-standards)
4. Push and open a PR

---

## Branch Strategy

```
main           → Production. Protected. PRs only.
feat/xxx       → New features (feat/add-cat-photo-gallery)
fix/xxx        → Bug fixes (fix/leaderboard-refresh-crash)
docs/xxx       → Documentation only
security/xxx   → Security fixes (may be private)
chore/xxx      → Tooling, deps, config
```

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

[optional body]

[optional footer]
Co-Authored-By: Your Name <email>
```

### Types

| Type       | When                         |
| ---------- | ---------------------------- |
| `feat`     | New feature                  |
| `fix`      | Bug fix                      |
| `docs`     | Documentation                |
| `style`    | Formatting (no logic change) |
| `refactor` | Code restructure             |
| `perf`     | Performance improvement      |
| `test`     | Tests                        |
| `chore`    | Tooling, deps                |
| `security` | Security fixes               |

### Examples

```bash
feat(empire): add weekly badge reset via pg_cron
fix(map): resolve Leaflet SSR crash on map page
security(rls): tighten event_signups policy to owner-only
docs(api): document breed endpoint request format
```

> **Breaking changes**: Add `BREAKING CHANGE:` in the footer or `!` after the type: `feat!: rename points to empire_points`

---

## Pull Request Process

### Before Opening a PR

- [ ] `npm run type-check` passes (0 errors)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] New features have no regressions on existing pages
- [ ] Sensitive data not committed (run `git diff --staged` before committing)
- [ ] Migrations are numbered correctly (`0011_xxx.sql`)

### PR Requirements

1. **Title**: Follow commit convention (`feat(scope): description`)
2. **Description**: Fill in the PR template (auto-populated)
3. **Link**: Reference the issue: `Closes #123`
4. **Size**: Keep PRs focused — one feature or fix per PR
5. **Reviewers**: Request at least one maintainer review

### Review Process

1. CI must pass (type-check + lint + build + secret scan)
2. At least 1 approving review from a maintainer
3. No unresolved review comments
4. Squash merge preferred for feature PRs

---

## Code Standards

### TypeScript

- **Zero `any`** — except `(supabase as any).rpc()` for untyped custom DB functions
- Use `as never` for untyped Supabase table names, then cast the result with an explicit interface
- All props and return types must be typed
- No implicit `any` in tsconfig (strict mode)

### React / Next.js

- **Server Components by default** — add `'use client'` only when required (event handlers, browser APIs, hooks)
- Use `useTransition` for async client-side mutations
- Pages that call `supabase.auth.getUser()` must export `dynamic = 'force-dynamic'`
- Client components: import `@/lib/supabase/client`; Server components: `@/lib/supabase/server`

### Security Requirements (non-negotiable)

- ❌ No raw GPS coordinates stored — use `ST_SnapToGrid` or the `fuzz_location` DB function
- ❌ No EXIF data in uploads — call `stripExif()` from `lib/security/exif.ts` before storage
- ❌ No direct INSERT into `point_log` — use `award_points` RPC
- ❌ No client-side imports from `lib/supabase/server` or `lib/privacy/consent.ts`
- ✅ All new DB tables must have RLS enabled with explicit policies
- ✅ All API routes must validate auth with `supabase.auth.getUser()`

### Database Migrations

- New migrations go in `supabase/migrations/` with sequential numbering: `0011_feature.sql`
- Always include a rollback comment
- Enable RLS on every new table immediately
- Never DROP without a migration guard

### Styling

- Inline styles using CSS custom properties (`var(--empire-gold)`)
- No Tailwind (unless explicitly added)
- Responsive by default — test at 375px, 768px, 1280px

---

## Security Contributions

For security-sensitive changes:

1. Reference the `Anubis (SecOps Auditor)` agent role in your PR
2. Tag the PR with `security` label
3. Explain the attack vector mitigated
4. Confirm RLS policies are unchanged or strengthened
5. Verify EXIF stripping is still active for any photo-handling changes

---

## Documentation

### Where Things Live

| Document               | Path                                       |
| ---------------------- | ------------------------------------------ |
| Agent instructions     | `AGENTS.md`                                |
| Security policy        | `SECURITY.md`                              |
| Code of Conduct        | `CODE_OF_CONDUCT.md`                       |
| Architecture decisions | `.agents/memory/obsidian/architecture/`    |
| API schema             | `graphql/schema.graphql` _(if applicable)_ |
| Obsidian vault         | `.agents/memory/obsidian/`                 |

### Updating Docs

- Update `README.md` when adding major features
- Add an ADR (Architecture Decision Record) in `.agents/memory/obsidian/architecture/` for significant technical decisions
- Update `CHANGELOG.md` for every PR (use `Added / Changed / Fixed / Removed / Security`)

---

## Questions?

Open a [Discussion](https://github.com/SynthReaper/MeowNet/discussions) or join our community chat. Don't open an issue for questions — keep the tracker for bugs and features.

> _"Every cat you log is a point in your empire — and every contribution is a point in ours."_ 🐾
