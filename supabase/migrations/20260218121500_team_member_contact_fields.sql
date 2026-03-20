ALTER TABLE public.team_members
ADD COLUMN email TEXT,
ADD COLUMN display_first_name TEXT,
ADD COLUMN display_last_name TEXT;

UPDATE public.team_members tm
SET email = au.email
FROM auth.users au
WHERE au.id = tm.user_id
  AND tm.email IS NULL;

CREATE OR REPLACE FUNCTION public.set_team_member_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    SELECT u.email INTO NEW.email
    FROM auth.users u
    WHERE u.id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_team_member_defaults_before_insert ON public.team_members;

CREATE TRIGGER set_team_member_defaults_before_insert
BEFORE INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.set_team_member_defaults();
