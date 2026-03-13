-- ============================================================
-- TABLE IT_TICKETS (Ticket IT – Phase 6)
-- ============================================================
-- Workflow : création par l'utilisateur → validation manager → envoi IT → traitement
-- ============================================================

CREATE TABLE IF NOT EXISTS public.it_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_validation', 'validated', 'sent_to_it', 'in_progress', 'resolved', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_by_name TEXT,
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  sent_to_it_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_it_tickets_organization ON public.it_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_it_tickets_status ON public.it_tickets(status);
CREATE INDEX IF NOT EXISTS idx_it_tickets_created_by ON public.it_tickets(created_by_id);
CREATE INDEX IF NOT EXISTS idx_it_tickets_assigned_to ON public.it_tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_it_tickets_created_at ON public.it_tickets(created_at DESC);

ALTER TABLE public.it_tickets ENABLE ROW LEVEL SECURITY;

-- Utilisateurs authentifiés : voir leurs tickets ou ceux assignés, ou tous si admin/manager
CREATE POLICY "Users can view own or assigned tickets"
ON public.it_tickets
FOR SELECT
TO authenticated
USING (
  created_by_id = auth.uid()
  OR assigned_to_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager', 'supervisor'))
);

-- Création : tout utilisateur authentifié
CREATE POLICY "Authenticated can create tickets"
ON public.it_tickets
FOR INSERT
TO authenticated
WITH CHECK (created_by_id = auth.uid());

-- Mise à jour : créateur (draft), manager (validation), assigné IT (traitement)
CREATE POLICY "Users can update tickets"
ON public.it_tickets
FOR UPDATE
TO authenticated
USING (
  created_by_id = auth.uid()
  OR assigned_to_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager', 'supervisor'))
);

-- Suppression : admin uniquement (optionnel)
CREATE POLICY "Admins can delete tickets"
ON public.it_tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);
