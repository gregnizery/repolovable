
-- Function to update materiel quantity on stock movement
CREATE OR REPLACE FUNCTION public.update_materiel_quantity_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Reverse the movement on delete
    IF OLD.type = 'entrée' THEN
      UPDATE public.materiel SET quantity = GREATEST(0, quantity - OLD.quantity) WHERE id = OLD.materiel_id;
    ELSIF OLD.type = 'sortie' THEN
      UPDATE public.materiel SET quantity = quantity + OLD.quantity WHERE id = OLD.materiel_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on insert and delete
CREATE TRIGGER trg_stock_movement_quantity
AFTER INSERT OR DELETE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_materiel_quantity_on_movement();
