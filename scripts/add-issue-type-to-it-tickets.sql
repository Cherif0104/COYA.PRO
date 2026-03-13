-- Ajouter type de panne (référentiel extensible) aux tickets IT
ALTER TABLE public.it_tickets ADD COLUMN IF NOT EXISTS issue_type_id UUID REFERENCES public.referential_values(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_it_tickets_issue_type ON public.it_tickets(issue_type_id);
