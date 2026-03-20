ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS margin_cost_labor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_cost_logistics numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_cost_equipment_depreciation numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_snapshot jsonb;

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS margin_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS margin_real_amount numeric;
