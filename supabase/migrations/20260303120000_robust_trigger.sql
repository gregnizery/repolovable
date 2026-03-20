-- Ce script va identifier et supprimer TOUS les triggers personnalisés sur auth.users
-- puis réinstaller uniquement le trigger minimal et robuste.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
          AND tgname NOT LIKE 'RI_ConstraintTrigger%'
          AND tgname NOT LIKE 'pg_sync%'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON auth.users';
    END LOOP;
END $$;

-- Recréer la fonction (ultra-minimale)
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_role public.app_role;
  v_team_name TEXT;
  v_invitation_token TEXT;
  v_invitation_record RECORD;
BEGIN
  -- Extract metadata
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'technicien')::public.app_role;
  v_invitation_token := NEW.raw_user_meta_data->>'invitation_token';

  -- 1. Upsert Profile (ALWAYS do this first)
  INSERT INTO public.profiles (user_id, first_name, last_name, company_name)
  VALUES (
    NEW.id,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    company_name = EXCLUDED.company_name,
    updated_at = now();

  -- 2. Handle Invitation Flow if token is present
  IF v_invitation_token IS NOT NULL THEN
    -- Try to find and process the invitation
    SELECT * INTO v_invitation_record 
    FROM public.team_invitations 
    WHERE token::text = v_invitation_token 
      AND status = 'pending' 
      AND expires_at > now()
    LIMIT 1;

     IF v_invitation_record IS NOT NULL THEN
      -- Link user to the team from invitation
      INSERT INTO public.team_members (team_id, user_id, role)
      VALUES (v_invitation_record.team_id, NEW.id, v_invitation_record.role)
      ON CONFLICT (team_id, user_id) DO NOTHING;

      -- Mark invitation as accepted
      UPDATE public.team_invitations 
      SET status = 'accepted' 
      WHERE id = v_invitation_record.id;
      
      -- If we linked them, we are done
      RETURN NEW;
    END IF;
  END IF;

  -- 3. Normal Admin Flow (only if NOT an invitation link and user is admin)
  IF v_role = 'admin' AND v_invitation_token IS NULL THEN
    v_team_name := COALESCE(
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), ''),
      split_part(NEW.email, '@', 1),
      'Mon équipe'
    );

    INSERT INTO public.teams (name, owner_id)
    VALUES (v_team_name, NEW.id)
    RETURNING id INTO v_team_id;
    
    IF v_team_id IS NOT NULL THEN
      INSERT INTO public.team_members (team_id, user_id, role)
      VALUES (v_team_id, NEW.id, 'admin')
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Last resort, always return NEW to avoid blocking auth
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attacher uniquement le bon trigger
CREATE TRIGGER on_auth_user_created_complete
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();
