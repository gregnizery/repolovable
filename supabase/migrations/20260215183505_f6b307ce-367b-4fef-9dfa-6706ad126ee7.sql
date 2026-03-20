
CREATE OR REPLACE FUNCTION public.update_materiel_quantity_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Validate that the user owns the materiel
    IF NOT EXISTS (SELECT 1 FROM public.materiel WHERE id = NEW.materiel_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Unauthorized: you do not own this materiel';
    END IF;

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
