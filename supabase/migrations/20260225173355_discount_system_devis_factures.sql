-- Add discount fields to devis_items
ALTER TABLE "public"."devis_items" 
ADD COLUMN "discount_amount" numeric DEFAULT 0 NOT NULL,
ADD COLUMN "discount_type" text DEFAULT 'percent'::text NOT NULL;

-- Add discount fields to facture_items
ALTER TABLE "public"."facture_items" 
ADD COLUMN "discount_amount" numeric DEFAULT 0 NOT NULL,
ADD COLUMN "discount_type" text DEFAULT 'percent'::text NOT NULL;

-- Add discount fields to devis (Global discount)
ALTER TABLE "public"."devis" 
ADD COLUMN "discount_amount" numeric DEFAULT 0 NOT NULL,
ADD COLUMN "discount_type" text DEFAULT 'percent'::text NOT NULL;

-- Add discount fields to factures (Global discount)
ALTER TABLE "public"."factures" 
ADD COLUMN "discount_amount" numeric DEFAULT 0 NOT NULL,
ADD COLUMN "discount_type" text DEFAULT 'percent'::text NOT NULL;
