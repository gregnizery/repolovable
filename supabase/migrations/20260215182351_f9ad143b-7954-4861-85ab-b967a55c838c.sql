
-- Junction table to link materiel to missions
CREATE TABLE public.mission_materiel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  materiel_id UUID NOT NULL REFERENCES public.materiel(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  UNIQUE(mission_id, materiel_id)
);

-- Enable RLS
ALTER TABLE public.mission_materiel ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users manage own mission_materiel"
  ON public.mission_materiel
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
