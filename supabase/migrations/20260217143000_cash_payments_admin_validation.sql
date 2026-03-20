-- Cash payments require justification and admin validation
ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS cash_justification TEXT,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_comment TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'paiements_validation_status_chk'
      AND conrelid = 'public.paiements'::regclass
  ) THEN
    ALTER TABLE public.paiements
      ADD CONSTRAINT paiements_validation_status_chk
      CHECK (validation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_cash_payment(
  p_payment_id UUID,
  p_status TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS public.paiements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_payment public.paiements;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.paiements p
  SET
    validation_status = p_status,
    validated_at = now(),
    validated_by = v_user_id,
    validated_comment = p_comment
  WHERE p.id = p_payment_id
    AND p.method = 'espèces'
    AND p.validation_status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.user_id = v_user_id
        AND tm.team_id = p.team_id
        AND tm.role = 'admin'
    )
  RETURNING p.* INTO v_payment;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found, not pending cash, or insufficient rights';
  END IF;

  RETURN v_payment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_cash_payment(UUID, TEXT, TEXT) TO authenticated;
