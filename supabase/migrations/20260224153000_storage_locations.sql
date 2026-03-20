-- Create storage_locations table
CREATE TABLE IF NOT EXISTS public.storage_locations (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    name text NOT NULL,
    address text,
    notes text,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT storage_locations_pkey PRIMARY KEY (id),
    CONSTRAINT storage_locations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT storage_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can view storage locations in their team" ON public.storage_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = storage_locations.team_id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert storage locations in their team" ON public.storage_locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = storage_locations.team_id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update storage locations in their team" ON public.storage_locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = storage_locations.team_id
            AND team_members.user_id = auth.uid()
            AND (team_members.role = 'admin' OR team_members.role = 'manager')
        )
    );

CREATE POLICY "Users can delete storage locations in their team" ON public.storage_locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = storage_locations.team_id
            AND team_members.user_id = auth.uid()
            AND (team_members.role = 'admin' OR team_members.role = 'manager')
        )
    );

-- Add storage_location_id to materiel table
ALTER TABLE public.materiel
ADD COLUMN IF NOT EXISTS storage_location_id uuid;

ALTER TABLE public.materiel
ADD CONSTRAINT materiel_storage_location_id_fkey FOREIGN KEY (storage_location_id) REFERENCES public.storage_locations(id) ON DELETE SET NULL;
