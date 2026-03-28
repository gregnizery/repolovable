
-- Table for event-type logistics configuration
CREATE TABLE public.logistics_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  delivery_hours_before numeric NOT NULL DEFAULT 4,
  pickup_hours_after numeric NOT NULL DEFAULT 2,
  auto_transport boolean NOT NULL DEFAULT true,
  auto_packing_list boolean NOT NULL DEFAULT true,
  auto_checkout boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, event_type)
);

ALTER TABLE public.logistics_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read logistics_config" ON public.logistics_config
  FOR SELECT TO authenticated USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write logistics_config" ON public.logistics_config
  FOR INSERT TO authenticated WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admin/manager update logistics_config" ON public.logistics_config
  FOR UPDATE TO authenticated USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admin/manager delete logistics_config" ON public.logistics_config
  FOR DELETE TO authenticated USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

-- Trigger to auto-set team_id
CREATE TRIGGER set_team_id_logistics_config BEFORE INSERT ON public.logistics_config
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

-- Function to auto-generate logistics when mission status changes to confirmed
CREATE OR REPLACE FUNCTION public.auto_generate_logistics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_delivery_at TIMESTAMPTZ;
  v_pickup_at TIMESTAMPTZ;
  v_event_type TEXT;
  v_has_transport BOOLEAN;
BEGIN
  -- Only trigger when status changes to 'confirmée'
  IF NEW.status != 'confirmée' OR (OLD.status IS NOT NULL AND OLD.status = 'confirmée') THEN
    RETURN NEW;
  END IF;

  -- Need dates
  IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_event_type := COALESCE(NEW.event_type, 'default');

  -- Get team config for this event type, fall back to 'default'
  SELECT * INTO v_config FROM public.logistics_config
    WHERE team_id = NEW.team_id AND event_type = v_event_type;

  IF v_config IS NULL THEN
    SELECT * INTO v_config FROM public.logistics_config
      WHERE team_id = NEW.team_id AND event_type = 'default';
  END IF;

  -- Use defaults if no config
  IF v_config IS NULL THEN
    v_delivery_at := NEW.start_date - INTERVAL '4 hours';
    v_pickup_at := NEW.end_date + INTERVAL '2 hours';
  ELSE
    v_delivery_at := NEW.start_date - (v_config.delivery_hours_before || ' hours')::INTERVAL;
    v_pickup_at := NEW.end_date + (v_config.pickup_hours_after || ' hours')::INTERVAL;
  END IF;

  -- Auto-generate transport plans (if not already existing)
  SELECT EXISTS(
    SELECT 1 FROM public.transport_plans WHERE mission_id = NEW.id
  ) INTO v_has_transport;

  IF NOT v_has_transport AND (v_config IS NULL OR v_config.auto_transport) THEN
    -- Delivery
    INSERT INTO public.transport_plans (mission_id, team_id, type, scheduled_at, address, status)
    VALUES (NEW.id, NEW.team_id, 'livraison', v_delivery_at, NEW.location, 'planifié');

    -- Pickup
    INSERT INTO public.transport_plans (mission_id, team_id, type, scheduled_at, address, status)
    VALUES (NEW.id, NEW.team_id, 'récupération', v_pickup_at, NEW.location, 'planifié');
  END IF;

  -- Auto-generate checkout records (pre-filled, status pending) for assigned materiel
  IF v_config IS NULL OR v_config.auto_checkout THEN
    INSERT INTO public.equipment_checkouts (mission_id, team_id, materiel_id, quantity, type, condition, notes)
    SELECT NEW.id, NEW.team_id, mm.materiel_id, mm.quantity, 'checkout', 'bon',
           'Auto-généré — à valider au chargement'
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

-- Attach trigger on missions
CREATE TRIGGER trg_auto_generate_logistics
  AFTER UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_logistics();
