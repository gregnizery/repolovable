
-- =============================================
-- 1. Helper function: check role within a team
-- =============================================
CREATE OR REPLACE FUNCTION public.user_has_team_access(_user_id uuid, _team_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND role = ANY(_roles)
  )
$$;

-- =============================================
-- 2. Auto-set team_id on insert trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.set_team_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    NEW.team_id := public.get_user_team_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Attach to all tables with team_id
CREATE TRIGGER set_team_id_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER set_team_id_missions BEFORE INSERT ON public.missions FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER set_team_id_devis BEFORE INSERT ON public.devis FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER set_team_id_factures BEFORE INSERT ON public.factures FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER set_team_id_paiements BEFORE INSERT ON public.paiements FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER set_team_id_materiel BEFORE INSERT ON public.materiel FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER set_team_id_stock_movements BEFORE INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

-- =============================================
-- 3. Drop ALL old per-user RLS policies
-- =============================================
DROP POLICY IF EXISTS "Users manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Users manage own missions" ON public.missions;
DROP POLICY IF EXISTS "Users manage own devis" ON public.devis;
DROP POLICY IF EXISTS "Public devis signing" ON public.devis;
DROP POLICY IF EXISTS "Users manage own factures" ON public.factures;
DROP POLICY IF EXISTS "Users manage own paiements" ON public.paiements;
DROP POLICY IF EXISTS "Users manage own materiel" ON public.materiel;
DROP POLICY IF EXISTS "Users manage own mission_materiel" ON public.mission_materiel;
DROP POLICY IF EXISTS "Users manage own stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users manage own devis items" ON public.devis_items;
DROP POLICY IF EXISTS "Public devis items view" ON public.devis_items;
DROP POLICY IF EXISTS "Users manage own facture items" ON public.facture_items;

-- =============================================
-- 4. CLIENTS — admin/manager: full, others: read
-- =============================================
CREATE POLICY "Team members read clients"
  ON public.clients FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update clients"
  ON public.clients FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager delete clients"
  ON public.clients FOR DELETE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- =============================================
-- 5. MISSIONS — admin/manager: full, others: read
-- =============================================
CREATE POLICY "Team members read missions"
  ON public.missions FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write missions"
  ON public.missions FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update missions"
  ON public.missions FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager delete missions"
  ON public.missions FOR DELETE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- =============================================
-- 6. DEVIS — admin/manager: full, others: read + public signing
-- =============================================
CREATE POLICY "Team members read devis"
  ON public.devis FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Public devis signing"
  ON public.devis FOR SELECT
  USING (public_token IS NOT NULL);

CREATE POLICY "Admin/manager write devis"
  ON public.devis FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update devis"
  ON public.devis FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager delete devis"
  ON public.devis FOR DELETE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- =============================================
-- 7. DEVIS_ITEMS — via parent devis team_id
-- =============================================
CREATE POLICY "Team members read devis items"
  ON public.devis_items FOR SELECT
  USING (devis_id IN (
    SELECT id FROM public.devis WHERE public.is_team_member(auth.uid(), team_id)
  ));

CREATE POLICY "Public devis items view"
  ON public.devis_items FOR SELECT
  USING (devis_id IN (
    SELECT id FROM public.devis WHERE public_token IS NOT NULL
  ));

CREATE POLICY "Admin/manager write devis items"
  ON public.devis_items FOR INSERT
  WITH CHECK (devis_id IN (
    SELECT id FROM public.devis WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  ));

CREATE POLICY "Admin/manager update devis items"
  ON public.devis_items FOR UPDATE
  USING (devis_id IN (
    SELECT id FROM public.devis WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  ));

CREATE POLICY "Admin/manager delete devis items"
  ON public.devis_items FOR DELETE
  USING (devis_id IN (
    SELECT id FROM public.devis WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  ));

-- =============================================
-- 8. FACTURES — admin/manager: full, others: read
-- =============================================
CREATE POLICY "Team members read factures"
  ON public.factures FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write factures"
  ON public.factures FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update factures"
  ON public.factures FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager delete factures"
  ON public.factures FOR DELETE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- =============================================
-- 9. FACTURE_ITEMS — via parent facture team_id
-- =============================================
CREATE POLICY "Team members read facture items"
  ON public.facture_items FOR SELECT
  USING (facture_id IN (
    SELECT id FROM public.factures WHERE public.is_team_member(auth.uid(), team_id)
  ));

CREATE POLICY "Admin/manager write facture items"
  ON public.facture_items FOR INSERT
  WITH CHECK (facture_id IN (
    SELECT id FROM public.factures WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  ));

CREATE POLICY "Admin/manager update facture items"
  ON public.facture_items FOR UPDATE
  USING (facture_id IN (
    SELECT id FROM public.factures WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  ));

CREATE POLICY "Admin/manager delete facture items"
  ON public.facture_items FOR DELETE
  USING (facture_id IN (
    SELECT id FROM public.factures WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  ));

-- =============================================
-- 10. PAIEMENTS — admin/manager: full, others: read
-- =============================================
CREATE POLICY "Team members read paiements"
  ON public.paiements FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager write paiements"
  ON public.paiements FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager update paiements"
  ON public.paiements FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager delete paiements"
  ON public.paiements FOR DELETE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- =============================================
-- 11. MATERIEL — admin/manager/technicien: write, all: read
-- =============================================
CREATE POLICY "Team members read materiel"
  ON public.materiel FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager/tech write materiel"
  ON public.materiel FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager','technicien']::app_role[]));

CREATE POLICY "Admin/manager/tech update materiel"
  ON public.materiel FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager','technicien']::app_role[]));

CREATE POLICY "Admin/manager delete materiel"
  ON public.materiel FOR DELETE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- =============================================
-- 12. MISSION_MATERIEL — admin/manager/technicien: write, all: read
-- =============================================
CREATE POLICY "Team members read mission_materiel"
  ON public.mission_materiel FOR SELECT
  USING (mission_id IN (
    SELECT id FROM public.missions WHERE public.is_team_member(auth.uid(), team_id)
  ));

CREATE POLICY "Admin/manager/tech write mission_materiel"
  ON public.mission_materiel FOR INSERT
  WITH CHECK (mission_id IN (
    SELECT id FROM public.missions WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager','technicien']::app_role[])
  ));

CREATE POLICY "Admin/manager/tech update mission_materiel"
  ON public.mission_materiel FOR UPDATE
  USING (mission_id IN (
    SELECT id FROM public.missions WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager','technicien']::app_role[])
  ));

CREATE POLICY "Admin/manager delete mission_materiel"
  ON public.mission_materiel FOR DELETE
  USING (mission_id IN (
    SELECT id FROM public.missions WHERE public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[])
  ));

-- =============================================
-- 13. STOCK_MOVEMENTS — admin/manager/technicien: insert, admin/manager: update/delete, all: read
-- =============================================
CREATE POLICY "Team members read stock_movements"
  ON public.stock_movements FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admin/manager/tech write stock_movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager','technicien']::app_role[]));

CREATE POLICY "Admin/manager update stock_movements"
  ON public.stock_movements FOR UPDATE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

CREATE POLICY "Admin/manager delete stock_movements"
  ON public.stock_movements FOR DELETE
  USING (public.user_has_team_access(auth.uid(), team_id, ARRAY['admin','manager']::app_role[]));

-- =============================================
-- 14. Backfill existing data: set team_id from user's team
-- =============================================
UPDATE public.clients SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.missions SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.devis SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.factures SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.paiements SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.materiel SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
UPDATE public.stock_movements SET team_id = public.get_user_team_id(user_id) WHERE team_id IS NULL;
