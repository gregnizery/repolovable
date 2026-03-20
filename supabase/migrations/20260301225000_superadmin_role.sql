-- SuperAdmin Role & RLS - 2026-03-01
-- Adding global admin capabilities

-- 1. Add is_superadmin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean DEFAULT false;

-- 2. Update teams RLS to allow SuperAdmin total access
DROP POLICY IF EXISTS "SuperAdmins see all teams" ON public.teams;
CREATE POLICY "SuperAdmins see all teams"
ON public.teams FOR ALL TO authenticated
USING (
    (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- 3. Update team_members RLS for SuperAdmin
DROP POLICY IF EXISTS "SuperAdmins see all members" ON public.team_members;
CREATE POLICY "SuperAdmins see all members"
ON public.team_members FOR ALL TO authenticated
USING (
    (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- 4. RPC for safe team deletion (Cleaning all related data)
CREATE OR REPLACE FUNCTION public.delete_team_safely(p_team_id uuid)
RETURNS void AS $$
DECLARE
    v_is_superadmin boolean;
BEGIN
    -- Security check: only superadmins can call this
    SELECT is_superadmin INTO v_is_superadmin FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_is_superadmin IS NOT TRUE THEN
        RAISE EXCEPTION 'Accès refusé. Seul un SuperAdmin peut supprimer une équipe.'
        USING ERRCODE = 'P0001';
    END IF;

    -- Delete in cascades or manually where fkeys are not cascade
    -- Note: Most tables should have ON DELETE CASCADE if designed well,
    -- but we perform manual cleanup for safety on critical tables.
    
    DELETE FROM public.paiements WHERE team_id = p_team_id;
    DELETE FROM public.factures WHERE team_id = p_team_id;
    DELETE FROM public.devis WHERE team_id = p_team_id;
    DELETE FROM public.missions WHERE team_id = p_team_id;
    DELETE FROM public.clients WHERE team_id = p_team_id;
    DELETE FROM public.materiel WHERE team_id = p_team_id;
    DELETE FROM public.providers WHERE team_id = p_team_id;
    DELETE FROM public.team_members WHERE team_id = p_team_id;
    DELETE FROM public.teams WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
