-- Portail client public sécurisé, notifications, marque blanche, justificatifs

-- 1) White label settings per team
CREATE TABLE IF NOT EXISTS public.white_label_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#4247D0',
  secondary_color text NOT NULL DEFAULT '#6366F1',
  legal_mentions text,
  support_email text,
  support_phone text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

ALTER TABLE public.white_label_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read white label"
  ON public.white_label_settings FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write white label"
  ON public.white_label_settings FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update white label"
  ON public.white_label_settings FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE TRIGGER update_white_label_updated_at BEFORE UPDATE ON public.white_label_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2) Client portal signed sessions
CREATE TABLE IF NOT EXISTS public.client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_access_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read client portal sessions"
  ON public.client_portal_sessions FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager create client portal sessions"
  ON public.client_portal_sessions FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update client portal sessions"
  ON public.client_portal_sessions FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- 3) Payment proof uploads by clients
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  facture_id uuid NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  uploaded_by_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  amount_declared numeric(12,2),
  payment_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read payment proofs"
  ON public.payment_proofs FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write payment proofs"
  ON public.payment_proofs FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- 4) Notifications center + reminders
CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app', -- in_app/email
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- queued/sent/read/failed
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notification_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notification_events FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admin/manager create notifications"
  ON public.notification_events FOR INSERT
  WITH CHECK (
    public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  );

CREATE TABLE IF NOT EXISTS public.notification_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  target_type text NOT NULL, -- devis/facture/mission
  target_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  remind_at timestamptz NOT NULL,
  recipient_email text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled/sent/canceled/failed
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read reminders"
  ON public.notification_reminders FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager create reminders"
  ON public.notification_reminders FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update reminders"
  ON public.notification_reminders FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- 5) Bucket for justificatifs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Team members read payment proofs files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND owner = auth.uid()
);

CREATE POLICY "Authenticated upload payment proofs files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND owner = auth.uid()
);
