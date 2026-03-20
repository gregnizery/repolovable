-- MIGRATION: 20260302140000_mission_assignments.sql
-- Description: Gestion des affectations et jetons de synchronisation calendrier

-- 1. EXTENSIONS (Assurer uuid-ossp)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE DES AFFECTATIONS
CREATE TABLE IF NOT EXISTS public.mission_assignments (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(mission_id, user_id)
);

-- Indexation
CREATE INDEX IF NOT EXISTS idx_mission_assignments_mission_id ON public.mission_assignments(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_user_id ON public.mission_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_team_id ON public.mission_assignments(team_id);

-- RLS
ALTER TABLE public.mission_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view assignments" ON public.mission_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = mission_assignments.team_id
            AND team_members.user_id = auth.uid()
        )
        OR 
        (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
    );

CREATE POLICY "Admins/Managers can manage assignments" ON public.mission_assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = mission_assignments.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('admin', 'manager')
        )
        OR 
        (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
    );

-- 3. JETONS DE CALENDRIER DANS PROFILES
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'calendar_token') THEN
        ALTER TABLE public.profiles ADD COLUMN calendar_token uuid DEFAULT extensions.uuid_generate_v4() UNIQUE;
    END IF;
END $$;

-- Remplissage des tokens existants si nécessaire (déjà géré par le DEFAULT si la colonne est nouvelle)
UPDATE public.profiles SET calendar_token = extensions.uuid_generate_v4() WHERE calendar_token IS NULL;

-- Trigger pour générer un token à l'insertion si nécessaire
CREATE OR REPLACE FUNCTION public.generate_calendar_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.calendar_token IS NULL THEN
        NEW.calendar_token := extensions.uuid_generate_v4();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_calendar_token ON public.profiles;
CREATE TRIGGER tr_generate_calendar_token BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.generate_calendar_token();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
