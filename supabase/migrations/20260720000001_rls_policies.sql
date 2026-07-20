-- Platinum Center — RLS Policies Migration
-- Roles: super_admin, receptionist, member (stored in profiles.role)

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- Function to safely get the current authenticated user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper to check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'super_admin';
$$;

-- Helper to check if current user is receptionist
CREATE OR REPLACE FUNCTION public.is_receptionist()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'receptionist';
$$;

-- Helper to check if current user is staff (super_admin OR receptionist)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('super_admin', 'receptionist');
$$;

-- Helper to get current user's member_id if they are a member
CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.members WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- ============================================================================
-- 1. POLICIES: profiles
-- Rules: super_admin full access, receptionist read-only, member own profile
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (
        public.is_staff() OR id = auth.uid()
    );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    WITH CHECK (
        public.is_super_admin() OR id = auth.uid()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    USING (
        public.is_super_admin() OR id = auth.uid()
    )
    WITH CHECK (
        public.is_super_admin() OR id = auth.uid()
    );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE
    USING (
        public.is_super_admin()
    );

-- ============================================================================
-- 2. POLICIES: members
-- Rules: super_admin CRUD, receptionist INSERT + UPDATE, member own record
-- ============================================================================

DROP POLICY IF EXISTS "members_select_policy" ON public.members;
CREATE POLICY "members_select_policy" ON public.members
    FOR SELECT
    USING (
        public.is_staff() OR profile_id = auth.uid()
    );

DROP POLICY IF EXISTS "members_insert_policy" ON public.members;
CREATE POLICY "members_insert_policy" ON public.members
    FOR INSERT
    WITH CHECK (
        public.is_staff()
    );

DROP POLICY IF EXISTS "members_update_policy" ON public.members;
CREATE POLICY "members_update_policy" ON public.members
    FOR UPDATE
    USING (
        public.is_staff() OR profile_id = auth.uid()
    )
    WITH CHECK (
        public.is_staff() OR profile_id = auth.uid()
    );

DROP POLICY IF EXISTS "members_delete_policy" ON public.members;
CREATE POLICY "members_delete_policy" ON public.members
    FOR DELETE
    USING (
        public.is_super_admin()
    );

-- ============================================================================
-- 3. POLICIES: payments
-- Rules: super_admin CRUD, receptionist INSERT + SELECT, member own payments
-- ============================================================================

DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy" ON public.payments
    FOR SELECT
    USING (
        public.is_staff() OR member_id = public.get_current_member_id()
    );

DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
CREATE POLICY "payments_insert_policy" ON public.payments
    FOR INSERT
    WITH CHECK (
        public.is_staff()
    );

DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;
CREATE POLICY "payments_update_policy" ON public.payments
    FOR UPDATE
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "payments_delete_policy" ON public.payments;
CREATE POLICY "payments_delete_policy" ON public.payments
    FOR DELETE
    USING (
        public.is_super_admin()
    );

-- ============================================================================
-- 4. POLICIES: member_day_passes
-- Rules: super_admin CRUD, receptionist SELECT, member own passes
-- ============================================================================

DROP POLICY IF EXISTS "member_day_passes_select_policy" ON public.member_day_passes;
CREATE POLICY "member_day_passes_select_policy" ON public.member_day_passes
    FOR SELECT
    USING (
        public.is_staff() OR member_id = public.get_current_member_id()
    );

DROP POLICY IF EXISTS "member_day_passes_insert_policy" ON public.member_day_passes;
CREATE POLICY "member_day_passes_insert_policy" ON public.member_day_passes
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "member_day_passes_update_policy" ON public.member_day_passes;
CREATE POLICY "member_day_passes_update_policy" ON public.member_day_passes
    FOR UPDATE
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "member_day_passes_delete_policy" ON public.member_day_passes;
CREATE POLICY "member_day_passes_delete_policy" ON public.member_day_passes
    FOR DELETE
    USING (
        public.is_super_admin()
    );

-- ============================================================================
-- 5. POLICIES: access_logs
-- Rules: super_admin & receptionist full read, member own logs
-- ============================================================================

DROP POLICY IF EXISTS "access_logs_select_policy" ON public.access_logs;
CREATE POLICY "access_logs_select_policy" ON public.access_logs
    FOR SELECT
    USING (
        public.is_staff() OR member_id = public.get_current_member_id()
    );

DROP POLICY IF EXISTS "access_logs_insert_policy" ON public.access_logs;
CREATE POLICY "access_logs_insert_policy" ON public.access_logs
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "access_logs_update_policy" ON public.access_logs;
CREATE POLICY "access_logs_update_policy" ON public.access_logs
    FOR UPDATE
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "access_logs_delete_policy" ON public.access_logs;
CREATE POLICY "access_logs_delete_policy" ON public.access_logs
    FOR DELETE
    USING (
        public.is_super_admin()
    );

-- ============================================================================
-- 6. POLICIES: suggestions
-- Rules: super_admin CRUD, receptionist SELECT, member INSERT + own suggestions
-- ============================================================================

DROP POLICY IF EXISTS "suggestions_select_policy" ON public.suggestions;
CREATE POLICY "suggestions_select_policy" ON public.suggestions
    FOR SELECT
    USING (
        public.is_staff() OR member_id = public.get_current_member_id()
    );

DROP POLICY IF EXISTS "suggestions_insert_policy" ON public.suggestions;
CREATE POLICY "suggestions_insert_policy" ON public.suggestions
    FOR INSERT
    WITH CHECK (
        public.is_super_admin() OR member_id = public.get_current_member_id()
    );

DROP POLICY IF EXISTS "suggestions_update_policy" ON public.suggestions;
CREATE POLICY "suggestions_update_policy" ON public.suggestions
    FOR UPDATE
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "suggestions_delete_policy" ON public.suggestions;
CREATE POLICY "suggestions_delete_policy" ON public.suggestions
    FOR DELETE
    USING (
        public.is_super_admin()
    );

-- ============================================================================
-- 7. POLICIES: gym_config
-- Rules: super_admin CRUD, receptionist SELECT, member no access
-- ============================================================================

DROP POLICY IF EXISTS "gym_config_select_policy" ON public.gym_config;
CREATE POLICY "gym_config_select_policy" ON public.gym_config
    FOR SELECT
    USING (
        public.is_staff()
    );

DROP POLICY IF EXISTS "gym_config_insert_policy" ON public.gym_config;
CREATE POLICY "gym_config_insert_policy" ON public.gym_config
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "gym_config_update_policy" ON public.gym_config;
CREATE POLICY "gym_config_update_policy" ON public.gym_config
    FOR UPDATE
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "gym_config_delete_policy" ON public.gym_config;
CREATE POLICY "gym_config_delete_policy" ON public.gym_config
    FOR DELETE
    USING (
        public.is_super_admin()
    );

-- ============================================================================
-- 8. POLICIES: plans
-- Rules: Everyone can read, only super_admin can modify
-- ============================================================================

DROP POLICY IF EXISTS "plans_select_policy" ON public.plans;
CREATE POLICY "plans_select_policy" ON public.plans
    FOR SELECT
    USING (
        true
    );

DROP POLICY IF EXISTS "plans_insert_policy" ON public.plans;
CREATE POLICY "plans_insert_policy" ON public.plans
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "plans_update_policy" ON public.plans;
CREATE POLICY "plans_update_policy" ON public.plans
    FOR UPDATE
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "plans_delete_policy" ON public.plans;
CREATE POLICY "plans_delete_policy" ON public.plans
    FOR DELETE
    USING (
        public.is_super_admin()
    );
