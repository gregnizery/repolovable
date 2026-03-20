-- MASTER GRANT & RLS FIX
-- This script re-establishes all necessary permissions and fixes RLS barriers.

-- 1. Schema Level Permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- 2. Base Table Permissions for Authenticated Users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. RLS Cleanup & Simplification
-- We ensure that EVERY table has a base policy allowing users to see their own data if user_id exists, 
-- or team data if team_id exists, without complex circular dependencies.

-- Helper for recursive check (simplified)
CREATE OR REPLACE FUNCTION public.check_team_access(_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = _team_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members read clients" ON public.clients;
DROP POLICY IF EXISTS "Admin/manager write clients" ON public.clients;
DROP POLICY IF EXISTS "Admin/manager update clients" ON public.clients;
DROP POLICY IF EXISTS "Admin/manager delete clients" ON public.clients;

CREATE POLICY "Clients access" ON public.clients FOR ALL TO authenticated
USING (public.check_team_access(team_id));

-- MISSIONS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members read missions" ON public.missions;
DROP POLICY IF EXISTS "Admin/manager write missions" ON public.missions;
DROP POLICY IF EXISTS "Admin/manager update missions" ON public.missions;
DROP POLICY IF EXISTS "Admin/manager delete missions" ON public.missions;

CREATE POLICY "Missions access" ON public.missions FOR ALL TO authenticated
USING (public.check_team_access(team_id));

-- DEVIS
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members read devis" ON public.devis;
DROP POLICY IF EXISTS "Admin/manager write devis" ON public.devis;
DROP POLICY IF EXISTS "Admin/manager update devis" ON public.devis;
DROP POLICY IF EXISTS "Admin/manager delete devis" ON public.devis;

CREATE POLICY "Devis access" ON public.devis FOR ALL TO authenticated
USING (public.check_team_access(team_id));

-- FACTURES
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members read factures" ON public.factures;
DROP POLICY IF EXISTS "Admin/manager write factures" ON public.factures;
DROP POLICY IF EXISTS "Admin/manager update factures" ON public.factures;
DROP POLICY IF EXISTS "Admin/manager delete factures" ON public.factures;

CREATE POLICY "Factures access" ON public.factures FOR ALL TO authenticated
USING (public.check_team_access(team_id));

-- MATERIEL
ALTER TABLE public.materiel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members read materiel" ON public.materiel;
DROP POLICY IF EXISTS "Admin/manager/tech write materiel" ON public.materiel;
DROP POLICY IF EXISTS "Admin/manager/tech update materiel" ON public.materiel;
DROP POLICY IF EXISTS "Admin/manager delete materiel" ON public.materiel;

CREATE POLICY "Materiel access" ON public.materiel FOR ALL TO authenticated
USING (public.check_team_access(team_id));

-- PROVIDERS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members can view providers" ON public.providers;
DROP POLICY IF EXISTS "Managers can manage providers" ON public.providers;

CREATE POLICY "Providers access" ON public.providers FOR ALL TO authenticated
USING (public.check_team_access(team_id));

-- 4. Re-Backfill to ensure every user has a team
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
        VALUES ('Mon Entreprise', u.id)
        RETURNING id INTO v_team_id;

        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (v_team_id, u.id, 'admin');
    END LOOP;
END $$;
