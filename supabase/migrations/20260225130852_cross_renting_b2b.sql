-- Migration: Cross-Renting B2B
-- Description: Adds suppliers, B2B network connections, and subrent requests.

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    connected_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- For B2B Planify network
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure team isolation for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team suppliers"
    ON public.suppliers FOR SELECT
    USING (team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create their team suppliers"
    ON public.suppliers FOR INSERT
    WITH CHECK (team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their team suppliers"
    ON public.suppliers FOR UPDATE
    USING (team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their team suppliers"
    ON public.suppliers FOR DELETE
    USING (team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));


-- 2. Modify materiel table for subrenting
ALTER TABLE public.materiel
ADD COLUMN IF NOT EXISTS is_subrented BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subrent_cost DECIMAL(10,2) DEFAULT 0;

-- 3. Create subrent_requests table for B2B requests
CREATE TABLE IF NOT EXISTS public.subrent_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    provider_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    materiel_id UUID REFERENCES public.materiel(id) ON DELETE SET NULL, -- Optional, could just be a text description if not strictly matched
    materiel_name TEXT NOT NULL, -- Keep name as fallback if materiel_id is null
    quantity INTEGER DEFAULT 1,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure RLS for B2B requests
ALTER TABLE public.subrent_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can see requests they sent
CREATE POLICY "Users can view their sent subrent requests"
    ON public.subrent_requests FOR SELECT
    USING (requester_team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

-- Providers can see requests sent to them
CREATE POLICY "Users can view their received subrent requests"
    ON public.subrent_requests FOR SELECT
    USING (provider_team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

-- Requesters can create requests
CREATE POLICY "Users can create subrent requests"
    ON public.subrent_requests FOR INSERT
    WITH CHECK (requester_team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

-- Requesters can update their pending requests (e.g., cancel)
-- Providers can update the status of requests sent to them (e.g., accept/reject)
CREATE POLICY "Users can update subrent requests"
    ON public.subrent_requests FOR UPDATE
    USING (
        (requester_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()) AND status = 'pending')
        OR
        (provider_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
    );

-- Delete policy (usually only requesters can delete/cancel entirely before acceptance)
CREATE POLICY "Users can delete pending sent requests"
    ON public.subrent_requests FOR DELETE
    USING (requester_team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ) AND status = 'pending');
