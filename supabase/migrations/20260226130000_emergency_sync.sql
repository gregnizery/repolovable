-- Emergency Consistency Sync
-- This script ensures that every single user in auth.users has:
-- 1. A profile in public.profiles
-- 2. At least one team they own or are admin of.

-- 1. Profiles
INSERT INTO public.profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 2. Teams & Memberships
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
        -- Check if user already owns a team but is missing from team_members (unlikely but possible)
        SELECT id INTO v_team_id FROM public.teams WHERE owner_id = u.id LIMIT 1;
        
        IF v_team_id IS NULL THEN
            -- Create a new team
            INSERT INTO public.teams (name, owner_id)
            VALUES (u.team_name, u.id)
            RETURNING id INTO v_team_id;
            
            RAISE NOTICE 'Created missing team % for user %', v_team_id, u.id;
        END IF;

        -- Add user as admin of their team
        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (v_team_id, u.id, 'admin')
        ON CONFLICT (team_id, user_id) DO NOTHING;
        
        RAISE NOTICE 'Linked user % to team % as admin', u.id, v_team_id;
    END LOOP;
END $$;

-- 3. Cleanup: ensure team_id is set on everything (even if redundancy)
UPDATE public.clients SET team_id = (SELECT team_id FROM public.team_members WHERE user_id = clients.user_id LIMIT 1) WHERE team_id IS NULL;
UPDATE public.missions SET team_id = (SELECT team_id FROM public.team_members WHERE user_id = missions.user_id LIMIT 1) WHERE team_id IS NULL;
