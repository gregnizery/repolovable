
-- Add insurance and CT expiry dates to vehicles
ALTER TABLE public.vehicles
  ADD COLUMN insurance_expiry date,
  ADD COLUMN ct_expiry date,
  ADD COLUMN mileage integer DEFAULT 0;

-- Create vehicle_costs table for tracking expenses
CREATE TABLE public.vehicle_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  cost_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'autre',
  description text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read vehicle_costs"
  ON public.vehicle_costs FOR SELECT TO authenticated
  USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write vehicle_costs"
  ON public.vehicle_costs FOR INSERT TO authenticated
  WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admin/manager update vehicle_costs"
  ON public.vehicle_costs FOR UPDATE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admin/manager delete vehicle_costs"
  ON public.vehicle_costs FOR DELETE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

-- Auto-set team_id trigger
CREATE TRIGGER set_vehicle_costs_team_id
  BEFORE INSERT ON public.vehicle_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_id_on_insert();

-- Updated_at trigger
CREATE TRIGGER update_vehicle_costs_updated_at
  BEFORE UPDATE ON public.vehicle_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
