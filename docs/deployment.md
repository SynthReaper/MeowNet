# MeowNet Deployment Guide

> Last updated: 2026-06-30 · v0.8.0

---

## Production Stack

| Service | Platform | URL |
|---------|----------|-----|
| Next.js App | Vercel | [meownet-sr.vercel.app](https://meownet-sr.vercel.app/) |
| Python ML Service | Railway / Render | [meownet-ml.onrender.com](https://meownet-ml.onrender.com/) |
| Database + Auth | Supabase | your-project.supabase.co |
| User Identity | Clerk | clerk.com dashboard |

---

## Environment Variables

### Next.js (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # NEVER in NEXT_PUBLIC_*. Used for auth sync RPC and certificate signature validation.

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/cats
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/cats

# ML Service
ML_SERVICE_URL=https://meownet-ml.onrender.com
ML_SERVICE_SECRET=your_secret_key

# App
NEXT_PUBLIC_APP_URL=https://meownet-sr.vercel.app
```

### Python ML Service

```bash
ML_SERVICE_SECRET=your_secret_key            # Must match Next.js ML_SERVICE_SECRET
NEXT_PUBLIC_APP_URL=https://meownet-sr.vercel.app  # Allowed CORS origin
HF_API_TOKEN=hf_...                          # Optional — HuggingFace token
PORT=8000                                    # Default port
```

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key to `.env.local`
3. Copy your service role key (keep secret!)

### 2. Apply Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply all 2 migrations (0001–0002)
npx supabase db push
```

### 3. Enable Extensions

Migrations `0001` automatically enables:
- `postgis` — spatial data types
- `pg_cron` — scheduled jobs
- `pg_stat_statements` — query analytics

### 4. Configure Storage

Migration `0011` creates the `meownet` storage bucket. Ensure the bucket exists in the Supabase dashboard under Storage.

### 5. Configure Auth Providers

In Supabase Dashboard → Authentication → Providers:
- Enable **Email** (email + password)
- Enable **Google** (add OAuth credentials from Google Cloud Console)
- Enable **GitHub** (add OAuth app credentials from GitHub Settings)

---

## Clerk Setup

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Enable Google and GitHub OAuth providers in Clerk dashboard
3. Set redirect URLs:
   - Sign-in redirect: `https://your-app.vercel.app/auth/callback`
   - Sign-up redirect: `https://your-app.vercel.app/auth/callback`
4. Copy publishable key and secret key to `.env.local`

---

## Vercel Deployment

### First Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... (repeat for all env vars)

# Deploy to production
vercel --prod
```

### Continuous Deployment (Direct Git Integration)

Continuous deployment is configured via direct integration with Vercel and Render. On every push to the `main` branch:
- **Vercel** automatically builds and deploys the Next.js frontend application.
- **Render** automatically triggers a build and deploy for the Python ML service.

---

## Python ML Service (Docker)

### Local Development

```bash
cd python-ml

# Using Docker Compose (recommended)
docker-compose up

# Service available at http://localhost:8000
# Health check: http://localhost:8000/health
```

### Manual Docker Build

```bash
cd python-ml
docker build -t meownet-ml .
docker run -p 8000:8000 \
  -e ML_SERVICE_SECRET=dev_secret \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  meownet-ml
```

### Railway Deployment

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Set root directory to `python-ml/`
3. Railway auto-detects `Dockerfile` and builds the image
4. Add environment variables in Railway dashboard
5. The `PORT` variable is set automatically by Railway

### Render Deployment

1. Create a new Web Service on [Render](https://render.com)
2. Connect GitHub repo, set root directory to `python-ml/`
3. Render auto-detects `Dockerfile`
4. Add environment variables in Render dashboard

---

## CI/CD Pipeline

```
Push to main
  ├── GitHub Actions: ci.yml
  │     ├── npm run type-check   # TypeScript (0 errors)
  │     ├── npm run lint         # ESLint
  │     ├── npm run build        # Next.js production build
  │     └── gitleaks scan        # Secret detection
  │
  ├── GitHub Actions: health.yml
  │     └── Ping production URLs every 6 hours
  │
  ├── Vercel Direct Git Integration
  │     └── Next.js production build & deployment (automatic on push to main)
  │
  └── Render Direct Git Integration
        └── Python ML Service build & deployment (automatic on push to main)
```

> **Note:** A separate `deploy.yml` workflow file is not used. Vercel and Render deployments are triggered by direct Git repository integration — not via GitHub Actions deploy steps.

---

## Health Checks

| Service | Endpoint | Expected |
|---------|----------|---------|
| Next.js | `GET /` | 200 |
| ML Service | `GET /health` | `{ "status": "ok" }` |
| Supabase | Dashboard → Health | Green |

---

## Rollback

```bash
# Vercel instant rollback
vercel rollback [deployment-id]

# Database rollback (manual)
# Apply reverse migration SQL in Supabase dashboard SQL editor
# Note: not all migrations are reversible — test in staging first
```
