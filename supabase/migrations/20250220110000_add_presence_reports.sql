-- Phase 4 Bloc 1.3: Table des rapports présence (extractions J+7)
-- Les jobs (cron / Edge) écriront ici ; format et destinataires décrits dans docs/SPEC-EXTRACTIONS-J7.md

CREATE TABLE IF NOT EXISTS public.presence_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('delays', 'pause_excess', 'overtime', 'weekly_summary')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  format text NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'pdf')),
  file_path text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presence_reports_organization_id ON public.presence_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_presence_reports_period ON public.presence_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_presence_reports_generated_at ON public.presence_reports(generated_at);

ALTER TABLE public.presence_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_reports_select_own_org" ON public.presence_reports;
CREATE POLICY "presence_reports_select_own_org" ON public.presence_reports
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Insert réservé aux jobs système ou aux admins (à affiner selon l’implémentation cron/Edge)
DROP POLICY IF EXISTS "presence_reports_insert_admin" ON public.presence_reports;
CREATE POLICY "presence_reports_insert_admin" ON public.presence_reports
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')
    )
  );
