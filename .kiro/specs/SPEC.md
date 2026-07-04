# MeowNet Social Impact Enhancement Specification

**Version:** 1.0.0  
**Date:** 2026-07-04  
**Author:** SynthReaper  
**Project:** MeowNet — #hackthekitty 2026

---

## 1. Project Overview

### 1.1 Vision

Transform MeowNet from a cat colony tracking platform into a comprehensive **social impact ecosystem** that connects volunteers, coordinates animal welfare efforts, measures community engagement, and provides actionable insights for rescue organizations, volunteers, and the public.

### 1.2 Current State

- **Version:** v0.8.2
- **Tech Stack:** Next.js 14, Supabase, Clerk, Python ML
- **Core Features:** TNR events, colony management, cat profiles, gamification (empire), community chat
- **Security:** AES-GCM-256 encryption, EXIF stripping, sanitization, RLS, RBAC (user/moderator/admin)
- **Gaps Identified:**
  - No volunteer scheduling/availability system
  - No emergency incident reporting
  - No real-time alerting for urgent medical cases
  - No supply/fundraising management
  - No partnership/NGO tracking system
  - Limited admin/moderator analytics

---

## 2. Social Impact Feature Categories

### 2.1 Volunteer Management System

| Feature | Description | Technical Complexity |
|---------|-------------|---------------------|
| VMS-1: Volunteer Availability Calendar | Weekly/monthly availability slots volunteers set | Medium |
| VMS-2: Skill Profiles | Verified skills (TNR assistant, vet liaison, transporter) with badges | Medium |
| VMS-3: Task Board | Claim-based task system (feeding, trapping, transport) | High |
| VMS-4: Volunteer Matching | ML-based matching of volunteers to colonies based on proximity, skills, availability | High |
| VMS-5: Hour Tracking & Certification | Automated volunteer hour logging with PDF certificates | Medium |
| VMS-6: Mentorship Pipeline | Structured onboarding with assigned mentors | Low |
| VMS-7: Regional Chapter System | Geographic clustering with local coordinators | Medium |

### 2.2 Emergency & Crisis Response

| Feature | Description | Technical Complexity |
|---------|-------------|---------------------|
| ECR-1: Incident Reporting | Structured incident reports (injury, disaster, abuse) | Medium |
| ECR-2: Real-Time Alerts | Push notifications for emergencies within radius | High |
| ECR-3: Disaster Coordination | Resource matching, supply drops, status updates | High |
| ECR-4: Weather Safety Watch | Automated alerts based on temperature/storm thresholds | Medium |
| ECR-5: Lost Cat Network | Community-reported lost colony cats with geofencing | Medium |
| ECR-6: Emergency Volunteer Dispatch | One-click dispatch to nearest available volunteers | High |

### 2.3 Welfare & Analytics

| Feature | Description | Technical Complexity |
|---------|-------------|---------------------|
| WFA-1: Colony Welfare Dashboard | Time-series welfare scores with trends | Medium |
| WFA-2: Population Prediction | AI forecasting colony sizes | High |
| WFA-3: Intervention Correlation | Statistical analysis of TNR impact | High |
| WFA-4: Geographic Heatmaps | Density maps of colonies, TNR rates | Medium |
| WFA-5: Health Alert Network | Community health issue alerts with severity scoring | Medium |
| WFA-6: Seasonal Migration Tracking | Colony movement between seasons | Medium |

### 2.4 Education & Outreach

| Feature | Description | Technical Complexity |
|---------|-------------|---------------------|
| EDU-1: Certification Program | Online courses (Basic/Advanced/Medical TNR) | High |
| EDU-2: Impact Stories Blog | User-submitted success stories with approval workflow | Low |
| EDU-3: Public Safety Portal | Educational content for community coexistence | Low |
| EDU-4: Kids Corner | Child-friendly content with achievements | Low |
| EDU-5: Webinar System | Live streams with Q&A, attendance tracking | High |
| EDU-6: Research Portal | Opt-in data sharing for academic research | High |

### 2.5 Gamification for Good

| Feature | Description | Technical Complexity |
|---------|-------------|---------------------|
| GFG-1: Enhanced Leaderboards | Monthly/quarterly/yearly across multiple categories | Medium |
| GFG-2: Achievement Badge System | Milestone badges with unlock celebrations | Medium |
| GFG-3: Colony Sponsorship | Virtual adoption with streak tracking | Low |
| GFG-4: Trivia for Good | Points fund real-world supplies | Medium |
| GFG-5: Bingo Cards | Engagement activity tracking | Low |
| GFG-6: Tycoon Mode | Virtual colony empire building | High |

### 2.6 Partnerships & Ecosystem

| Feature | Description | Technical Complexity |
|---------|-------------|---------------------|
| PES-1: Vet Partner Network | Verified partners with discount codes | Medium |
| PES-2: Corporate Sponsorship | Tiered sponsorship with impact reporting | High |
| PES-3: Government Integration | Data sharing with animal control | High |
| PES-4: Rescue Org Sync | Real-time data sync with other rescues | High |
| PES-5: Pet Store Donations | Round-up program integration | Medium |
| PES-6: Insurance Integration | Volunteer liability enrollment | Medium |

### 2.7 Accessibility & Inclusion

| Feature | Description | Technical Complexity |
|---------|-------------|---------------------|
| ACI-1: Multi-Language Support | Full i18n with contributor interface | High |
| ACI-2: Screen Reader Optimization | Full ARIA compliance | Medium |
| ACI-3: Low-Bandwidth Mode | Lite PWA with offline sync | High |
| ACI-4: Voice Commands | Hands-free operation | High |
| ACI-5: Text-to-Speech Alerts | Audio delivery of critical alerts | Medium |

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 14 App Router                     │
├─────────────────────────────────────────────────────────────────┤
│  Client Components │ Server Components │ Server Actions          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     API Layer (Route Handlers)                   │
│  /api/ai/*  /api/weather/*  /api/emergency/*  /api/volunteers/*  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Supabase (PostgreSQL + Auth)                  │
│  Tables │ RLS Policies │ Row Security │ Edge Functions           │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   Python-ML Service (FastAPI)                    │
│  Breed Estimation │ Mood Classification │ Health Triage          │
│  Population Prediction │ Volunteer Matching                      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema Enhancements

#### Core New Tables

```sql
-- Volunteer Management
volunteer_availability (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  day_of_week INTEGER,  -- 0-6
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN DEFAULT true
)

volunteer_skills (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  skill_type TEXT,  -- 'tnr_assistant', 'vet_liaison', 'transporter', 'photographer'
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users,
  verified_at TIMESTAMPTZ
)

volunteer_hours (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  colony_id UUID REFERENCES colonies,
  activity_type TEXT,  -- 'feeding', 'trapping', 'transport', 'event'
  hours DECIMAL(4,2),
  date DATE,
  verified_by UUID REFERENCES auth.users
)

tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  colony_id UUID REFERENCES colonies,
  task_type TEXT,  -- 'feeding', 'trapping', 'vet_visit', 'supply_run'
  priority TEXT,  -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open',  -- 'open', 'claimed', 'in_progress', 'completed', 'cancelled'
  required_skills TEXT[],
  claimed_by UUID REFERENCES auth.users,
  created_by UUID REFERENCES auth.users,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verification_photo_url TEXT
)

-- Emergency System
incidents (
  id UUID PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users,
  incident_type TEXT,  -- 'injury', 'disaster', 'abuse', 'stray_emergency'
  severity TEXT,  -- 'low', 'medium', 'high', 'critical'
  location GEOMETRY(POINT, 4326),
  description TEXT,
  photo_urls TEXT[],
  status TEXT DEFAULT 'open',  -- 'open', 'acknowledged', 'in_progress', 'resolved', 'closed'
  assigned_to UUID REFERENCES auth.users,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
)

emergency_contacts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  contact_type TEXT,  -- 'emergency', 'vet', 'rescue'
  name TEXT,
  phone TEXT,
  email TEXT,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false
)

-- Supply Management
supplies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,  -- 'food', 'medical', 'trapping', 'shelter'
  quantity INTEGER,
  unit TEXT,  -- 'lbs', 'boxes', 'kits'
  expiration_date DATE,
  location GEOMETRY(POINT, 4326),
  donated_by UUID REFERENCES auth.users
)

supply_requests (
  id UUID PRIMARY KEY,
  requester_id UUID REFERENCES auth.users,
  supply_id UUID REFERENCES supplies,
  quantity_requested INTEGER,
  purpose TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'fulfilled', 'rejected'
  approved_by UUID REFERENCES auth.users
)

-- Partnerships
partner_organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,  -- 'vet', 'rescue', 'corporate', 'government', 'retail'
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  discount_code TEXT,
  verification_status TEXT DEFAULT 'pending',  -- 'pending', 'verified', 'suspended'
  partnership_tier TEXT,  -- 'bronze', 'silver', 'gold', 'platinum'
  benefits TEXT[],
  created_at TIMESTAMPTZ
)

-- Education
courses (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'basic_tnr', 'advanced_tnr', 'medical', 'colony_management'
  difficulty TEXT,  -- 'beginner', 'intermediate', 'advanced'
  content JSONB,  -- Modular content structure
  duration_hours DECIMAL(4,2),
  certification_eligible BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users
)

course_enrollments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  course_id UUID REFERENCES courses,
  progress DECIMAL(5,2) DEFAULT 0,  -- 0-100
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
)

course_quiz_responses (
  id UUID PRIMARY KEY,
  enrollment_id UUID REFERENCES course_enrollments,
  question_id TEXT,
  answer TEXT,
  is_correct BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
)

-- Chapters/Regions
chapters (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  coordinator_id UUID REFERENCES auth.users,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ,
  description TEXT,
  meeting_schedule TEXT
)

chapter_members (
  id UUID PRIMARY KEY,
  chapter_id UUID REFERENCES chapters,
  user_id UUID REFERENCES auth.users,
  role TEXT DEFAULT 'member',  -- 'member', 'coordinator', 'assistant'
  joined_at TIMESTAMPTZ DEFAULT NOW()
)

-- Impact Stories
stories (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  content TEXT,
  hero_image_url TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'draft',  -- 'draft', 'submitted', 'approved', 'published'
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
)

-- Research Data (Anonymized)
research_data_requests (
  id UUID PRIMARY KEY,
  researcher_email TEXT NOT NULL,
  institution TEXT,
  research_purpose TEXT,
  requested_data_types TEXT[],
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES auth.users,
  approved_at TIMESTAMPTZ,
  expiry_date DATE
)

-- Enhanced Audit
staff_actions (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES auth.users,
  actor_role TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  previous_state JSONB,
  new_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.3 API Route Structure

```
app/api/
├── volunteers/
│   ├── availability/      # GET, POST, PUT volunteer availability
│   ├── skills/            # GET, POST, verify skills
│   ├── hours/             # GET, POST, verify hours
│   ├── tasks/             # CRUD for task board
│   ├── matching/          # GET optimal volunteer-colony matches
│   └── dispatch/          # POST emergency dispatch
├── emergency/
│   ├── incidents/         # CRUD incident reports
│   ├── alerts/            # GET, POST push notifications
│   └── contacts/          # Emergency contact management
├── supplies/
│   ├── inventory/         # CRUD supply inventory
│   └── requests/          # CRUD supply requests
├── partners/
│   ├── organizations/     # CRUD partner organizations
│   └── verification/      # Verify partner status
├── education/
│   ├── courses/           # CRUD courses
│   ├── enrollments/       # Manage enrollments
│   └── certificates/      # Generate/download certificates
├── chapters/
│   ├── /                  # CRUD chapters
│   └── members/           # Manage chapter membership
├── stories/
│   ├── /                  # CRUD stories
│   └── publish/           # Publish story workflow
├── analytics/
│   ├── welfare/           # Colony welfare trends
│   ├── population/        # Population predictions
│   └── impact/            # Impact metrics
└── research/
    ├── requests/          # Data request workflow
    └── export/            # Export anonymized data
```

### 3.4 Server Actions (lib/actions/)

```typescript
// New Server Actions to implement
export async function setVolunteerAvailability(formData: FormData)
export async function verifySkill(userId: string, skillType: string)
export async function logVolunteerHours(formData: FormData)
export async function createTask(formData: FormData)
export async function claimTask(taskId: string)
export async function completeTask(taskId: string, verificationPhoto?: File)
export async function getVolunteerMatches(colonyId: string)
export async function reportIncident(formData: FormData)
export async function acknowledgeIncident(incidentId: string)
export async function dispatchVolunteer(incidentId: string, volunteerId: string)
export async function addSupply(formData: FormData)
export async function requestSupply(supplyId: string, quantity: number)
export async function createChapter(formData: FormData)
export async function joinChapter(chapterId: string)
export async function submitStory(formData: FormData)
export async function publishStory(storyId: string)
export async function enrollInCourse(courseId: string)
export async function completeQuiz(enrollmentId: string, answers: Record<string, string>)
export async function generateCertificate(enrollmentId: string)
export async function requestResearchData(formData: FormData)
export async function exportResearchData(requestId: string)
```

---

## 4. Security Architecture

### 4.1 Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Login                                                      │
│  ├─ Clerk (OAuth: Google, GitHub) ──► Session Bridge ──► Supabase│
│  └─ Database Direct (Email/Password) ──► Supabase Auth          │
│                                                                  │
│  Authorization Check (per request):                              │
│  1. Verify token via supabase.auth.getUser()                    │
│  2. Fetch profile.role from database (never from JWT)           │
│  3. Check RLS policies                                           │
│  4. Verify action permission                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| `user` | View colonies, cats, events; create reports; join tasks; chat |
| `volunteer` | All user + log hours, claim tasks, attend events |
| `moderator` | All volunteer + moderate content, manage queries, view reports |
| `admin` | All moderator + user management, system settings, full analytics |
| `coordinator` | Chapter management, volunteer coordination (custom role) |
| `partner` | Partner portal access (limited to partner features) |

### 4.3 Security Gates

1. **Auth Gate**: `supabase.auth.getUser()` at top of every Server Action and API route
2. **Role Gate**: Role read from DB (`profiles.role`) — never from client JWT
3. **EXIF Gate**: Stripped via `lib/security/exif.ts` before any photo upload
4. **Sanitization Gate**: `sanitizeText()` applied to all user string inputs
5. **Location Gate**: GPS not stored raw — DB trigger handles `ST_SnapToGrid(0.005)`
6. **Points Gate**: Empire Points via `award_points` RPC only — no direct INSERT
7. **UUID Validation**: All UUID params validated before DB calls
8. **Model Allowlist**: AI proxy `model` param validated against allowlist
9. **Vault Encryption**: Passphrases never in plaintext — use `encryptData()`
10. **Safe URLs**: `getSafeImageSrc()` for all user-supplied image URLs

### 4.4 Privacy Compliance (GDPR)

| Requirement | Implementation |
|-------------|----------------|
| Consent | `user_consents` table tracks opt-ins |
| Access | Profile data export via Server Action |
| Deletion | `privacy/delete-account` API with cascade delete + erasure audit |
| Data Minimization | Location fuzzing, no raw GPS, limited data retention |
| Portability | JSON export of user data |
| Breach Notification | Admin alerts, audit logging |

---

## 5. Admin & Moderator Enhancements

### 5.1 Admin Dashboard Features

| Feature | Description | Priority |
|---------|-------------|----------|
| AD-1: Real-Time Analytics | Live dashboard with key metrics, charts | High |
| AD-2: User Management | View, edit, disable users; role assignment | High |
| AD-3: System Settings | Configurable settings via UI (not env vars) | High |
| AD-4: Audit Trail | Searchable, filterable staff action history | High |
| AD-5: Partner Management | CRUD partner organizations, verification | Medium |
| AD-6: Content Moderation | Stories, comments, reports approval queue | High |
| AD-7: Volunteer Reports | Export volunteer hours, certifications | Medium |
| AD-8: Impact Metrics | Measurable outcomes, trend analysis | Medium |
| AD-9: Emergency Overview | Active incidents map, dispatch coordination | High |
| AD-10: Chapter Management | Create chapters, assign coordinators | Medium |

### 5.2 Moderator Dashboard Features

| Feature | Description | Priority |
|---------|-------------|----------|
| MD-1: Content Queue | Pending cat approvals, event reviews | High |
| MD-2: Query Management | Volunteer queries with escalation workflow | High |
| MD-3: Incident Triage | Acknowledge, assign, resolve incidents | High |
| MD-4: Report Handler | Flagged content review workflow | High |
| MD-5: Volunteer Verification | Verify hours, skills | Medium |
| MD-6: Community Stats | Channel activity, user engagement | Low |

### 5.3 Query Escalation Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Volunteer   │────►│  Moderator   │────►│    Admin     │
│   raises     │     │   reviews    │     │   resolves   │
│   query      │     │              │     │   escalated  │
│  (open)      │     │  solves or   │     │   queries    │
│              │     │  escalates   │     │  (resolved)  │
└──────────────┘     │  (open)      │     └──────────────┘
                     │  escalates   │
                     │  (escalated) │
                     └──────────────┘
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

- [ ] Volunteer availability calendar table + CRUD
- [ ] Volunteer skills table + verification workflow
- [ ] Task board (basic) with claim/complete
- [ ] Incident reporting system
- [ ] Admin dashboard enhancements for new features
- [ ] TypeScript types for new entities
- [ ] RLS policies for new tables

### Phase 2: Core Features (Weeks 3-4)

- [ ] Volunteer hour tracking with verification
- [ ] Emergency alerts (push notifications)
- [ ] Supply inventory and requests
- [ ] Chapter system
- [ ] Moderator incident management
- [ ] Basic analytics dashboard

### Phase 3: Engagement (Weeks 5-6)

- [ ] Course system (content delivery)
- [ ] Quiz and certification
- [ ] Impact stories blog
- [ ] Leaderboard enhancements
- [ ] Badge system expansion

### Phase 4: Advanced (Weeks 7-8)

- [ ] AI volunteer matching
- [ ] Population prediction model
- [ ] Partnership portal
- [ ] Research data export
- [ ] Advanced analytics

### Phase 5: Polish (Weeks 9-10)

- [ ] Accessibility audit (ARIA, keyboard nav)
- [ ] i18n setup
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing feedback

---

## 7. Acceptance Criteria

### 7.1 Functional Criteria

- [ ] Volunteers can set weekly availability
- [ ] Skills can be verified by moderators
- [ ] Tasks can be created, claimed, completed with verification
- [ ] Incidents can be reported with severity scoring
- [ ] Emergency alerts reach nearby volunteers within 30 seconds
- [ ] Supply requests workflow functions end-to-end
- [ ] Chapters can be created and managed
- [ ] Courses can be created, enrolled, and completed with certificates
- [ ] Stories can be submitted, approved, and published
- [ ] Admin can manage all new entities via dashboard
- [ ] Moderator can handle incident triage workflow

### 7.2 Technical Criteria

- [ ] `npm run type-check` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] All new API routes have auth checks
- [ ] RLS policies enforce data isolation
- [ ] EXIF stripping works on all photo uploads
- [ ] Location fuzzing applied to all coordinates
- [ ] Encryption used for sensitive data
- [ ] Audit logging captures all admin/moderator actions

### 7.3 Security Criteria

- [ ] No `any` types (except Supabase RPC)
- [ ] No raw GPS storage
- [ ] No direct browser Open-Meteo calls
- [ ] No service_role key in client bundles
- [ ] No free-form model param in AI proxy
- [ ] Vault passphrase never plaintext in localStorage
- [ ] All user inputs sanitized

### 7.4 UX Criteria

- [ ] Responsive design works on mobile (field use)
- [ ] Loading states for all async operations
- [ ] Error states with actionable messages
- [ ] Confirmation dialogs for destructive actions
- [ ] Real-time updates where appropriate

---

## 8. Documentation Updates Required

After implementation, update these files as per AGENTS.md:

| File | Update Required |
|------|-----------------|
| `CHANGELOG.md` | Add feature entries |
| `README.md` | Update feature table |
| `docs/api.md` | New API routes |
| `docs/database.md` | New migrations, tables |
| `docs/security.md` | New security measures |
| `docs/architecture.md` | New services |
| `docs/deployment.md` | Config changes |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Delays | Strict phase gates |
| ML model complexity | Performance | Start with rules-based matching |
| Real-time alerts | Scale | WebSocket + FCM fallback |
| Multi-language | Maintenance | Community translation |
| Partner integrations | Security | Strict RLS, audit logging |

---

## 10. Success Metrics

| Category | Metric | Target |
|----------|--------|--------|
| Engagement | Volunteer task completion rate | 80% |
| Response | Emergency alert response time | < 5 min |
| Growth | Active volunteers per quarter | +25% |
| Retention | 6-month volunteer retention | 60% |
| Impact | TNR procedures facilitated | +50% |
| Education | Course completions | 500/year |
| Community | Chapter formation | 10 regions |

---

*Document Version: 1.0.0*  
*Last Updated: 2026-07-04*