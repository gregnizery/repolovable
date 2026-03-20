-- Hardened RLS policies for financial and client data
-- Audit Fixes - 2026-03-01

-- 1. Clients: Only Admin and Manager can see the global client list
DROP POLICY IF EXISTS "Team members read clients" ON public.clients;
CREATE POLICY "Admin/manager read clients"
  ON public.clients FOR SELECT
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- 2. Factures: Only Admin and Manager can see invoices
DROP POLICY IF EXISTS "Team members read factures" ON public.factures;
CREATE POLICY "Admin/manager read factures"
  ON public.factures FOR SELECT
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- 3. Paiements: Only Admin and Manager can see payments
DROP POLICY IF EXISTS "Team members read paiements" ON public.paiements;
CREATE POLICY "Admin/manager read paiements"
  ON public.paiements FOR SELECT
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- 4. Devis: Only Admin and Manager can see quotes (plus public exception)
DROP POLICY IF EXISTS "Team members read devis" ON public.devis;
CREATE POLICY "Admin/manager read devis"
  ON public.devis FOR SELECT
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- Note: "Public devis signing" and "Public devis items view" are already separate and don't need change.

-- Optional: If we want technicians to see client info for their assigned missions, 
-- we would need a more complex JOIN policy. For now, we follow the strict "Admin/Manager" audit request.
