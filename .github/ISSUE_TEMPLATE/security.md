---
name: "🔒 Security Advisory (Pre-Report)"
about: "Do NOT file public security issues here — use this only to confirm you've read the policy"
title: "[Security]: Use private reporting"
labels: ["security"]
assignees: []
---

<!-- ⚠️ STOP — This is NOT the right place for security vulnerability reports. -->

## ⛔ You Should NOT Be Using This Template

Security vulnerabilities must be disclosed **privately** to protect MeowNet users, cat colonies, and volunteer location data.

**Opening a public GitHub issue for a security vulnerability may put real cats and real people at risk.**

---

### Report Instead Via:

1. **Email**: `synthreaperx@gmail.com`
2. **GitHub Private Advisory**: [Open a private vulnerability report](../../security/advisories/new) ← preferred

Include in your report:
- One-line summary
- Severity estimate (Critical / High / Medium / Low)
- Affected component (e.g. RLS, auth middleware, file upload, admin actions)
- Numbered reproduction steps
- Impact description
- Optional: suggested fix or PoC

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgement | 24 hours |
| Initial triage | 72 hours |
| Fix & release | 14 days (Critical/High) · 30 days (Medium/Low) |

### What We Protect

MeowNet's highest-sensitivity surfaces (in priority order):

1. **Location data** — colony GPS is fuzzed to ~500m but still sensitive
2. **Auth & session** — Clerk OAuth + Database Direct for staff
3. **Admin/Moderator actions** — supreme control panel, system settings, user management
4. **File uploads** — EXIF strip, MIME allowlist enforced server-side
5. **Empire Points / gamification** — `award_points` RPC idempotency

### See Our Full Policy

Read [SECURITY.md](../../SECURITY.md) for the complete disclosure policy, threat model, and response process.

---

*This issue will be closed immediately. Thank you for responsible and coordinated disclosure. 🐱*
