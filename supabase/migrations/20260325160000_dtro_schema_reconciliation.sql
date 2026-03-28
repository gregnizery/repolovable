-- Reconciliation migration for the dtrofhxpazhnobhjrjmu project.
-- The remote project already contains a subset of later local modules.
-- This migration only creates or amends the objects still missing, using idempotent SQL.

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total_ht NUMERIC NOT NULL DEFAULT 0,
  tva_rate NUMERIC NOT NULL DEFAULT 0.20,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'à_payer',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoices' AND policyname = 'Team members read supplier_invoices'
  ) THEN
    EXECUTE 'CREATE POLICY "Team members read supplier_invoices" ON public.supplier_invoices FOR SELECT TO authenticated USING (is_team_member(auth.uid(), team_id))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoices' AND policyname = 'Admin/manager write supplier_invoices'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager write supplier_invoices" ON public.supplier_invoices FOR INSERT TO authenticated
    WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoices' AND policyname = 'Admin/manager update supplier_invoices'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager update supplier_invoices" ON public.supplier_invoices FOR UPDATE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoices' AND policyname = 'Admin/manager delete supplier_invoices'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager delete supplier_invoices" ON public.supplier_invoices FOR DELETE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_team_id_supplier_invoices ON public.supplier_invoices;
CREATE TRIGGER set_team_id_supplier_invoices
  BEFORE INSERT ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

DROP TRIGGER IF EXISTS update_supplier_invoices_updated_at ON public.supplier_invoices;
CREATE TRIGGER update_supplier_invoices_updated_at
  BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.supplier_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id UUID NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_invoice_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoice_items' AND policyname = 'Team read supplier_invoice_items'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Team read supplier_invoice_items" ON public.supplier_invoice_items FOR SELECT TO authenticated
    USING (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE is_team_member(auth.uid(), team_id)))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoice_items' AND policyname = 'Admin write supplier_invoice_items'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin write supplier_invoice_items" ON public.supplier_invoice_items FOR INSERT TO authenticated
    WITH CHECK (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role])))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoice_items' AND policyname = 'Admin update supplier_invoice_items'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin update supplier_invoice_items" ON public.supplier_invoice_items FOR UPDATE TO authenticated
    USING (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role])))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_invoice_items' AND policyname = 'Admin delete supplier_invoice_items'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin delete supplier_invoice_items" ON public.supplier_invoice_items FOR DELETE TO authenticated
    USING (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role])))$policy$;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.equipment_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  materiel_id UUID REFERENCES public.materiel(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkout', 'checkin')),
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT DEFAULT 'bon',
  checked_by UUID,
  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_checkouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_checkouts' AND policyname = 'Team members read equipment_checkouts'
  ) THEN
    EXECUTE 'CREATE POLICY "Team members read equipment_checkouts" ON public.equipment_checkouts FOR SELECT TO authenticated USING (is_team_member(auth.uid(), team_id))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_checkouts' AND policyname = 'Team write equipment_checkouts'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Team write equipment_checkouts" ON public.equipment_checkouts FOR INSERT TO authenticated
    WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role, 'technicien'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_checkouts' AND policyname = 'Team update equipment_checkouts'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Team update equipment_checkouts" ON public.equipment_checkouts FOR UPDATE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role, 'technicien'::app_role]))$policy$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_team_id_equipment_checkouts ON public.equipment_checkouts;
CREATE TRIGGER set_team_id_equipment_checkouts
  BEFORE INSERT ON public.equipment_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

CREATE TABLE IF NOT EXISTS public.transport_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('livraison', 'recuperation', 'récupération')),
  scheduled_at TIMESTAMPTZ,
  address TEXT,
  vehicle TEXT,
  driver_name TEXT,
  status TEXT NOT NULL DEFAULT 'planifié',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transport_plans' AND policyname = 'Team members read transport_plans'
  ) THEN
    EXECUTE 'CREATE POLICY "Team members read transport_plans" ON public.transport_plans FOR SELECT TO authenticated USING (is_team_member(auth.uid(), team_id))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transport_plans' AND policyname = 'Admin/manager write transport_plans'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager write transport_plans" ON public.transport_plans FOR INSERT TO authenticated
    WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transport_plans' AND policyname = 'Admin/manager update transport_plans'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager update transport_plans" ON public.transport_plans FOR UPDATE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transport_plans' AND policyname = 'Admin/manager delete transport_plans'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager delete transport_plans" ON public.transport_plans FOR DELETE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_team_id_transport_plans ON public.transport_plans;
CREATE TRIGGER set_team_id_transport_plans
  BEFORE INSERT ON public.transport_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

DROP TRIGGER IF EXISTS update_transport_plans_updated_at ON public.transport_plans;
CREATE TRIGGER update_transport_plans_updated_at
  BEFORE UPDATE ON public.transport_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.logistics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  delivery_hours_before NUMERIC NOT NULL DEFAULT 4,
  pickup_hours_after NUMERIC NOT NULL DEFAULT 2,
  auto_transport BOOLEAN NOT NULL DEFAULT true,
  auto_packing_list BOOLEAN NOT NULL DEFAULT true,
  auto_checkout BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, event_type)
);

ALTER TABLE public.logistics_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'logistics_config' AND policyname = 'Team members read logistics_config'
  ) THEN
    EXECUTE 'CREATE POLICY "Team members read logistics_config" ON public.logistics_config FOR SELECT TO authenticated USING (is_team_member(auth.uid(), team_id))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'logistics_config' AND policyname = 'Admin/manager write logistics_config'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager write logistics_config" ON public.logistics_config FOR INSERT TO authenticated
    WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'logistics_config' AND policyname = 'Admin/manager update logistics_config'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager update logistics_config" ON public.logistics_config FOR UPDATE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'logistics_config' AND policyname = 'Admin/manager delete logistics_config'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager delete logistics_config" ON public.logistics_config FOR DELETE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_team_id_logistics_config ON public.logistics_config;
CREATE TRIGGER set_team_id_logistics_config
  BEFORE INSERT ON public.logistics_config
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

CREATE OR REPLACE FUNCTION public.auto_generate_logistics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_delivery_at TIMESTAMPTZ;
  v_pickup_at TIMESTAMPTZ;
  v_event_type TEXT;
  v_has_transport BOOLEAN;
BEGIN
  IF NEW.status != 'confirmée' OR (OLD.status IS NOT NULL AND OLD.status = 'confirmée') THEN
    RETURN NEW;
  END IF;

  IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_event_type := COALESCE(NEW.event_type, 'default');

  SELECT * INTO v_config FROM public.logistics_config
  WHERE team_id = NEW.team_id AND event_type = v_event_type;

  IF v_config IS NULL THEN
    SELECT * INTO v_config FROM public.logistics_config
    WHERE team_id = NEW.team_id AND event_type = 'default';
  END IF;

  IF v_config IS NULL THEN
    v_delivery_at := NEW.start_date - INTERVAL '4 hours';
    v_pickup_at := NEW.end_date + INTERVAL '2 hours';
  ELSE
    v_delivery_at := NEW.start_date - (v_config.delivery_hours_before || ' hours')::INTERVAL;
    v_pickup_at := NEW.end_date + (v_config.pickup_hours_after || ' hours')::INTERVAL;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.transport_plans WHERE mission_id = NEW.id
  ) INTO v_has_transport;

  IF NOT v_has_transport AND (v_config IS NULL OR v_config.auto_transport) THEN
    INSERT INTO public.transport_plans (mission_id, team_id, type, scheduled_at, address, status)
    VALUES (NEW.id, NEW.team_id, 'livraison', v_delivery_at, NEW.location, 'planifié');

    INSERT INTO public.transport_plans (mission_id, team_id, type, scheduled_at, address, status)
    VALUES (NEW.id, NEW.team_id, 'recuperation', v_pickup_at, NEW.location, 'planifié');
  END IF;

  IF v_config IS NULL OR v_config.auto_checkout THEN
    INSERT INTO public.equipment_checkouts (mission_id, team_id, materiel_id, quantity, type, condition, notes)
    SELECT NEW.id, NEW.team_id, mm.materiel_id, mm.quantity, 'checkout', 'bon', 'Auto-généré - à valider au chargement'
    FROM public.mission_materiel mm
    WHERE mm.mission_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM public.equipment_checkouts ec
        WHERE ec.mission_id = NEW.id AND ec.materiel_id = mm.materiel_id AND ec.type = 'checkout'
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_logistics ON public.missions;
CREATE TRIGGER trg_auto_generate_logistics
  AFTER UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_logistics();

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'utilitaire',
  plate_number TEXT,
  capacity TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'disponible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS ct_expiry DATE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Team members read vehicles'
  ) THEN
    EXECUTE 'CREATE POLICY "Team members read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (is_team_member(auth.uid(), team_id))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Admin/manager write vehicles'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager write vehicles" ON public.vehicles FOR INSERT TO authenticated
    WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Admin/manager update vehicles'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager update vehicles" ON public.vehicles FOR UPDATE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'Admin/manager delete vehicles'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager delete vehicles" ON public.vehicles FOR DELETE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_vehicles_team_id ON public.vehicles;
CREATE TRIGGER set_vehicles_team_id
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.transport_plans ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sync_vehicle_status_on_transport()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_id UUID;
  v_has_active BOOLEAN;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  IF v_vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.vehicle_id IS NOT NULL AND OLD.vehicle_id != COALESCE(NEW.vehicle_id, OLD.vehicle_id) THEN
    SELECT EXISTS(
      SELECT 1 FROM public.transport_plans
      WHERE vehicle_id = OLD.vehicle_id
        AND id != NEW.id
        AND status IN ('en_route')
    ) INTO v_has_active;

    IF NOT v_has_active THEN
      UPDATE public.vehicles SET status = 'disponible' WHERE id = OLD.vehicle_id;
    END IF;
  END IF;

  IF NEW.status = 'en_route' AND NEW.vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles SET status = 'en_mission' WHERE id = NEW.vehicle_id;
    RETURN NEW;
  END IF;

  IF NEW.status IN ('terminé', 'annulé') AND NEW.vehicle_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.transport_plans
      WHERE vehicle_id = NEW.vehicle_id
        AND id != NEW.id
        AND status IN ('en_route')
    ) INTO v_has_active;

    IF NOT v_has_active THEN
      UPDATE public.vehicles SET status = 'disponible' WHERE id = NEW.vehicle_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vehicle_status ON public.transport_plans;
CREATE TRIGGER trg_sync_vehicle_status
  AFTER INSERT OR UPDATE ON public.transport_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vehicle_status_on_transport();

CREATE TABLE IF NOT EXISTS public.vehicle_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'autre',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicle_costs' AND policyname = 'Team members read vehicle_costs'
  ) THEN
    EXECUTE 'CREATE POLICY "Team members read vehicle_costs" ON public.vehicle_costs FOR SELECT TO authenticated USING (is_team_member(auth.uid(), team_id))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicle_costs' AND policyname = 'Admin/manager write vehicle_costs'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager write vehicle_costs" ON public.vehicle_costs FOR INSERT TO authenticated
    WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicle_costs' AND policyname = 'Admin/manager update vehicle_costs'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager update vehicle_costs" ON public.vehicle_costs FOR UPDATE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vehicle_costs' AND policyname = 'Admin/manager delete vehicle_costs'
  ) THEN
    EXECUTE $policy$CREATE POLICY "Admin/manager delete vehicle_costs" ON public.vehicle_costs FOR DELETE TO authenticated
    USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]))$policy$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_vehicle_costs_team_id ON public.vehicle_costs;
CREATE TRIGGER set_vehicle_costs_team_id
  BEFORE INSERT ON public.vehicle_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

DROP TRIGGER IF EXISTS update_vehicle_costs_updated_at ON public.vehicle_costs;
CREATE TRIGGER update_vehicle_costs_updated_at
  BEFORE UPDATE ON public.vehicle_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS insurance_document_url TEXT;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS rib_document_url TEXT;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS urssaf_document_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-documents', 'provider-documents', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload provider documents'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can upload provider documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''provider-documents'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view provider documents'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view provider documents" ON storage.objects FOR SELECT TO public USING (bucket_id = ''provider-documents'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own provider documents'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own provider documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''provider-documents'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own provider documents'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own provider documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''provider-documents'')';
  END IF;
END $$;
