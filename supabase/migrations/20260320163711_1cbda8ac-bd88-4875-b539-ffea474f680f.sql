
-- Providers table
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  specialties TEXT[] DEFAULT '{}',
  daily_rate NUMERIC DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  contact_info JSONB DEFAULT '{}',
  legal_info JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view providers" ON public.providers FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can insert providers" ON public.providers FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can update providers" ON public.providers FOR UPDATE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can delete providers" ON public.providers FOR DELETE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  connected_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- B2B Invitations
CREATE TABLE public.b2b_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviting_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view b2b invitations" ON public.b2b_invitations FOR SELECT TO authenticated USING (inviting_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can insert b2b invitations" ON public.b2b_invitations FOR INSERT TO authenticated WITH CHECK (inviting_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can update b2b invitations" ON public.b2b_invitations FOR UPDATE TO authenticated USING (inviting_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Subrent Requests
CREATE TABLE public.subrent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  provider_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  materiel_id UUID REFERENCES public.materiel(id) ON DELETE SET NULL,
  materiel_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subrent_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view subrent requests" ON public.subrent_requests FOR SELECT TO authenticated USING (
  requester_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  OR provider_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Team members can insert subrent requests" ON public.subrent_requests FOR INSERT TO authenticated WITH CHECK (requester_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can update subrent requests" ON public.subrent_requests FOR UPDATE TO authenticated USING (
  requester_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  OR provider_team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

-- Storage Locations
CREATE TABLE public.storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view storage locations" ON public.storage_locations FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can insert storage locations" ON public.storage_locations FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can update storage locations" ON public.storage_locations FOR UPDATE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can delete storage locations" ON public.storage_locations FOR DELETE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Invoice Item Templates
CREATE TABLE public.invoice_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'autre',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_item_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view templates" ON public.invoice_item_templates FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can insert templates" ON public.invoice_item_templates FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can update templates" ON public.invoice_item_templates FOR UPDATE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can delete templates" ON public.invoice_item_templates FOR DELETE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Notification Events
CREATE TABLE public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notification_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notification_events FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Team members can insert notifications" ON public.notification_events FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Add is_b2b_shared column to materiel
ALTER TABLE public.materiel ADD COLUMN IF NOT EXISTS is_b2b_shared BOOLEAN DEFAULT false;

-- Payment Proofs table
CREATE TABLE public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID REFERENCES public.factures(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view payment proofs" ON public.payment_proofs FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can insert payment proofs" ON public.payment_proofs FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team members can delete payment proofs" ON public.payment_proofs FOR DELETE TO authenticated USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Enable realtime for notification_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_events;
