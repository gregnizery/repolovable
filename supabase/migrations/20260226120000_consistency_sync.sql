-- Consistency Sync & Backfill
-- Ensures that existing users in auth.users have matching profiles and teams after a reset.

-- 1. Profile Backfill
INSERT INTO public.profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 2. Team Backfill
-- Identify users who don't have ANY team membership
DO $$
DECLARE
    u RECORD;
    v_team_id UUID;
BEGIN
    FOR u IN 
        SELECT id, COALESCE(raw_user_meta_data->>'company_name', 'Mon équipe') as team_name 
        FROM auth.users 
        WHERE id NOT IN (SELECT user_id FROM public.team_members)
    LOOP
        -- Create a default team for the user
        INSERT INTO public.teams (name, owner_id)
        VALUES (u.team_name, u.id)
        RETURNING id INTO v_team_id;

        -- Add user as admin of their new team
        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (v_team_id, u.id, 'admin');
    END LOOP;
END $$;

-- 3. Ensure all tables have team_id populated from the user's team
-- This fixes legacy data that might have lost its team_id link
UPDATE public.clients SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.missions SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.devis SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.factures SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.paiements SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.materiel SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;

-- 4. Fix potential missing triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_team') THEN
        CREATE TRIGGER on_auth_user_created_team
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_team();
    END IF;
END $$;
