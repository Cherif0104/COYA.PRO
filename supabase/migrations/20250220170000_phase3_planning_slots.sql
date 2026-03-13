-- Phase 3 – Planning : table planning_slots (créneaux : télétravail, présentiel, congé, réunion, modulation)
-- Lien avec meetings (meeting_id optionnel), leave_requests et presence_sessions via usage métier.

CREATE TABLE IF NOT EXISTS public.planning_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_type text NOT NULL CHECK (slot_type IN ('telework', 'onsite', 'leave', 'meeting', 'modulation', 'other')),
  start_time time,
  end_time time,
  meeting_id uuid,
  title text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_planning_slots_user_date ON public.planning_slots(user_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_planning_slots_org ON public.planning_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_planning_slots_meeting ON public.planning_slots(meeting_id);

-- FK meetings si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meetings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'planning_slots_meeting_id_fkey') THEN
      ALTER TABLE public.planning_slots ADD CONSTRAINT planning_slots_meeting_id_fkey
        FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

ALTER TABLE public.planning_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planning_slots_select" ON public.planning_slots;
CREATE POLICY "planning_slots_select" ON public.planning_slots FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "planning_slots_insert" ON public.planning_slots;
CREATE POLICY "planning_slots_insert" ON public.planning_slots FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "planning_slots_update" ON public.planning_slots;
CREATE POLICY "planning_slots_update" ON public.planning_slots FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "planning_slots_delete" ON public.planning_slots;
CREATE POLICY "planning_slots_delete" ON public.planning_slots FOR DELETE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP TRIGGER IF EXISTS planning_slots_updated_at ON public.planning_slots;
CREATE TRIGGER planning_slots_updated_at
  BEFORE UPDATE ON public.planning_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
