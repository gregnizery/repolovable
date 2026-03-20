-- Create Enum for template types
DO $$ BEGIN
    CREATE TYPE template_type AS ENUM ('gestion', 'technique', 'autre');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invoice Item Templates
CREATE TABLE IF NOT EXISTS public.invoice_item_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    type template_type NOT NULL DEFAULT 'autre',
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.invoice_item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's templates"
    ON public.invoice_item_templates FOR SELECT
    USING (team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create their team's templates"
    ON public.invoice_item_templates FOR INSERT
    WITH CHECK (team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their team's templates"
    ON public.invoice_item_templates FOR UPDATE
    USING (team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their team's templates"
    ON public.invoice_item_templates FOR DELETE
    USING (team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ));

-- Provider assignments on devis and factures
ALTER TABLE public.devis_items ADD COLUMN provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.facture_items ADD COLUMN provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- White Label Settings extensions
ALTER TABLE public.white_label_settings ADD COLUMN IF NOT EXISTS is_tva_subject BOOLEAN DEFAULT true;
ALTER TABLE public.white_label_settings ADD COLUMN IF NOT EXISTS tva_rates JSONB DEFAULT '[0, 5.5, 10, 20]'::jsonb;
ALTER TABLE public.white_label_settings ADD COLUMN IF NOT EXISTS cgv_text TEXT;
ALTER TABLE public.white_label_settings ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.white_label_settings ADD COLUMN IF NOT EXISTS bic TEXT;
