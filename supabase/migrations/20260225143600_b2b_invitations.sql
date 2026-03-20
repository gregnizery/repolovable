-- Create B2B invitations table for double opt-in secure connection
CREATE TABLE IF NOT EXISTS public.b2b_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inviting_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.b2b_invitations ENABLE ROW LEVEL SECURITY;

-- Team members can see their own team's outgoing invitations
CREATE POLICY "Users can view their team outgoing invitations"
    ON public.b2b_invitations FOR SELECT
    USING (inviting_team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

-- Team administrators can create invitations
CREATE POLICY "Team admins can create invitations"
    ON public.b2b_invitations FOR INSERT
    WITH CHECK (inviting_team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Admins can update outgoing invitations
CREATE POLICY "Team admins can update their invitations"
    ON public.b2b_invitations FOR UPDATE
    USING (inviting_team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- No trigger for updated_at, will be handled by application code or an existing custom function if needed.
