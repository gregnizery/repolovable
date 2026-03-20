-- Enum des rôles d'équipe
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'technicien', 'prestataire');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table des équipes
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Table des membres d'équipe
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'technicien',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Table des invitations
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'technicien',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(team_id, email)
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Ajouter team_id aux tables existantes
ALTER TABLE public.clients ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.missions ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.materiel ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.devis ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.factures ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.paiements ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Fonction utilitaire SECURITY DEFINER pour vérifier l'appartenance à une équipe
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Fonction pour vérifier le rôle dans une équipe
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction pour obtenir le team_id d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id LIMIT 1
$$;

-- RLS: Teams - les membres peuvent voir leur équipe
CREATE POLICY "Team members can view their team"
ON public.teams FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Owners can update their team"
ON public.teams FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- RLS: Team members
CREATE POLICY "Team members can view team members"
ON public.team_members FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admins/owners can manage team members"
ON public.team_members FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id AND t.owner_id = auth.uid()
  )
  OR (public.is_team_member(auth.uid(), team_id) AND public.has_role(auth.uid(), 'admin'))
);

-- RLS: Invitations
CREATE POLICY "Team admins can manage invitations"
ON public.team_invitations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()
  )
  OR (public.is_team_member(auth.uid(), team_id) AND public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Invited users can view their invitations"
ON public.team_invitations FOR SELECT TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Trigger auto-création d'équipe et membership admin à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Créer une équipe par défaut pour le nouvel utilisateur
  INSERT INTO public.teams (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon équipe'), NEW.id)
  RETURNING id INTO v_team_id;

  -- Ajouter l'utilisateur comme admin de son équipe
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_team
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_team();

-- Trigger updated_at pour teams
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
