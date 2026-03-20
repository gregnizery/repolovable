
-- Create a security definer function to get team members with profile info and email
CREATE OR REPLACE FUNCTION public.get_team_members_with_profiles(_team_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role app_role,
  created_at timestamptz,
  email text,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    tm.id,
    tm.user_id,
    tm.role,
    tm.created_at,
    u.email::text,
    p.first_name,
    p.last_name,
    p.avatar_url
  FROM public.team_members tm
  LEFT JOIN auth.users u ON u.id = tm.user_id
  LEFT JOIN public.profiles p ON p.user_id = tm.user_id
  WHERE tm.team_id = _team_id
    AND public.is_team_member(auth.uid(), _team_id)
  ORDER BY tm.created_at ASC;
$$;
