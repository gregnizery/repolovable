-- Workspace routing support for Azure POC and future subdomain-based tenancy.

ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS workspace_slug text;

CREATE OR REPLACE FUNCTION public.normalize_workspace_slug(raw_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := lower(trim(coalesce(raw_value, '')));
  normalized := regexp_replace(normalized, '[^a-z0-9]+', '-', 'g');
  normalized := regexp_replace(normalized, '(^-+|-+$)', '', 'g');

  IF normalized = '' THEN
    normalized := 'workspace';
  END IF;

  RETURN left(normalized, 48);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_workspace_slug(p_team_id uuid, raw_value text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix integer := 0;
BEGIN
  base_slug := public.normalize_workspace_slug(raw_value);
  candidate := base_slug;

  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.workspace_slug = candidate
        AND t.id <> p_team_id
    );

    suffix := suffix + 1;
    candidate := left(base_slug, greatest(1, 48 - length(suffix::text) - 1)) || '-' || suffix::text;
  END LOOP;

  RETURN candidate;
END;
$$;

UPDATE public.teams t
SET workspace_slug = public.generate_unique_workspace_slug(
  t.id,
  coalesce(nullif(trim(t.workspace_slug), ''), t.name)
)
WHERE t.workspace_slug IS NULL
   OR trim(t.workspace_slug) = '';

ALTER TABLE public.teams
ALTER COLUMN workspace_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teams_workspace_slug_key
ON public.teams (workspace_slug);

CREATE OR REPLACE FUNCTION public.ensure_team_workspace_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.id := coalesce(NEW.id, gen_random_uuid());

  IF TG_OP = 'INSERT'
     OR NEW.workspace_slug IS DISTINCT FROM OLD.workspace_slug
     OR NEW.workspace_slug IS NULL
     OR trim(NEW.workspace_slug) = '' THEN
    NEW.workspace_slug := public.generate_unique_workspace_slug(
      NEW.id,
      coalesce(nullif(trim(NEW.workspace_slug), ''), NEW.name)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_team_workspace_slug_before_write ON public.teams;
CREATE TRIGGER ensure_team_workspace_slug_before_write
BEFORE INSERT OR UPDATE OF name, workspace_slug ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.ensure_team_workspace_slug();

NOTIFY pgrst, 'reload schema';

