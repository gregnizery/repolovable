-- ============================================================
-- Auto-notification triggers
-- Runs for: devis status changes, facture creation, paiements
-- ============================================================

-- Helper: get user_id from team_id (first admin/manager in team)
CREATE OR REPLACE FUNCTION public.get_team_user(p_team_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT user_id FROM public.team_members
  WHERE team_id = p_team_id AND role IN ('admin', 'manager')
  ORDER BY created_at ASC LIMIT 1;
$$;

-- ── 1. Devis status changes ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_devis_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_title text;
  v_message text;
  v_type text;
  v_client_name text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  v_user_id := public.get_team_user(NEW.team_id);
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  -- Resolve client name
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

  IF NEW.status = 'signé' THEN
    v_title   := 'Devis signé 🎉';
    v_message := 'Le devis ' || NEW.number || COALESCE(' (' || v_client_name || ')', '') || ' a été signé.';
    v_type    := 'success';
  ELSIF NEW.status = 'refusé' THEN
    v_title   := 'Devis refusé';
    v_message := 'Le devis ' || NEW.number || COALESCE(' (' || v_client_name || ')', '') || ' a été refusé.';
    v_type    := 'error';
  ELSIF NEW.status = 'expiré' THEN
    v_title   := 'Devis expiré';
    v_message := 'Le devis ' || NEW.number || COALESCE(' (' || v_client_name || ')', '') || ' a expiré.';
    v_type    := 'warning';
  ELSIF NEW.status = 'envoyé' THEN
    v_title   := 'Devis envoyé';
    v_message := 'Le devis ' || NEW.number || COALESCE(' (' || v_client_name || ')', '') || ' a été envoyé au client.';
    v_type    := 'info';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_events
    (team_id, user_id, channel, type, title, message, status, metadata)
  VALUES
    (NEW.team_id, v_user_id, 'in_app', v_type, v_title, v_message, 'sent',
     jsonb_build_object('entity', 'devis', 'entity_id', NEW.id, 'href', '/finance/devis/' || NEW.id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_devis_status ON public.devis;
CREATE TRIGGER trg_notify_devis_status
  AFTER UPDATE OF status ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.notify_devis_status_change();

-- ── 2. Nouvelle facture ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_facture_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_client_name text;
BEGIN
  v_user_id := public.get_team_user(NEW.team_id);
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'brouillon' THEN RETURN NEW; END IF;

  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

  INSERT INTO public.notification_events
    (team_id, user_id, channel, type, title, message, status, metadata)
  VALUES
    (NEW.team_id, v_user_id, 'in_app', 'info', 'Nouvelle facture',
     'La facture ' || NEW.number || COALESCE(' pour ' || v_client_name, '') || ' a été créée.',
     'sent',
     jsonb_build_object('entity', 'facture', 'entity_id', NEW.id, 'href', '/finance/factures/' || NEW.id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_facture_created ON public.factures;
CREATE TRIGGER trg_notify_facture_created
  AFTER INSERT ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.notify_facture_created();

-- ── 3. Paiement reçu ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_paiement_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_facture_number text;
  v_client_name text;
  v_t_id uuid;
BEGIN
  -- Get team_id from facture
  SELECT f.team_id, f.number, c.name
    INTO v_t_id, v_facture_number, v_client_name
    FROM public.factures f
    LEFT JOIN public.clients c ON c.id = f.client_id
    WHERE f.id = NEW.facture_id;

  IF v_t_id IS NULL THEN RETURN NEW; END IF;

  v_user_id := public.get_team_user(v_t_id);
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notification_events
    (team_id, user_id, channel, type, title, message, status, metadata)
  VALUES
    (v_t_id, v_user_id, 'in_app', 'success',
     'Paiement reçu 💰',
     'Paiement de ' || NEW.amount || ' € reçu' ||
       COALESCE(' de ' || v_client_name, '') ||
       COALESCE(' (facture ' || v_facture_number || ')', '') || '.',
     'sent',
     jsonb_build_object('entity', 'paiement', 'entity_id', NEW.id, 'href', '/finance/paiements'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_paiement ON public.paiements;
CREATE TRIGGER trg_notify_paiement
  AFTER INSERT ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION public.notify_paiement_received();

-- ── 4. Mission créée ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_mission_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_client_name text;
BEGIN
  v_user_id := public.get_team_user(NEW.team_id);
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

  INSERT INTO public.notification_events
    (team_id, user_id, channel, type, title, message, status, metadata)
  VALUES
    (NEW.team_id, v_user_id, 'in_app', 'info',
     'Nouvelle mission planifiée',
     'La mission "' || NEW.title || '"' || COALESCE(' pour ' || v_client_name, '') || ' a été créée.',
     'sent',
     jsonb_build_object('entity', 'mission', 'entity_id', NEW.id, 'href', '/missions/' || NEW.id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_mission_created ON public.missions;
CREATE TRIGGER trg_notify_mission_created
  AFTER INSERT ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.notify_mission_created();

-- Allow service/trigger to insert notifications bypassing the RLS policy
-- (the trigger runs as SECURITY DEFINER already but we add a service policy)
DROP POLICY IF EXISTS "Service inserts notifications" ON public.notification_events;
CREATE POLICY "Service inserts notifications"
  ON public.notification_events FOR INSERT
  WITH CHECK (true);
