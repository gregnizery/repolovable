-- Migration: Migrate teams and update auth trigger
-- This depends on 'suite' value existing in subscription_plan enum

-- 1. Migrate existing teams
UPDATE public.teams SET plan = 'suite' WHERE plan = 'enterprise' AND plan IS NOT NULL;
UPDATE public.teams SET plan = 'pro' WHERE plan = 'solo' AND plan IS NOT NULL;

-- 2. Update the handle_new_user_complete trigger to extract 'plan' from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_company_name TEXT;
  v_role TEXT;
  v_plan TEXT;
BEGIN
  -- Extract metadata
  v_company_name := NULLIF(NEW.raw_user_meta_data->>'company_name', '');
  v_role := NEW.raw_user_meta_data->>'role';
  v_plan := COALESCE(NEW.raw_user_meta_data->>'plan', 'free');

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

  -- 2. Create Default Team ONLY for new Admins (Normal Signup)
  IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
    INSERT INTO public.teams (name, owner_id, plan)
    VALUES (v_company_name, NEW.id, v_plan::subscription_plan)
    RETURNING id INTO v_team_id;

    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, NEW.id, 'admin')
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
