-- Add B2B sharing toggle to materiel
ALTER TABLE public.materiel ADD COLUMN IF NOT EXISTS is_b2b_shared BOOLEAN DEFAULT false;

-- Add mission_id reference to subrent_requests
ALTER TABLE public.subrent_requests ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL;

-- Create an index to quickly find subrent requests for a given mission
CREATE INDEX IF NOT EXISTS idx_subrent_requests_mission_id ON public.subrent_requests(mission_id);

-- Update RLS policies to allow connected teams to view shared materiel
-- Note: the actual fetching is typically done via an Edge Function OR
-- we assume the requester gets the `suppliers.connected_team_id` from their `suppliers` table and queries `materiel` table where `team_id = X AND is_b2b_shared = true`.
-- In Supabase, if the user doesn't have RLS access to `materiel` for another team, it won't work client-side unless the policy allows it.

-- Let's add a policy allowing read access to B2B shared materiel if the user's team is connected to the materiel's team.
-- Step 1: Drop policy if it exists to avoid error
DROP POLICY IF EXISTS "Users can view B2B shared materiel of connected teams" ON public.materiel;

-- Step 2: Create the policy
CREATE POLICY "Users can view B2B shared materiel of connected teams"
ON public.materiel
FOR SELECT
USING (
    is_b2b_shared = true
    AND EXISTS (
        -- The user is part of a team (team_members)
        -- That team has a supplier record pointing to the materiel's team
        SELECT 1
        FROM public.team_members tm
        JOIN public.suppliers s ON s.team_id = tm.team_id
        WHERE tm.user_id = auth.uid()
        AND s.connected_team_id = materiel.team_id
    )
);
