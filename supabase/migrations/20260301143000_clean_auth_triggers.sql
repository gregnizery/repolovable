-- CLEANUP AUTH TRIGGERS & UNIFY REGISTRATION LOGIC
-- This migration drops all legacy triggers and ensures ONLY one trigger exists for auth.users.

-- 1. Drop all known legacy triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_team ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;

-- 2. Drop legacy functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_team();

-- 3. Unified registration function
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_company_name TEXT;
  v_role TEXT;
BEGIN
  -- Extract metadata
  v_company_name := NULLIF(NEW.raw_user_meta_data->>'company_name', '');
  v_role := NEW.raw_user_meta_data->>'role';

  -- 1. Create/Update Profile
  INSERT INTO public.profiles (user_id, first_name, last_name, company_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_company_name
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    company_name = EXCLUDED.company_name,
    updated_at = now();

  -- 2. Create Default Team ONLY for real Admins
  -- We check for 'admin' role in metadata. 
  -- Users invited or registering as providers/clients should NOT get a team created here.
  IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
    INSERT INTO public.teams (name, owner_id)
    VALUES (v_company_name, NEW.id)
    RETURNING id INTO v_team_id;

    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, NEW.id, 'admin')
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Re-attach the trigger with a clean name
CREATE TRIGGER on_auth_user_created_complete
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();

-- 5. Data Cleanup
-- Remove ghost memberships and teams for users who have no business having them
-- Specifically: members added as 'admin' to a team they own but that was auto-created
DELETE FROM public.team_members
WHERE role = 'admin' 
  AND user_id IN (
    SELECT id FROM auth.users WHERE COALESCE(raw_user_meta_data->>'role', '') != 'admin'
  )
  AND team_id IN (
    SELECT id FROM public.teams WHERE name IN ('Mon équipe', 'Ma nouvelle équipe', 'Mon Entreprise', 'Planify')
  );

DELETE FROM public.teams
WHERE name IN ('Mon équipe', 'Ma nouvelle équipe', 'Mon Entreprise', 'Planify')
  AND owner_id IN (
    SELECT id FROM auth.users WHERE COALESCE(raw_user_meta_data->>'role', '') != 'admin'
  )
  AND id NOT IN (SELECT team_id FROM public.team_members WHERE user_id != owner_id);
