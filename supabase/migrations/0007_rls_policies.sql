-- supabase/migrations/0007_rls_policies.sql
-- ═══════════════════════════════════════════════════════════════
-- RLS Policies — Principle of Least Privilege
-- ═══════════════════════════════════════════════════════════════

-- PROFILES
CREATE POLICY "profiles_select_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER_CONSENTS
CREATE POLICY "consents_select_own"   ON public.user_consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consents_insert_own"   ON public.user_consents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CATS — Read all, write own only
CREATE POLICY "cats_select_all"       ON public.cats FOR SELECT USING (true);
CREATE POLICY "cats_insert_own"       ON public.cats FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "cats_update_own"       ON public.cats FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "cats_delete_own"       ON public.cats FOR DELETE USING (auth.uid() = owner_id);

-- TNR_EVENTS
CREATE POLICY "events_select_all"     ON public.tnr_events FOR SELECT USING (true);
CREATE POLICY "events_insert_auth"    ON public.tnr_events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "events_update_own"     ON public.tnr_events FOR UPDATE USING (auth.uid() = organizer_id);

-- EVENT_SIGNUPS
CREATE POLICY "signups_select_auth"   ON public.event_signups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "signups_insert_auth"   ON public.event_signups FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POINT_LOG — No user-facing write access (service_role only via award_points function)
CREATE POLICY "pointlog_select_own"   ON public.point_log FOR SELECT USING (auth.uid() = user_id);
-- Deliberately NO INSERT/UPDATE/DELETE policy — service_role bypasses RLS

-- USER_BADGES
CREATE POLICY "badges_select_all"     ON public.badges FOR SELECT USING (true);
CREATE POLICY "userbadges_select_own" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
