-- supabase/migrations/0004_social_impact.sql
-- MeowNet v0.9.0 Social Impact Ecosystem Schema
-- Generated with Kiro AI · #hackthekitty 2026 · SynthReaper

-- ============================================================
-- SECTION 1: VOLUNTEER MANAGEMENT SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.volunteer_availability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, start_time)
);

ALTER TABLE public.volunteer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "volunteer_availability_own_all"
  ON public.volunteer_availability FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "volunteer_availability_mod_select"
  ON public.volunteer_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.volunteer_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_type    TEXT NOT NULL CHECK (skill_type IN (
    'tnr_assistant', 'vet_liaison', 'transporter',
    'photographer', 'fundraiser', 'educator', 'medical_assistant'
  )),
  verified      BOOLEAN NOT NULL DEFAULT false,
  verified_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_type)
);

ALTER TABLE public.volunteer_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "volunteer_skills_own_select_insert"
  ON public.volunteer_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "volunteer_skills_own_insert"
  ON public.volunteer_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "volunteer_skills_mod_all"
  ON public.volunteer_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- Public read for volunteer matching
CREATE POLICY "volunteer_skills_public_verified"
  ON public.volunteer_skills FOR SELECT
  USING (verified = true);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.volunteer_hours (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  colony_id      UUID REFERENCES public.colonies(id) ON DELETE SET NULL,
  activity_type  TEXT NOT NULL CHECK (activity_type IN (
    'feeding', 'trapping', 'transport', 'event', 'education', 'fundraising'
  )),
  hours          DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  date           DATE NOT NULL,
  notes          TEXT CHECK (char_length(notes) <= 1000),
  verified_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.volunteer_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "volunteer_hours_own_all"
  ON public.volunteer_hours FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "volunteer_hours_mod_all"
  ON public.volunteer_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_volunteer_hours_user ON public.volunteer_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_date ON public.volunteer_hours(date DESC);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_colony ON public.volunteer_hours(colony_id);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tasks (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  TEXT NOT NULL CHECK (char_length(title) <= 200),
  description            TEXT CHECK (char_length(description) <= 2000),
  colony_id              UUID REFERENCES public.colonies(id) ON DELETE SET NULL,
  task_type              TEXT NOT NULL CHECK (task_type IN (
    'feeding', 'trapping', 'vet_visit', 'supply_run', 'transport', 'monitoring'
  )),
  priority               TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  status                 TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'claimed', 'in_progress', 'completed', 'cancelled'
  )),
  required_skills        TEXT[] NOT NULL DEFAULT '{}',
  claimed_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date               TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  verification_photo_url TEXT CHECK (char_length(verification_photo_url) <= 500),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view open tasks
CREATE POLICY "tasks_authenticated_select"
  ON public.tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user can claim open tasks
CREATE POLICY "tasks_claim"
  ON public.tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status IN ('open', 'claimed', 'in_progress'));

-- Moderators/admins can create and manage all tasks
CREATE POLICY "tasks_mod_all"
  ON public.tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_colony_id ON public.tasks(colony_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_claimed_by ON public.tasks(claimed_by);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_tasks_updated_at()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON public.tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_tasks_updated_at();

-- ============================================================
-- SECTION 2: EMERGENCY & CRISIS RESPONSE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.incidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_type    TEXT NOT NULL CHECK (incident_type IN (
    'injury', 'disaster', 'abuse', 'stray_emergency', 'medical', 'lost_cat'
  )),
  severity         TEXT NOT NULL CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),
  location         GEOMETRY(POINT, 4326),
  description      TEXT NOT NULL CHECK (char_length(description) <= 3000),
  photo_urls       TEXT[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'acknowledged', 'in_progress', 'resolved', 'closed'
  )),
  assigned_to      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT CHECK (char_length(resolution_notes) <= 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

-- Location fuzzing: apply same 0.005 grid as cats/colonies
CREATE OR REPLACE FUNCTION public.fuzz_incident_location()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    NEW.location = ST_SnapToGrid(NEW.location, 0.005);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incidents_fuzz_location ON public.incidents;
CREATE TRIGGER incidents_fuzz_location
  BEFORE INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.fuzz_incident_location();

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can report and view incidents
CREATE POLICY "incidents_authenticated_select"
  ON public.incidents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "incidents_reporter_insert"
  ON public.incidents FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Moderators/admins can manage all incidents
CREATE POLICY "incidents_mod_all"
  ON public.incidents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON public.incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON public.incidents USING GIST(location);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_type   TEXT NOT NULL CHECK (contact_type IN ('emergency', 'vet', 'rescue')),
  name           TEXT NOT NULL CHECK (char_length(name) <= 200),
  phone          TEXT NOT NULL CHECK (char_length(phone) <= 30),
  email          TEXT CHECK (char_length(email) <= 255),
  relationship   TEXT CHECK (char_length(relationship) <= 100),
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emergency_contacts_own_all"
  ON public.emergency_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 3: SUPPLY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.supplies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL CHECK (char_length(name) <= 200),
  category        TEXT NOT NULL CHECK (category IN (
    'food', 'medical', 'trapping', 'shelter', 'other'
  )),
  quantity        INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit            TEXT NOT NULL CHECK (char_length(unit) <= 50),
  expiration_date DATE,
  location        GEOMETRY(POINT, 4326),
  donated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           TEXT CHECK (char_length(notes) <= 1000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view supplies
CREATE POLICY "supplies_authenticated_select"
  ON public.supplies FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user can donate (add) a supply
CREATE POLICY "supplies_authenticated_insert"
  ON public.supplies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Moderators/admins manage all supplies
CREATE POLICY "supplies_mod_all"
  ON public.supplies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_supplies_category ON public.supplies(category);
CREATE INDEX IF NOT EXISTS idx_supplies_location ON public.supplies USING GIST(location);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.supply_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supply_id          UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  purpose            TEXT NOT NULL CHECK (char_length(purpose) <= 1000),
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'fulfilled', 'rejected'
  )),
  approved_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_requests_own_all"
  ON public.supply_requests FOR ALL
  USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "supply_requests_mod_all"
  ON public.supply_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_supply_requests_status ON public.supply_requests(status);
CREATE INDEX IF NOT EXISTS idx_supply_requests_requester ON public.supply_requests(requester_id);

-- ============================================================
-- SECTION 4: CHAPTERS / REGIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chapters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL CHECK (char_length(name) <= 200),
  region           TEXT NOT NULL CHECK (char_length(region) <= 200),
  coordinator_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description      TEXT CHECK (char_length(description) <= 2000),
  meeting_schedule TEXT CHECK (char_length(meeting_schedule) <= 500),
  member_count     INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view chapters
CREATE POLICY "chapters_authenticated_select"
  ON public.chapters FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can manage chapters
CREATE POLICY "chapters_admin_all"
  ON public.chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chapter_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'coordinator', 'assistant')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chapter_id, user_id)
);

ALTER TABLE public.chapter_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapter_members_authenticated_select"
  ON public.chapter_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "chapter_members_own_join"
  ON public.chapter_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chapter_members_own_leave"
  ON public.chapter_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "chapter_members_admin_all"
  ON public.chapter_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- Auto-increment/decrement member_count
CREATE OR REPLACE FUNCTION public.update_chapter_member_count()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chapters SET member_count = member_count + 1 WHERE id = NEW.chapter_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.chapters SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.chapter_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chapter_member_count_trigger ON public.chapter_members;
CREATE TRIGGER chapter_member_count_trigger
  AFTER INSERT OR DELETE ON public.chapter_members
  FOR EACH ROW EXECUTE FUNCTION public.update_chapter_member_count();

CREATE INDEX IF NOT EXISTS idx_chapter_members_chapter ON public.chapter_members(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_members_user ON public.chapter_members(user_id);

-- ============================================================
-- SECTION 5: EDUCATION SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.courses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  TEXT NOT NULL CHECK (char_length(title) <= 200),
  description            TEXT CHECK (char_length(description) <= 3000),
  category               TEXT NOT NULL CHECK (category IN (
    'basic_tnr', 'advanced_tnr', 'medical', 'colony_management', 'fundraising'
  )),
  difficulty             TEXT NOT NULL CHECK (difficulty IN (
    'beginner', 'intermediate', 'advanced'
  )),
  content                JSONB NOT NULL DEFAULT '[]',
  duration_hours         DECIMAL(4,2) CHECK (duration_hours > 0),
  certification_eligible BOOLEAN NOT NULL DEFAULT false,
  is_published           BOOLEAN NOT NULL DEFAULT false,
  created_by             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_public_select"
  ON public.courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "courses_mod_select_all"
  ON public.courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "courses_admin_all"
  ON public.courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress        DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed_at    TIMESTAMPTZ,
  certificate_url TEXT CHECK (char_length(certificate_url) <= 500),
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_enrollments_own_all"
  ON public.course_enrollments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_enrollments_mod_select"
  ON public.course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_quiz_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  question_id    TEXT NOT NULL CHECK (char_length(question_id) <= 100),
  answer         TEXT NOT NULL CHECK (char_length(answer) <= 2000),
  is_correct     BOOLEAN NOT NULL,
  attempted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.course_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_quiz_own_all"
  ON public.course_quiz_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE id = enrollment_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE id = enrollment_id AND user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_quiz_responses_enrollment ON public.course_quiz_responses(enrollment_id);

-- ============================================================
-- SECTION 6: IMPACT STORIES (Extended)
-- ============================================================

-- Extend existing stories table if it exists, or create story_submissions
CREATE TABLE IF NOT EXISTS public.story_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) <= 200),
  content       TEXT NOT NULL CHECK (char_length(content) <= 10000),
  hero_image_url TEXT CHECK (char_length(hero_image_url) <= 500),
  tags          TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'approved', 'published', 'rejected'
  )),
  published_at  TIMESTAMPTZ,
  view_count    INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.story_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_public_select_published"
  ON public.story_submissions FOR SELECT
  USING (status = 'published');

CREATE POLICY "stories_own_all"
  ON public.story_submissions FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "stories_mod_all"
  ON public.story_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_stories_status ON public.story_submissions(status);
CREATE INDEX IF NOT EXISTS idx_stories_author ON public.story_submissions(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_published ON public.story_submissions(published_at DESC) WHERE status = 'published';

-- ============================================================
-- SECTION 7: PARTNERSHIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_organizations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL CHECK (char_length(name) <= 300),
  type                 TEXT NOT NULL CHECK (type IN (
    'vet', 'rescue', 'corporate', 'government', 'retail', 'ngo'
  )),
  contact_email        TEXT CHECK (char_length(contact_email) <= 255),
  contact_phone        TEXT CHECK (char_length(contact_phone) <= 30),
  address              TEXT CHECK (char_length(address) <= 500),
  discount_code        TEXT CHECK (char_length(discount_code) <= 100),
  verification_status  TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'verified', 'suspended'
  )),
  partnership_tier     TEXT CHECK (partnership_tier IN (
    'bronze', 'silver', 'gold', 'platinum'
  )),
  benefits             TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view verified partners
CREATE POLICY "partners_public_verified"
  ON public.partner_organizations FOR SELECT
  USING (verification_status = 'verified' AND auth.uid() IS NOT NULL);

-- Admins manage all partners
CREATE POLICY "partners_admin_all"
  ON public.partner_organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_partners_type ON public.partner_organizations(type);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partner_organizations(verification_status);

-- ============================================================
-- SECTION 8: RESEARCH DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.research_data_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_email      TEXT NOT NULL CHECK (char_length(researcher_email) <= 255),
  institution           TEXT NOT NULL CHECK (char_length(institution) <= 500),
  research_purpose      TEXT NOT NULL CHECK (char_length(research_purpose) <= 3000),
  requested_data_types  TEXT[] NOT NULL DEFAULT '{}',
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'expired'
  )),
  approved_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  expiry_date           DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.research_data_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a research request (no auth required)
CREATE POLICY "research_requests_insert_public"
  ON public.research_data_requests FOR INSERT
  WITH CHECK (true);

-- Only admins can view and manage requests
CREATE POLICY "research_requests_admin_all"
  ON public.research_data_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- SECTION 9: ENHANCED AUDIT TRAIL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role      TEXT NOT NULL CHECK (char_length(actor_role) <= 50),
  action_type     TEXT NOT NULL CHECK (char_length(action_type) <= 100),
  target_type     TEXT CHECK (char_length(target_type) <= 100),
  target_id       UUID,
  previous_state  JSONB,
  new_state       JSONB,
  ip_address      INET,
  user_agent      TEXT CHECK (char_length(user_agent) <= 500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit trail
CREATE POLICY "staff_actions_admin_select"
  ON public.staff_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Moderators and admins can insert audit records
CREATE POLICY "staff_actions_mod_insert"
  ON public.staff_actions FOR INSERT
  WITH CHECK (
    auth.uid() = actor_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_staff_actions_actor ON public.staff_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_staff_actions_type ON public.staff_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_staff_actions_target ON public.staff_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_staff_actions_created ON public.staff_actions(created_at DESC);

-- ============================================================
-- SECTION 10: VOLUNTEER MATCHING RPC (Rules-based, ML in v1.0.0)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_volunteer_matches(
  p_colony_id UUID,
  p_limit     INTEGER DEFAULT 10
)
RETURNS TABLE (
  volunteer_id   UUID,
  display_name   TEXT,
  match_score    DECIMAL,
  matching_skills TEXT[]
)
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    vs.user_id AS volunteer_id,
    p.display_name,
    -- Simple scoring: count matching skills + availability bonus
    (COUNT(vs.skill_type)::DECIMAL / 3.0) AS match_score,
    ARRAY_AGG(vs.skill_type) AS matching_skills
  FROM public.volunteer_skills vs
  JOIN public.profiles p ON p.id = vs.user_id
  WHERE vs.verified = true
  GROUP BY vs.user_id, p.display_name
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- END: 0004_social_impact.sql
-- Tables created: 15
-- RLS policies: 30+
-- Triggers: 4
-- Functions: 3
-- Indexes: 20+
-- Version: v0.9.0
-- ============================================================
