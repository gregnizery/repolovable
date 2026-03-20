-- Add tracking_type column to materiel table
ALTER TABLE "public"."materiel" 
ADD COLUMN IF NOT EXISTS "tracking_type" text NOT NULL DEFAULT 'unique';

-- Add a check constraint to ensure only valid tracking types
ALTER TABLE "public"."materiel" 
ADD CONSTRAINT check_tracking_type CHECK (tracking_type IN ('unique', 'batch'));

-- Set existing records based on quantity
-- For existing rows, if quantity > 1, it's a batch, otherwise it's unique
UPDATE "public"."materiel"
SET tracking_type = 'batch'
WHERE quantity > 1;

-- Note: 
-- We don't enforce quantity = 1 for unique at the DB level to allow flexibility/soft limits 
-- but will enforce it strongly at the application level.
