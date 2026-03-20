-- Migration: Fix Provider Visibility & Onboarding
-- 1. Add is_onboarded column to providers table
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;

-- 2. Update existing providers to be marked as onboarded
-- (Assuming existing providers in the table have already filled some info)
UPDATE public.providers SET is_onboarded = true WHERE is_onboarded = false;

-- 3. Create or replace the function to handle automatic provider record creation
CREATE OR REPLACE FUNCTION public.handle_provider_membership()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if the role is 'prestataire'
    IF NEW.role = 'prestataire' THEN
        -- Insert a skeleton record in providers table
        -- We try to get the name from the profile if it exists
        INSERT INTO public.providers (user_id, team_id, name, contact_info, is_onboarded)
        SELECT 
            NEW.user_id, 
            NEW.team_id, 
            COALESCE(
                NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), 
                p.company_name, 
                NEW.email, 
                'Nouveau Prestataire'
            ),
            jsonb_build_object('email', NEW.email),
            false
        FROM public.profiles p
        WHERE p.user_id = NEW.user_id
        ON CONFLICT (user_id, team_id) DO NOTHING;

        -- If no profile exists yet, the insert from select might fail/do nothing.
        -- Fallback for when profile isn't created yet (rare due to trigger order but safe)
        IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = NEW.user_id AND team_id = NEW.team_id) THEN
            INSERT INTO public.providers (user_id, team_id, name, contact_info, is_onboarded)
            VALUES (
                NEW.user_id, 
                NEW.team_id, 
                COALESCE(NEW.email, 'Prestataire en attente'),
                jsonb_build_object('email', NEW.email),
                false
            )
            ON CONFLICT (user_id, team_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on team_members
DROP TRIGGER IF EXISTS on_team_member_created_provider ON public.team_members;
CREATE TRIGGER on_team_member_created_provider
AFTER INSERT OR UPDATE OF role ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_provider_membership();

-- 5. Backfill any missing providers for current team members with 'prestataire' role
INSERT INTO public.providers (user_id, team_id, name, contact_info, is_onboarded)
SELECT 
    tm.user_id, 
    tm.team_id, 
    COALESCE(
        NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), 
        p.company_name, 
        tm.email, 
        'Prestataire Existant'
    ),
    jsonb_build_object('email', tm.email),
    true -- Mark existing ones as onboarded to avoid disrupting them
FROM public.team_members tm
LEFT JOIN public.profiles p ON tm.user_id = p.user_id
LEFT JOIN public.providers pr ON tm.user_id = pr.user_id AND tm.team_id = pr.team_id
WHERE tm.role = 'prestataire' AND pr.id IS NULL
ON CONFLICT (user_id, team_id) DO NOTHING;
