
-- Replace SECURITY DEFINER with SECURITY INVOKER on update_materiel_quantity_on_movement
-- RLS on materiel table (auth.uid() = user_id) already enforces ownership,
-- so the manual check is redundant and SECURITY DEFINER is unnecessary.
CREATE OR REPLACE FUNCTION public.update_materiel_quantity_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'entrée' THEN
      UPDATE public.materiel SET quantity = quantity + NEW.quantity WHERE id = NEW.materiel_id;
    ELSIF NEW.type = 'sortie' THEN
      UPDATE public.materiel SET quantity = GREATEST(0, quantity - NEW.quantity) WHERE id = NEW.materiel_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'entrée' THEN
      UPDATE public.materiel SET quantity = GREATEST(0, quantity - OLD.quantity) WHERE id = OLD.materiel_id;
    ELSIF OLD.type = 'sortie' THEN
      UPDATE public.materiel SET quantity = quantity + OLD.quantity WHERE id = OLD.materiel_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
