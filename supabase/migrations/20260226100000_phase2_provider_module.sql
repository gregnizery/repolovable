-- Phase 2 : Module Prestataires

-- 0. S'assurer que les colonnes de tarifs existent dans profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;

-- 1. Création de la table providers
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hourly_rate NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    specialties TEXT[] DEFAULT '{}',
    legal_info JSONB DEFAULT '{}'::jsonb,
    contact_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_provider_per_team_and_user UNIQUE (user_id, team_id)
);

-- 2. Activation de la RLS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS
DROP POLICY IF EXISTS "Users can view their team's providers" ON public.providers;
CREATE POLICY "Users can view their team's providers" ON public.providers
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.user_id = auth.uid()
        AND team_members.team_id = providers.team_id
    )
);

DROP POLICY IF EXISTS "Admins and managers can manage providers" ON public.providers;
CREATE POLICY "Admins and managers can manage providers" ON public.providers
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.user_id = auth.uid()
        AND team_members.team_id = providers.team_id
        AND (role = 'admin' OR role = 'manager')
    )
);

-- 4. Migration des prestataires existants
-- On crée une fiche provider pour chaque membre d'équipe ayant le rôle 'prestataire'
INSERT INTO public.providers (user_id, team_id, name, hourly_rate, daily_rate, contact_info)
SELECT 
    tm.user_id, 
    tm.team_id, 
    COALESCE(
        NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), 
        p.company_name, 
        tm.email, 
        'Prestataire Inconnu'
    ),
    COALESCE(p.hourly_rate, 0),
    COALESCE(p.daily_rate, 0),
    jsonb_build_object(
        'email', tm.email,
        'phone', p.phone,
        'address', p.address
    )
FROM public.team_members tm
JOIN public.profiles p ON tm.user_id = p.user_id
WHERE tm.role = 'prestataire'
ON CONFLICT (user_id, team_id) DO NOTHING; 
-- Note: On pourrait ajouter une contrainte unique sur (user_id, team_id) si besoin, 
-- mais pour l'instant on évite les doublons simples lors de la migration.

-- 5. Mise à jour des relations SQL pour devis_items et facture_items
-- On ne peut pas facilement migrer les provider_id existants car ils pointent probablement vers des user_id
-- Donc on va d'abord s'assurer que les colonnes existent et on ajoutera les FK plus tard 
-- une fois que les prestataires seront bien identifiés dans la nouvelle table.

-- Pour l'instant, on ajoute juste la FK si on est sûr
-- ALTER TABLE public.devis_items ADD CONSTRAINT devis_items_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);
-- ALTER TABLE public.facture_items ADD CONSTRAINT facture_items_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);

-- 6. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_providers_updated_at
    BEFORE UPDATE ON public.providers
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
