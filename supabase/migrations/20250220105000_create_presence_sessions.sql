-- Table presence_sessions (sélecteur de statut post-login, compte à rebours) – Phase 0.2
-- Si la table n'existe pas, la créer avec tous les statuts étendus.
CREATE TABLE IF NOT EXISTS public.presence_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'online'
    CHECK (status IN (
      'online', 'pause', 'in_meeting',
      'present', 'absent', 'pause_coffee', 'pause_lunch',
      'away_mission', 'brief_team', 'technical_issue'
    )),
  meeting_id uuid,
  pause_minutes int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_user ON public.presence_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_org ON public.presence_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_started ON public.presence_sessions(started_at);

ALTER TABLE public.presence_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_sessions_select_own" ON public.presence_sessions;
CREATE POLICY "presence_sessions_select_own" ON public.presence_sessions
  FOR SELECT USING (auth.uid() = user_id OR organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "presence_sessions_insert_own" ON public.presence_sessions;
CREATE POLICY "presence_sessions_insert_own" ON public.presence_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "presence_sessions_update_own" ON public.presence_sessions;
CREATE POLICY "presence_sessions_update_own" ON public.presence_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS presence_sessions_updated_at ON public.presence_sessions;
CREATE TRIGGER presence_sessions_updated_at
  BEFORE UPDATE ON public.presence_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
