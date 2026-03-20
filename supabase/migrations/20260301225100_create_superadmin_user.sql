-- SCRIPT MASTER SUPERADMIN - 2026-03-01
-- Ce script fait tout : Schéma + RLS + Création du compte

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'superadmin@planify.com';
  v_password text := 'greg2026';
BEGIN
  -- 1. MISE À JOUR DU SCHÉMA
  -- Ajouter la colonne is_superadmin si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_superadmin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_superadmin boolean DEFAULT false;
  END IF;

  -- 2. POLITIQUES RLS (Accès total pour SuperAdmin)
  DROP POLICY IF EXISTS "SuperAdmins see all teams" ON public.teams;
  CREATE POLICY "SuperAdmins see all teams" ON public.teams FOR ALL TO authenticated
  USING ((SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true);

  DROP POLICY IF EXISTS "SuperAdmins see all members" ON public.team_members;
  CREATE POLICY "SuperAdmins see all members" ON public.team_members FOR ALL TO authenticated
  USING ((SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true);

  -- 3. CRÉATION DE L'UTILISATEUR AUTH
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, last_sign_in_at, raw_app_meta_data, 
      raw_user_meta_data, is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, confirmation_sent_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin Planify"}', false, now(), now(), '', '', '', now()
    );
  END IF;

  -- 4. PROFIL PUBLIC
  INSERT INTO public.profiles (user_id, first_name, last_name, is_superadmin)
  VALUES (v_user_id, 'Super', 'Admin', true)
  ON CONFLICT (user_id) DO UPDATE SET is_superadmin = true, first_name = 'Super', last_name = 'Admin';

  -- 5. IDENTITÉ AUTH
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, v_email)::jsonb,
      'email',
      v_user_id, -- provider_id est requis et correspond souvent à l'id utilisateur pour email
      now(),
      now(),
      now()
    );
  END IF;

END $$;

-- 6. FONCTION DE SUPPRESSION SÉCURISÉE (En dehors du bloc DO pour éviter les problèmes de transaction)
CREATE OR REPLACE FUNCTION public.delete_team_safely(p_team_id uuid)
RETURNS void AS $$
DECLARE
    v_is_superadmin boolean;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.profiles WHERE user_id = auth.uid();
    IF v_is_superadmin IS NOT TRUE THEN
        RAISE EXCEPTION 'Accès refusé.' USING ERRCODE = 'P0001';
    END IF;

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
