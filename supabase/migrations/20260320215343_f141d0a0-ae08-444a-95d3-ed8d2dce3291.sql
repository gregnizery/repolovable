
-- ============================================
-- EXPENSES (Suivi des dépenses)
-- ============================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'autre',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read expenses" ON public.expenses FOR SELECT TO authenticated
  USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Admin/manager write expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Admin/manager update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Admin/manager delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER set_team_id_expenses BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SUPPLIER INVOICES (Factures fournisseurs / achats)
-- ============================================
CREATE TABLE public.supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total_ht NUMERIC NOT NULL DEFAULT 0,
  tva_rate NUMERIC NOT NULL DEFAULT 0.20,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'à_payer',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read supplier_invoices" ON public.supplier_invoices FOR SELECT TO authenticated
  USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Admin/manager write supplier_invoices" ON public.supplier_invoices FOR INSERT TO authenticated
  WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Admin/manager update supplier_invoices" ON public.supplier_invoices FOR UPDATE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Admin/manager delete supplier_invoices" ON public.supplier_invoices FOR DELETE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER set_team_id_supplier_invoices BEFORE INSERT ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER update_supplier_invoices_updated_at BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.supplier_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id UUID NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team read supplier_invoice_items" ON public.supplier_invoice_items FOR SELECT TO authenticated
  USING (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE is_team_member(auth.uid(), team_id)));
CREATE POLICY "Admin write supplier_invoice_items" ON public.supplier_invoice_items FOR INSERT TO authenticated
  WITH CHECK (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role])));
CREATE POLICY "Admin update supplier_invoice_items" ON public.supplier_invoice_items FOR UPDATE TO authenticated
  USING (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role])));
CREATE POLICY "Admin delete supplier_invoice_items" ON public.supplier_invoice_items FOR DELETE TO authenticated
  USING (supplier_invoice_id IN (SELECT id FROM public.supplier_invoices WHERE user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role])));

-- ============================================
-- EQUIPMENT CHECKOUTS (Check-in / Check-out)
-- ============================================
CREATE TABLE public.equipment_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  materiel_id UUID REFERENCES public.materiel(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkout', 'checkin')),
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT DEFAULT 'bon',
  checked_by UUID,
  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read equipment_checkouts" ON public.equipment_checkouts FOR SELECT TO authenticated
  USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Team write equipment_checkouts" ON public.equipment_checkouts FOR INSERT TO authenticated
  WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role, 'technicien'::app_role]));
CREATE POLICY "Team update equipment_checkouts" ON public.equipment_checkouts FOR UPDATE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role, 'technicien'::app_role]));

CREATE TRIGGER set_team_id_equipment_checkouts BEFORE INSERT ON public.equipment_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();

-- ============================================
-- TRANSPORT PLANS (Livraison / Récupération)
-- ============================================
CREATE TABLE public.transport_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('livraison', 'recuperation')),
  scheduled_at TIMESTAMPTZ,
  address TEXT,
  vehicle TEXT,
  driver_name TEXT,
  status TEXT NOT NULL DEFAULT 'planifié',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read transport_plans" ON public.transport_plans FOR SELECT TO authenticated
  USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Admin/manager write transport_plans" ON public.transport_plans FOR INSERT TO authenticated
  WITH CHECK (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Admin/manager update transport_plans" ON public.transport_plans FOR UPDATE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Admin/manager delete transport_plans" ON public.transport_plans FOR DELETE TO authenticated
  USING (user_has_team_access(auth.uid(), team_id, ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER set_team_id_transport_plans BEFORE INSERT ON public.transport_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
CREATE TRIGGER update_transport_plans_updated_at BEFORE UPDATE ON public.transport_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
