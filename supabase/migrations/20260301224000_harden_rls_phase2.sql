-- Harden RLS Phase 2 - 2026-03-01
-- Addressing critical leaks and enforcing quotas

-- 1. Fix team_members leak (Admins from any team could see all members)
DROP POLICY IF EXISTS "Admins see team members" ON public.team_members;
CREATE POLICY "Admins see team members"
ON public.team_members FOR ALL TO authenticated
USING (
    public.user_has_team_access(auth.uid(), team_id, ARRAY['admin']::app_role[])
);

-- 2. Harden providers (Hide sensitive info from non-admins)
-- For now, we restrict the whole table to admin/manager to protect IBANs/Documents.
-- If technicians need the list for assignment, a view should be created later.
DROP POLICY IF EXISTS "Users can view their team's providers" ON public.providers;
CREATE POLICY "Admin/manager view providers"
ON public.providers FOR SELECT
USING (
    public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
);

-- Note: "Admins and managers can manage providers" is already restricted correctly.

-- 3. Harden b2b_invitations (Hide invitations/tokens from technicians/prestataires)
DROP POLICY IF EXISTS "Users can view their team outgoing invitations" ON public.b2b_invitations;
CREATE POLICY "Admin/manager view b2b invitations"
ON public.b2b_invitations FOR SELECT
USING (
    public.user_has_team_access(auth.uid(), inviting_team_id, ARRAY['admin','manager']::app_role[])
);

-- 4. Server-side Mission Quota Enforcement
CREATE OR REPLACE FUNCTION public.check_mission_quota()
RETURNS TRIGGER AS $$
DECLARE
    v_plan text;
    v_count integer;
    v_limit integer;
BEGIN
    -- Get team plan
    SELECT plan INTO v_plan FROM public.teams WHERE id = NEW.team_id;
    
    -- "Suite" and "Pro" are unlimited for missions
    IF v_plan = 'suite' OR v_plan = 'pro' THEN
        RETURN NEW;
    END IF;
    
    -- Default to Free plan limits
    v_limit := 5; -- Monthly limit for Free plan
    
    -- Count missions created this month by this team
    SELECT COUNT(*) INTO v_count
    FROM public.missions
    WHERE team_id = NEW.team_id
      AND created_at >= date_trunc('month', now())
      AND created_at < date_trunc('month', now() + interval '1 month');
      
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Quota de missions atteint pour votre plan actuel (%)', v_plan
        USING ERRCODE = 'P0001'; -- Custom error code for quota reached
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_mission_quota ON public.missions;
CREATE TRIGGER tr_check_mission_quota
BEFORE INSERT ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.check_mission_quota();
