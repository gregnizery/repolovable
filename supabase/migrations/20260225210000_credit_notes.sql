-- Add credit note support to factures
ALTER TABLE public.factures 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'invoice' CHECK (type IN ('invoice', 'credit_note')),
ADD COLUMN IF NOT EXISTS parent_facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL;

-- Index for parent_facture_id
CREATE INDEX IF NOT EXISTS factures_parent_facture_id_idx ON public.factures(parent_facture_id);
