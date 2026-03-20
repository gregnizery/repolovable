-- MIGRATION: 20260302160000_business_impact.sql
-- Description: Structure pour relances automatiques et paramètres d'équipe

-- 1. AJOUT DU PARAMÈTRE DANS TEAMS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'auto_reminder_enabled') THEN
        ALTER TABLE public.teams ADD COLUMN auto_reminder_enabled boolean DEFAULT false;
    END IF;
END $$;

-- 2. TABLE DES LOGS DE RELANCES
CREATE TABLE IF NOT EXISTS public.payment_reminders_log (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    facture_id uuid REFERENCES public.factures(id) ON DELETE CASCADE NOT NULL,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    sent_at timestamptz DEFAULT now(),
    reminder_type text NOT NULL, -- 'J+7', 'J+15', etc.
    recipient_email text NOT NULL,
    status text DEFAULT 'sent'
);

-- Indexation
CREATE INDEX IF NOT EXISTS idx_payment_reminders_log_facture_id ON public.payment_reminders_log(facture_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_log_team_id ON public.payment_reminders_log(team_id);

-- RLS
ALTER TABLE public.payment_reminders_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view reminder logs" ON public.payment_reminders_log;
CREATE POLICY "Team members can view reminder logs" ON public.payment_reminders_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = payment_reminders_log.team_id
            AND team_members.user_id = auth.uid()
        )
        OR 
        (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
    );


-- 3. VUE POUR DÉTAIL DES MARGES (Correction KPIs)
-- Note: On utilise les colonnes existantes si disponibles ou on prépare le terrain
-- COÛTS MATÉRIEL (Achat/Maintenance) + COÛTS PRESTATAIRES (Daily/Hourly rate)
-- Cette vue aidera à calculer la marge réelle par mission.

NOTIFY pgrst, 'reload schema';
