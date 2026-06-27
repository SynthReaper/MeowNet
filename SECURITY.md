# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ Active |
| Any tagged release | ✅ Supported for 90 days |
| Older releases | ❌ Not supported |

## Reporting a Vulnerability

**Do NOT open a public GitHub Issue for security vulnerabilities.**

### Private Disclosure

1. **Email**: `synthreaperx@gmail.com`
2. **GitHub Security Advisory**: Use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) on this repo

### What to Include

```
Summary:     One-line description of the vulnerability
Severity:    Critical / High / Medium / Low (CVSS if known)
Component:   e.g., Supabase RLS, ML API, Auth middleware
Steps:       Numbered reproduction steps
Impact:      What an attacker can achieve
Evidence:    PoC code, screenshots (redact sensitive data)
Suggested fix: (optional)
```

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgement | 24 hours |
| Initial triage | 72 hours |
| Severity assessment | 5 business days |
| Fix & release | 14 days for Critical/High, 30 days for Medium/Low |
| CVE assignment (if applicable) | On fix release |

## Security Controls in Place

### Authentication & Authorization
- Supabase Auth (JWT, OAuth 2.0 via Google / GitHub)
- Row-Level Security (RLS) on **all** database tables
- Least-privilege policies — point awarding only via `SECURITY DEFINER` RPC
- Middleware session refresh on every request

### Data Privacy
- Location data fuzzed to ~500m grid (`ST_SnapToGrid(0.005°)`) — raw GPS never stored
- EXIF/GPS metadata stripped server-side via `sharp` before Supabase Storage write
- GDPR Right to Erasure — hard delete cascade via `delete_user_account()` function
- Explicit consent gate before any AI inference

### Transport & Headers
- HTTPS enforced in production (Vercel edge)
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### API Security
- Service-secret header authentication on ML service (`X-Service-Secret`)
- Rate limiting on ML endpoints (slowapi: 10/min breed, 5/min meow)
- Input validation via Zod on all server actions
- No raw SQL — all queries via Supabase client with parameterized inputs

### CI/CD
- Secret scanning in GitHub Actions (`gitleaks`)
- Dependency audit in CI pipeline
- No secrets in source code — all via environment variables

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| IDOR on cat data | RLS `user_id = auth.uid()` on mutations |
| GPS de-anonymization | 500m grid snap at insert time |
| EXIF GPS leak | `sharp` strips before storage write |
| Empire Points inflation | `action_key UNIQUE` idempotency guard |
| ML service abuse | Service-secret + rate limiting |
| Account takeover | Supabase Auth + JWT rotation |
| SQL injection | Parameterized queries (Supabase client) |
| XSS | React escaping + CSP |
| CSRF | SameSite cookies + server actions |

## Vulnerability Disclosure Policy

We follow **coordinated disclosure**:
- Reporters receive credit in our changelog (unless anonymity is requested)
- We request 90 days to patch before public disclosure
- We will not pursue legal action against good-faith security researchers

## Bug Bounty

There is currently **no paid bug bounty program**. We acknowledge contributors in our `CHANGELOG.md` and GitHub Release notes.

---

*Based on the [GitHub Security Policy template](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)*
