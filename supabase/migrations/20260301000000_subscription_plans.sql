-- Create Enum for subscription plans
DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM ('free', 'solo', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add plan column to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS plan subscription_plan NOT NULL DEFAULT 'free';

-- Migrate existing teams to 'pro' plan as a gesture (or keep as 'free')
-- UPDATE public.teams SET plan = 'pro' WHERE plan = 'free';

-- Refresh RLS to ensure metadata is visible if needed
-- (Usually teams are accessible to members, so the column will be readable)
