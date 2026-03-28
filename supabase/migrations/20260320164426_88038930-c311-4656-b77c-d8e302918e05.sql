
-- Bank transactions table for CSV import reconciliation
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT,
  bank_name TEXT,
  reconciled_paiement_id UUID REFERENCES public.paiements(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view bank_transactions"
  ON public.bank_transactions FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can insert bank_transactions"
  ON public.bank_transactions FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can update bank_transactions"
  ON public.bank_transactions FOR UPDATE TO authenticated
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can delete bank_transactions"
  ON public.bank_transactions FOR DELETE TO authenticated
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Auto set team_id
CREATE TRIGGER set_bank_transactions_team_id
  BEFORE INSERT ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_team_id_on_insert();
