
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
  -- On status change or vehicle assignment
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  
  IF v_vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- If vehicle was changed, also reset the old vehicle
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

  -- If transport is en_route, set vehicle to en_mission
  IF NEW.status = 'en_route' AND NEW.vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles SET status = 'en_mission' WHERE id = NEW.vehicle_id;
    RETURN NEW;
  END IF;

  -- If transport is terminé or annulé, check if vehicle has other active transports
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

CREATE TRIGGER trg_sync_vehicle_status
AFTER INSERT OR UPDATE ON public.transport_plans
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_status_on_transport();
