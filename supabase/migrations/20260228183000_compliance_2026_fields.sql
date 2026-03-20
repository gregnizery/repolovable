-- Migration for 2026 Billing Reform Compliance
-- Adding fields required for e-invoicing and legal transparency

ALTER TABLE public.white_label_settings 
ADD COLUMN IF NOT EXISTS tva_intra TEXT,
ADD COLUMN IF NOT EXISTS legal_form TEXT,
ADD COLUMN IF NOT EXISTS capital_social TEXT,
ADD COLUMN IF NOT EXISTS rcs_number TEXT;

-- Add descriptions for documentation/UI hints (optional, but good for future-proofing)
COMMENT ON COLUMN public.white_label_settings.tva_intra IS 'Numéro de TVA intracommunautaire';
COMMENT ON COLUMN public.white_label_settings.legal_form IS 'Forme juridique (ex: SAS, SARL, EURL)';
COMMENT ON COLUMN public.white_label_settings.capital_social IS 'Capital social de l''entreprise';
COMMENT ON COLUMN public.white_label_settings.rcs_number IS 'Numéro RCS et ville d''immatriculation';
