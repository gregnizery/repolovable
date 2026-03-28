-- Create vehicles table
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'utilitaire',
  plate_number text,
  capacity text,
  notes text,
  status text NOT NULL DEFAULT 'disponible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_vehicles_team_id BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS policies
CREATE POLICY "Team members read vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write vehicles" ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admin/manager update vehicles" ON public.vehicles FOR UPDATE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admin/manager delete vehicles" ON public.vehicles FOR DELETE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

-- Add vehicle_id to transport_plans
ALTER TABLE public.transport_plans ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;