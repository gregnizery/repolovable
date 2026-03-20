
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  materiel_id UUID NOT NULL REFERENCES public.materiel(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrée', 'sortie')),
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  notes TEXT,
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stock_movements"
  ON public.stock_movements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_stock_movements_materiel ON public.stock_movements(materiel_id);
