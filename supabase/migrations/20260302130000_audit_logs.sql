-- MIGRATION: 20260302130000_audit_logs.sql
-- Description: Système d'audit pour tracer les modifications sensibles

-- 1. CRÉATION DE LA TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now(),
    metadata jsonb
);

-- 2. INDEXATION
CREATE INDEX IF NOT EXISTS idx_audit_logs_team_id ON public.audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 3. SÉCURITÉ (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/Managers list audit logs" ON public.audit_logs;
CREATE POLICY "Admin/Managers list audit logs" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = audit_logs.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('admin', 'manager')
        )
        OR 
        (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
    );


-- 4. FONCTION DE TRIGGER GÉNÉRIQUE
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_team_id uuid;
    v_user_id uuid := auth.uid();
    v_old_data jsonb := NULL;
    v_new_data jsonb := NULL;
BEGIN
    -- Récupération du team_id
    -- Si la table parente a un team_id, on l'utilise
    IF TG_TABLE_NAME = 'teams' THEN
        v_team_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
    ELSIF TG_TABLE_NAME = 'profiles' THEN
        SELECT team_id INTO v_team_id FROM public.team_members WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) LIMIT 1;
    ELSE
        -- Pour les autres tables (clients, paiements, etc.) qui ont team_id
        IF (TG_OP = 'DELETE') THEN
            v_team_id := OLD.team_id;
        ELSE
            v_team_id := NEW.team_id;
        END IF;
    END IF;

    -- Préparation des données JSON
    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
    END IF;

    -- Masquage des données sensibles
    IF v_old_data ? 'iban' THEN v_old_data := v_old_data || '{"iban": "****", "bic": "****"}'::jsonb; END IF;
    IF v_new_data ? 'iban' THEN v_new_data := v_new_data || '{"iban": "****", "bic": "****"}'::jsonb; END IF;

    -- Insertion du log
    INSERT INTO public.audit_logs (
        team_id, user_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
        v_team_id, v_user_id, TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_old_data, v_new_data
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. APPLICATION DES TRIGGERS
DROP TRIGGER IF EXISTS tr_audit_teams ON public.teams;
CREATE TRIGGER tr_audit_teams AFTER INSERT OR UPDATE OR DELETE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_profiles ON public.profiles;
CREATE TRIGGER tr_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_team_members ON public.team_members;
CREATE TRIGGER tr_audit_team_members AFTER INSERT OR UPDATE OR DELETE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_paiements ON public.paiements;
CREATE TRIGGER tr_audit_paiements AFTER INSERT OR UPDATE OR DELETE ON public.paiements FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_clients ON public.clients;
CREATE TRIGGER tr_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
