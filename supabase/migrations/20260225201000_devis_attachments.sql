-- Create the devis_attachments table
CREATE TABLE IF NOT EXISTS public.devis_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    size INTEGER,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.devis_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's devis attachments"
ON public.devis_attachments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.user_id = auth.uid()
        AND team_members.team_id = devis_attachments.team_id
    )
);

CREATE POLICY "Users can upload devis attachments to their team's devis"
ON public.devis_attachments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.user_id = auth.uid()
        AND team_members.team_id = devis_attachments.team_id
    )
);

CREATE POLICY "Users can delete their team's devis attachments"
ON public.devis_attachments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.user_id = auth.uid()
        AND team_members.team_id = devis_attachments.team_id
    )
);

-- Bucket for devis attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('devis-attachments', 'devis-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'devis_attachments' );

CREATE POLICY "Authenticated users can upload devis attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'devis_attachments' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own devis attachments"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'devis_attachments'
    AND auth.role() = 'authenticated'
);
