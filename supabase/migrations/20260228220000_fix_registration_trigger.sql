-- Fix Registration Data Persistence and Team Creation Logic
-- This migration updates the handle_new_user_complete function to correctly 
-- extract metadata and handle invited users.

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

  -- 1. Create/Update Profile with full metadata from auth.users
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

  -- 2. Create Default Team ONLY for new Admins (Normal Signup)
  -- If it's an invitation (v_role is likely empty or not 'admin' in metadata), 
  -- or if company name is missing, we don't create a team here.
  -- This prevents "ghost" teams for invited employees.
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

-- Re-trigger a backfill for any users created correctly in auth but missing profiles or names
UPDATE public.profiles p
SET 
  first_name = u.raw_user_meta_data->>'first_name',
  last_name = u.raw_user_meta_data->>'last_name',
  company_name = NULLIF(u.raw_user_meta_data->>'company_name', '')
FROM auth.users u
WHERE p.user_id = u.id 
  AND (p.first_name IS NULL OR p.last_name IS NULL OR p.company_name IS NULL)
  AND (u.raw_user_meta_data->>'first_name' IS NOT NULL);
