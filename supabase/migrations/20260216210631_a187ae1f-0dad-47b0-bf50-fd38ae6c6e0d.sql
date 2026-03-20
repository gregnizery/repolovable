
-- Update the trigger to skip team creation if user has a pending invitation
CREATE OR REPLACE FUNCTION public.handle_new_user_team()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_invitation RECORD;
BEGIN
  -- Check if user has a pending invitation
  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;

  IF v_invitation.id IS NOT NULL THEN
    -- User was invited: add them to the invited team
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_invitation.team_id, NEW.id, v_invitation.role);

    -- Mark invitation as accepted
    UPDATE public.team_invitations
    SET status = 'accepted'
    WHERE id = v_invitation.id;
  ELSE
    -- No invitation: create a default team
    INSERT INTO public.teams (name, owner_id)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon équipe'), NEW.id)
    RETURNING id INTO v_team_id;

    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$function$;
