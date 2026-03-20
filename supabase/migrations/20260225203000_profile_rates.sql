-- Add rate fields to profiles for provider pricing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL DEFAULT 0;
