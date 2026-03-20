-- Fix RLS circular dependency for team_members
-- Allowing users to see their own membership record directly bypasses the necessity
-- for the is_team_member function during the initial fetch.

DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;

CREATE POLICY "Users can view their own memberships"
ON public.team_members FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view fellow members"
ON public.team_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Ensure teams are also visible to owners even if membership check fails
DROP POLICY IF EXISTS "Team members can view their team" ON public.teams;
CREATE POLICY "Team members and owners can view their team"
ON public.teams FOR SELECT TO authenticated
USING (
    owner_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = teams.id AND user_id = auth.uid()
    )
);
