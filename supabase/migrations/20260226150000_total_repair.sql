-- TOTAL REPAIR MIGRATION
-- This script unifies Auth triggers, simplifies RLS and ensures data consistency.

-- 1. Unify Auth Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_team ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Create Profile
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create Default Team
  INSERT INTO public.teams (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon équipe'), NEW.id)
  RETURNING id INTO v_team_id;

  -- Create Admin Membership
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, NEW.id, 'admin')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_complete
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();

-- 2. Simplified RLS for Team members (Prevent circularity)
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view fellow members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins/owners can manage team members" ON public.team_members;

-- Minimal policy to allow initial fetch
CREATE POLICY "Any authenticated can see their own memberships"
ON public.team_members FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Policy for team visibility
CREATE POLICY "Admins see team members"
ON public.team_members FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.teams t 
        WHERE t.id = team_members.team_id 
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- 3. Simplified RLS for Teams
DROP POLICY IF EXISTS "Team members can view their team" ON public.teams;
DROP POLICY IF EXISTS "Team members and owners can view their team" ON public.teams;
DROP POLICY IF EXISTS "Owners can update their team" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

CREATE POLICY "View team" ON public.teams FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid()));

CREATE POLICY "Manage team" ON public.teams FOR ALL TO authenticated
USING (owner_id = auth.uid());

-- 4. Forced Backfill for missing data
INSERT INTO public.profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE
    u RECORD;
    v_team_id UUID;
BEGIN
    FOR u IN SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.team_members)
    LOOP
        INSERT INTO public.teams (name, owner_id)
        VALUES ('Ma nouvelle équipe', u.id)
        RETURNING id INTO v_team_id;

        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (v_team_id, u.id, 'admin');
    END LOOP;
END $$;
