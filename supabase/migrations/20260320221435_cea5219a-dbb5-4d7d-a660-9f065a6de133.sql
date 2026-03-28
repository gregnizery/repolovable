-- Fix: update check constraint to accept accented values and fix trigger
ALTER TABLE public.transport_plans DROP CONSTRAINT transport_plans_type_check;
ALTER TABLE public.transport_plans ADD CONSTRAINT transport_plans_type_check CHECK (type IN ('livraison', 'recuperation', 'récupération'));

-- Update trigger function to use non-accented value matching the original constraint
CREATE OR REPLACE FUNCTION public.auto_generate_logistics()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;