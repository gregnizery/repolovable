-- Create function to update facture status on payment changes
CREATE OR REPLACE FUNCTION public.update_facture_status_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_facture_id uuid;
  v_total_ttc numeric;
  v_total_paid numeric;
BEGIN
  -- Get the facture ID based on the operation
  IF TG_OP = 'DELETE' THEN
    v_facture_id := OLD.facture_id;
  ELSE
    v_facture_id := NEW.facture_id;
  END IF;

  -- Get the facture total_ttc
  SELECT total_ttc INTO v_total_ttc
  FROM public.factures
  WHERE id = v_facture_id;

  -- IF facture doesn't exist anymore, just return
  IF v_total_ttc IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate the total approved payments for this facture
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.paiements
  WHERE facture_id = v_facture_id
    AND validation_status = 'approved';

  -- Update the facture status based on the payment total
  -- If fully paid (or overpaid), set to 'payée'
  -- If not fully paid and it was 'payée', revert to 'envoyée' (or keep current if it's something else)
  IF v_total_paid >= v_total_ttc THEN
    UPDATE public.factures
    SET status = 'payée'
    WHERE id = v_facture_id AND status != 'payée';
  ELSE
    UPDATE public.factures
    SET status = 'envoyée'
    WHERE id = v_facture_id AND status = 'payée';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS tr_paiement_status_update_facture ON public.paiements;

CREATE TRIGGER tr_paiement_status_update_facture
AFTER INSERT OR UPDATE OR DELETE ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.update_facture_status_on_payment();
