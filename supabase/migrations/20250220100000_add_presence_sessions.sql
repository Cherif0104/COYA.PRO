-- Phase 4 Bloc 1: Presence sessions (pointage / présence)
-- Run in Supabase SQL Editor if not using Supabase CLI.

-- 1. Table presence_sessions
-- user_id = auth user id (same as profiles.user_id) for RLS
CREATE TABLE IF NOT EXISTS public.presence_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  status text NOT NULL CHECK (status IN ('online', 'pause', 'in_meeting')),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  pause_minutes int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_user_id ON public.presence_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_organization_id ON public.presence_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_started_at ON public.presence_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_status ON public.presence_sessions(status);

-- 2. RLS presence_sessions
ALTER TABLE public.presence_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions; managers can read sessions of users in their department(s)
DROP POLICY IF EXISTS "presence_sessions_select_own" ON public.presence_sessions;
CREATE POLICY "presence_sessions_select_own" ON public.presence_sessions
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own sessions (organization_id from their profile)
DROP POLICY IF EXISTS "presence_sessions_insert_own" ON public.presence_sessions;
CREATE POLICY "presence_sessions_insert_own" ON public.presence_sessions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Users can update their own sessions (e.g. end session, change status)
DROP POLICY IF EXISTS "presence_sessions_update_own" ON public.presence_sessions;
CREATE POLICY "presence_sessions_update_own" ON public.presence_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own sessions (e.g. cancel)
DROP POLICY IF EXISTS "presence_sessions_delete_own" ON public.presence_sessions;
CREATE POLICY "presence_sessions_delete_own" ON public.presence_sessions
  FOR DELETE USING (user_id = auth.uid());

-- 3. Trigger updated_at
DROP TRIGGER IF EXISTS presence_sessions_updated_at ON public.presence_sessions;
CREATE TRIGGER presence_sessions_updated_at
  BEFORE UPDATE ON public.presence_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
