
-- Add profile fields to providers table
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_document_url text,
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS rib_document_url text,
  ADD COLUMN IF NOT EXISTS urssaf_document_url text;

-- Create storage bucket for provider documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-documents', 'provider-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: providers can upload their own files
CREATE POLICY "Authenticated users can upload provider documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'provider-documents');

CREATE POLICY "Anyone can view provider documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'provider-documents');

CREATE POLICY "Users can update their own provider documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'provider-documents');

CREATE POLICY "Users can delete their own provider documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'provider-documents');
