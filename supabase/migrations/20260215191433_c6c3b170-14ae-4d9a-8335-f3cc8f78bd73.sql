
-- ==========================================================
-- 1. Constraints on mission_materiel
-- ==========================================================

-- No duplicate: same materiel cannot be assigned twice to the same mission
ALTER TABLE public.mission_materiel
  ADD CONSTRAINT uq_mission_materiel_unique UNIQUE (mission_id, materiel_id);

-- Quantity must be > 0
ALTER TABLE public.mission_materiel
  ADD CONSTRAINT chk_mission_materiel_qty_positive CHECK (quantity > 0);

-- Quantity on stock_movements must be > 0
ALTER TABLE public.stock_movements
  ADD CONSTRAINT chk_stock_movement_qty_positive CHECK (quantity > 0);

-- ==========================================================
-- 2. verifier_disponibilite_materiel function
--    Calculates real-time availability of a materiel item for a
--    given date range, respecting logistic buffers and missing returns.
-- ==========================================================

CREATE OR REPLACE FUNCTION public.verifier_disponibilite_materiel(
  p_materiel_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_exclude_mission_id UUID DEFAULT NULL,
  p_buffer_hours INT DEFAULT 12,
  p_missing_return_days INT DEFAULT 7
)
RETURNS TABLE (
  stock_total INT,
  quantite_assignee INT,
  quantite_bloquee_retours INT,
  quantite_disponible INT,
  conflits JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_stock_total INT;
  v_assigned INT := 0;
  v_blocked INT := 0;
  v_conflits JSONB := '[]'::JSONB;
  v_buffered_start TIMESTAMPTZ;
  v_buffered_end TIMESTAMPTZ;
  rec RECORD;
BEGIN
  -- Get total stock
  SELECT m.quantity INTO v_stock_total
  FROM public.materiel m
  WHERE m.id = p_materiel_id;

  IF v_stock_total IS NULL THEN
    RAISE EXCEPTION 'Materiel % not found', p_materiel_id;
  END IF;

  -- Apply logistic buffers to the requested window
  v_buffered_start := p_start - (p_buffer_hours || ' hours')::INTERVAL;
  v_buffered_end   := p_end   + (p_buffer_hours || ' hours')::INTERVAL;

  -- -------------------------------------------------------
  -- A) Count quantities assigned to overlapping ACTIVE missions
  --    (planifiée, confirmée, en_cours)
  -- -------------------------------------------------------
  FOR rec IN
    SELECT
      mis.id AS mission_id,
      mis.title AS mission_title,
      mis.start_date,
      mis.end_date,
      mis.status,
      mm.quantity
    FROM public.mission_materiel mm
    JOIN public.missions mis ON mis.id = mm.mission_id
    WHERE mm.materiel_id = p_materiel_id
      AND mis.status IN ('planifiée', 'confirmée', 'en_cours')
      AND (p_exclude_mission_id IS NULL OR mis.id != p_exclude_mission_id)
      -- Overlap check with buffers
      AND mis.start_date IS NOT NULL
      AND mis.end_date IS NOT NULL
      AND mis.start_date - (p_buffer_hours || ' hours')::INTERVAL < v_buffered_end
      AND mis.end_date   + (p_buffer_hours || ' hours')::INTERVAL > v_buffered_start
  LOOP
    v_assigned := v_assigned + rec.quantity;
    v_conflits := v_conflits || jsonb_build_object(
      'type', 'mission_active',
      'mission_id', rec.mission_id,
      'mission_title', rec.mission_title,
      'start_date', rec.start_date,
      'end_date', rec.end_date,
      'status', rec.status,
      'quantity', rec.quantity
    );
  END LOOP;

  -- -------------------------------------------------------
  -- B) Detect missing returns on completed/cancelled missions
  --    Block stock for p_missing_return_days after mission end
  -- -------------------------------------------------------
  FOR rec IN
    SELECT
      mis.id AS mission_id,
      mis.title AS mission_title,
      mis.end_date,
      mis.status,
      mm.quantity AS assigned_qty,
      COALESCE(
        (SELECT SUM(sm.quantity)
         FROM public.stock_movements sm
         WHERE sm.materiel_id = p_materiel_id
           AND sm.type = 'entrée'
           AND sm.reason = 'retour_mission'
           AND sm.notes LIKE '%' || mis.id::TEXT || '%'
        ), 0
      )::INT AS returned_qty
    FROM public.mission_materiel mm
    JOIN public.missions mis ON mis.id = mm.mission_id
    WHERE mm.materiel_id = p_materiel_id
      AND mis.status IN ('terminée', 'annulée')
      AND mis.end_date IS NOT NULL
      AND mis.end_date + (p_missing_return_days || ' days')::INTERVAL > NOW()
      AND (p_exclude_mission_id IS NULL OR mis.id != p_exclude_mission_id)
  LOOP
    IF rec.returned_qty < rec.assigned_qty THEN
      v_blocked := v_blocked + (rec.assigned_qty - rec.returned_qty);
      v_conflits := v_conflits || jsonb_build_object(
        'type', 'retour_manquant',
        'mission_id', rec.mission_id,
        'mission_title', rec.mission_title,
        'end_date', rec.end_date,
        'assigned', rec.assigned_qty,
        'returned', rec.returned_qty,
        'blocked_until', rec.end_date + (p_missing_return_days || ' days')::INTERVAL
      );
    END IF;
  END LOOP;

  -- -------------------------------------------------------
  -- Return results
  -- -------------------------------------------------------
  stock_total := v_stock_total;
  quantite_assignee := v_assigned;
  quantite_bloquee_retours := v_blocked;
  quantite_disponible := GREATEST(0, v_stock_total - v_assigned - v_blocked);
  conflits := v_conflits;
  RETURN NEXT;
END;
$$;

-- ==========================================================
-- 3. Validation trigger on mission_materiel
--    Prevents assigning more than available stock
-- ==========================================================

CREATE OR REPLACE FUNCTION public.validate_mission_materiel_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_dispo RECORD;
  v_mission_start TIMESTAMPTZ;
  v_mission_end TIMESTAMPTZ;
  v_materiel_status TEXT;
BEGIN
  -- Check materiel status
  SELECT status INTO v_materiel_status
  FROM public.materiel WHERE id = NEW.materiel_id;

  IF v_materiel_status = 'hors_service' THEN
    RAISE EXCEPTION 'Cannot assign materiel in hors_service status';
  END IF;

  -- Get mission dates
  SELECT start_date, end_date INTO v_mission_start, v_mission_end
  FROM public.missions WHERE id = NEW.mission_id;

  IF v_mission_start IS NULL OR v_mission_end IS NULL THEN
    RAISE EXCEPTION 'Mission must have start_date and end_date for materiel assignment';
  END IF;

  -- Check availability (exclude current mission for updates)
  SELECT * INTO v_dispo
  FROM public.verifier_disponibilite_materiel(
    NEW.materiel_id,
    v_mission_start,
    v_mission_end,
    NEW.mission_id  -- exclude self
  );

  IF NEW.quantity > v_dispo.quantite_disponible THEN
    RAISE EXCEPTION 'Insufficient stock: requested %, available % (total=%, assigned=%, blocked=%)',
      NEW.quantity,
      v_dispo.quantite_disponible,
      v_dispo.stock_total,
      v_dispo.quantite_assignee,
      v_dispo.quantite_bloquee_retours;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mission_materiel
  BEFORE INSERT OR UPDATE ON public.mission_materiel
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_mission_materiel_assignment();
