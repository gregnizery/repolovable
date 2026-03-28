
CREATE TABLE public.client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  last_access_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can manage portal sessions"
  ON public.client_portal_sessions
  FOR ALL
  TO authenticated
  USING (is_team_member(auth.uid(), team_id))
  WITH CHECK (is_team_member(auth.uid(), team_id));
