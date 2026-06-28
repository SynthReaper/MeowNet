# MeowNet — Hackathon Judge Guide 🐾👑 · v0.6.0

> **Welcome!** This guide is written specifically for hackathon judges. It explains every feature in plain language, how to try it, and exactly where the code lives. No developer experience required.

---

## 🚀 Step 1: Log In (Start Here!)

MeowNet uses two parallel authentication systems. Standard email sign-in may trigger OTP verification codes from Clerk (email deliverability can be unreliable without a custom domain — approximately 30% chance of issues). To make judging easy, we pre-loaded **Direct Database Login** credentials below.

### Recommended: Direct Database Sign-In (No OTP, No Clerk)

1. Go to the **[Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login)**
2. You will see judge credential cards at the bottom of the page — click any card to auto-fill the login form
3. The page automatically switches to **Direct Database** login mode (the **"DATABASE DIRECT"** tab will be selected)
4. Click **Sign In** — no email verification, no OTP, instant access

> **⚠️ Important Note:** If you use the standard `/auth/login` or `/auth/signup` page (Clerk social login), there is approximately a **30% chance** that the email verification link may fail because this app does not have a custom domain configured with Clerk. **Social logins (Google, GitHub) work perfectly.** To avoid any issues, please use the Direct Database method above.

---

## 🔐 Judge Credentials

| Role | Email | Password | Login Page | Access |
|------|-------|----------|------------|--------|
| 🧑 **Standard Volunteer** | `judge-user@meownet.org` | `JudgeUser2026!` | [/auth/login](https://meownet-sr.vercel.app/auth/login) — use **Database Direct** tab | Full volunteer features: map, cats, events, empire, community |
| 🛡️ **Sub-Moderator** | `judge-submod@meownet.org` | `JudgeSubMod2026!` | [Staff Portal](https://meownet-sr.vercel.app/auth/moderator-login) | Moderator dashboard + up to 20 edits (DB-enforced) |

> **💡 Tip for Database Direct Login:**
> On the sign-in page, look for the sliding toggle at the top of the login card. Click **"DATABASE DIRECT"** to switch from Clerk Social Login to the direct database form. The judge credential cards at the bottom of the Staff Portal auto-select this mode for you.

---

## 📱 Feature Tour

Here is a plain-language explanation of every major feature, how to test it, and where the code lives.

### 1. 🌍 Landing Page & 3D Globe

**What it does:** The home page displays a live **3D WebGL globe** with glowing particles — each particle represents a logged cat sighting. It also shows a real-time local weather alert based on your geolocation.

**Try it:** Visit the [home page](https://meownet-sr.vercel.app/), spin the globe, and check the weather banner at the top of the screen.

**Code:** [`GlobeScene/index.tsx`](../components/three/GlobeScene/index.tsx) — custom GLSL atmospheric shader + Three.js

---

### 2. 🐱 Cat Logging & AI Breed Estimator

**What it does:** Volunteers can register new cat sightings with:
- **AI Breed Analyzer** — upload a photo to estimate the breed via HuggingFace ML model
- **Privacy Gate (GDPR)** — users must explicitly consent before any AI analysis
- **EXIF Metadata Stripper** — automatically removes GPS tags from photos before upload

**Try it:** Go to **Cats → Log New Cat**, toggle the consent checkbox, upload a cat photo, and receive a breed estimate with veterinary disclaimer.

**Code:** [`lib/security/exif.ts`](../lib/security/exif.ts) · [`ConsentGate`](../components/forms/ConsentGate/index.tsx)

---

### 3. 🗺️ Live Sighting Map

**What it does:** An interactive Leaflet map showing all logged cats and upcoming TNR events. Cat markers are **fuzzed to a 500-meter grid** — exact colony coordinates are never stored or displayed, protecting cats from harm.

**Try it:** Click **Map** in the navigation bar to explore the live map.

**Code:** [`0003_cats.sql`](../supabase/migrations/0003_cats.sql) — PostGIS fuzzing trigger

---

### 4. 👑 Empire Dashboard (Gamification)

**What it does:** Rewards volunteers for helpful actions (logging cats, joining TNR events). Features:
- **Live leaderboard** refreshing every 30 seconds
- **Locked and unlocked badges** based on points history

**Try it:** Click **Empire** in the navigation bar.

**Code:** [`0005_gamification.sql`](../supabase/migrations/0005_gamification.sql)

---

### 4b. 🏰 Colony Tycoon (Idle Builder)

**What it does:** A virtual offline colony builder. While you're away, stray blessings accumulate in real-time. Come back, watch the counter tick up, and claim your earned Empire Points.

**Try it:** Click **Empire → Colony Tycoon**.

**Code:** [`TycoonInterface/index.tsx`](../components/empire/TycoonInterface/index.tsx)

---

### 4c. 🏘️ Volunteer Guilds

**What it does:** Regional volunteer guilds for coordinated action. Search guilds by name, filter by category (TNR, Feeding, Medical…), sort by points or member count, and join guilds that meet your Empire Points threshold. Any volunteer can create a new guild.

**Try it:** Click **Empire → Volunteer Guilds**.

**Code:** [`GuildsInterface/index.tsx`](../components/empire/GuildsInterface/index.tsx)

---

### 4d. 🎲 Daily Trivia & 🟩 Stray Bingo

**What it does:** Admins manage trivia question banks and weekly bingo task boards. Volunteers answer daily TNR/rescue trivia for streaks and complete bingo squares for point multipliers.

**Try it:** Click **Empire → Daily Trivia** or **Empire → Stray Bingo**.

---

### 5. 🌤️ Feline Weather Watch

**What it does:** Fetches real-time climate data from Open-Meteo (server-side) and displays localized safety grids showing whether temperatures are safe for outdoor community cats.

**Try it:** Click **Weather** in the navigation bar.

**Code:** [`app/api/weather/route.ts`](../app/api/weather/route.ts)

---

### 6. 📢 Targeted Announcements (Notice Board)

**What it does:** Staff can write announcements targeted to specific pages (e.g. `/map`, `/auth/login`). The system uses Supabase Realtime subscriptions to display banners or modals only on the relevant page.

**Try it:** As an admin, create a notice targeted to the `login` page, log out, and see the banner on the login screen.

**Code:** [`Broadcasts.tsx`](../components/ui/Broadcasts.tsx)

---

### 7. 💬 Community Chat

**What it does:** Public and private channels with direct messaging. Messages support soft-delete and edit logging. Channels are moderated by staff.

**Try it:** Click **Community** in the navigation bar.

**Code:** [`app/(app)/community`](../app/(app)/community/)

---

### 8. 🆘 Support Query System

**What it does:** Any logged-in user (volunteer) can raise a support query. Queries go to moderators first. If a moderator cannot resolve the issue, they can **escalate it to an admin** with a written reason. Admins handle unresolved escalations.

**Escalation flow:**
```
Volunteer raises query → Moderator reviews → If unresolved: Moderator escalates (with reason) → Admin resolves
```

**Try it:** Click **Support** or the help link in the navigation bar to raise a query.

---

### 9. 🛡️ Staff Admin & Moderator Portals

**What it does:**
- **Admin Dashboard** — tracks user growth, database sizes, role metrics (Recharts). Allows audit log search + CSV export. Can create direct database credential accounts. Includes a **System Settings** tab to change platform-wide configurations (maintenance mode, point rewards, weather thresholds) and a **Supreme Management** tab for direct CRUD access to all cats, colonies, events, and guilds in the database.
- **Moderator Dashboard** — interactive Leaflet hotspot map. Inline status editing via map popups. Moderation queue visualization.

**Login:**
- Admin: `admin@meownet.org` (use Staff Portal → Database Direct)
- Moderator: `moderator@meownet.org` (use Staff Portal → Database Direct)

**Code:** [`app/(app)/admin`](../app/(app)/admin/) · [`app/(app)/moderator`](../app/(app)/moderator/)

---

### 10. 🔧 Maintenance Mode

**What it does:** Admins can enable maintenance mode from the **System Settings** tab. When active, every non-admin visitor is immediately redirected to a themed `/maintenance` page. Admins retain full access and bypass the gate automatically.

**Try it:** Log in as admin, go to the Admin Dashboard → System Settings tab → toggle Maintenance Mode ON. Open an incognito tab and visit any page to see the redirect. Toggle it back OFF when done.

**Code:** [`proxy.ts`](../proxy.ts) · [`app/maintenance/page.tsx`](../app/maintenance/page.tsx)

---

## ⚙️ How Everything Ties Together

### Dual Authentication System

MeowNet runs two authentication systems in parallel:

1. **Clerk (Social Login)** — used by standard volunteers for Google or GitHub sign-in. A server-side HMAC bridge automatically syncs Clerk sessions to Supabase.
2. **Supabase Direct Database Login** — bypasses Clerk entirely. Staff and judges use this to log in with email+password without any OTP or email verification. Accounts have optional expiry dates and login usage limits enforced by a PostgreSQL trigger.

> **For judges:** Use the **Database Direct** tab on any login page. The Staff Portal pre-fills credentials automatically.

### Location Privacy

GPS coordinates from cat sightings are **never stored precisely**. A `BEFORE INSERT` database trigger (PostGIS `ST_SnapToGrid`) rounds all coordinates to a ~500m grid before writing to the database. Exact colony locations are permanently discarded.

### Secure AI Pipeline

The breed estimation AI runs in a separate Docker container (Python FastAPI). The browser never contacts the ML service directly — all requests go through `/api/ai/breed` which validates the user session, strips EXIF data, and adds a service secret header before forwarding.

---

## 🗂️ Key Code Locations

| What | Where |
|------|-------|
| Location privacy fuzzing | [`0003_cats.sql`](../supabase/migrations/0003_cats.sql) |
| Gamification rules | [`0005_gamification.sql`](../supabase/migrations/0005_gamification.sql) |
| Admin login limits | [`0028_custom_admin_users.sql`](../supabase/migrations/0028_custom_admin_users.sql) |
| Query escalation | [`app/(app)/moderator`](../app/(app)/moderator/) |
| Secure password sync | [`lib/actions/auth.ts`](../lib/actions/auth.ts) |
| EXIF stripper | [`lib/security/exif.ts`](../lib/security/exif.ts) |
| 3D Globe | [`GlobeScene/index.tsx`](../components/three/GlobeScene/index.tsx) |
| ML Service | [`python-ml/main.py`](../python-ml/main.py) |
| Auth sliding toggle | [`components/auth/AuthTabs.tsx`](../components/auth/AuthTabs.tsx) |
| Broadcast system | [`components/ui/Broadcasts.tsx`](../components/ui/Broadcasts.tsx) |
| Volunteer Guilds | [`GuildsInterface/index.tsx`](../components/empire/GuildsInterface/index.tsx) |
| Colony Tycoon | [`TycoonInterface/index.tsx`](../components/empire/TycoonInterface/index.tsx) |
| System settings | [`lib/supabase/settings.ts`](../lib/supabase/settings.ts) |
| Maintenance mode | [`proxy.ts`](../proxy.ts) · [`app/maintenance/page.tsx`](../app/maintenance/page.tsx) |
| Certificate verification | [`app/verify/volunteer/[id]/page.tsx`](../app/verify/volunteer/%5Bid%5D/page.tsx) · [`app/verify/page.tsx`](../app/verify/page.tsx) |

### 🌟 New in v0.6.0: Cryptographic Certificate Verification Registry
To add maximum civic trust and platforms transparency, we introduced a cryptographic certificate verification ecosystem:
- **Verifier Portal:** A new public page `/verify` is linked directly under the Resources column in the global footer. Judges can input any certificate token or Proof of Neuter UUID to verify records.
- **Volunteer & Staff Certificates:** Users can now click **"Volunteer Certificate"** (or **"Staff Certificate"** if signed-in as a moderator/admin) from their profile dashboard to view, download, and print background-free certificates. The print output dynamically renders in landscape on a single page.
- **Zero-DB Validation:** The certificate verification is powered by HMAC SHA256 cryptographic signatures using the server's private secret, ensuring metrics cannot be tampered with.

---

## 🏗️ Quick Architecture Summary

```
Browser
  ↓
Next.js 16 (Vercel Edge)
  ├── Clerk Social Login  ←──── Google / GitHub OAuth
  ├── Supabase Direct DB  ←──── Staff / Judge credentials (no OTP)
  ├── /api/* routes       ←──── Proxy for ML, weather, catfacts
  └── Server Actions      ←──── Secure mutations (admin, cats, events)
  ↓
Supabase (PostgreSQL + PostGIS)
  ├── RLS on every table
  ├── Location fuzzing trigger
  ├── Login expiry + usage limit triggers
  ├── Realtime subscriptions (guilds, chat, map)
  └── system_settings (maintenance, point config, weather threshold)
  ↓
Python FastAPI (Docker → Render)
  └── HuggingFace breed + mood AI
```

---

*Built with 🐾 for every stray cat that deserves a better life.*

*MeowNet — #hackthekitty 2026 · v0.6.0 · Author: [SynthReaper](https://github.com/SynthReaper) · synthreaperx@gmail.com*
