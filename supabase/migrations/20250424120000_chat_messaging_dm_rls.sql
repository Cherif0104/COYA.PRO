-- Messagerie : politiques RLS pour conversations directes et messages.
-- À appliquer sur le projet Supabase si les tables chat_* existent déjà.
-- Les `sender_id` / `profile_id` référencent profiles.id (pas auth.uid()).

-- Activer RLS (idempotent si déjà actif)
ALTER TABLE IF EXISTS public.chat_direct_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_direct_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes politiques homonymes (ré-exécution safe)
DROP POLICY IF EXISTS "chat_direct_threads_select_member" ON public.chat_direct_threads;
DROP POLICY IF EXISTS "chat_direct_threads_insert_authenticated" ON public.chat_direct_threads;
DROP POLICY IF EXISTS "chat_direct_members_select_self" ON public.chat_direct_members;
DROP POLICY IF EXISTS "chat_direct_members_select_thread_peer" ON public.chat_direct_members;
DROP POLICY IF EXISTS "chat_direct_members_insert_self" ON public.chat_direct_members;
DROP POLICY IF EXISTS "chat_direct_members_insert_creator_or_self" ON public.chat_direct_members;
DROP POLICY IF EXISTS "chat_messages_select_thread_or_channel" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_as_sender" ON public.chat_messages;

-- Threads DM : visible si le profil connecté est membre
CREATE POLICY "chat_direct_threads_select_member"
  ON public.chat_direct_threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_direct_members m
      WHERE m.thread_id = chat_direct_threads.id
        AND m.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "chat_direct_threads_insert_authenticated"
  ON public.chat_direct_threads FOR INSERT TO authenticated
  WITH CHECK (created_by_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

-- Membres DM : voir toutes les lignes d’un fil dont on fait partie
CREATE POLICY "chat_direct_members_select_thread_peer"
  ON public.chat_direct_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_direct_members me
      WHERE me.thread_id = chat_direct_members.thread_id
        AND me.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Insertion : soi-même OU créateur du fil (pour ajouter l’autre participant)
CREATE POLICY "chat_direct_members_insert_creator_or_self"
  ON public.chat_direct_members FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.chat_direct_threads t
      WHERE t.id = thread_id
        AND t.created_by_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Messages : lecture si expéditeur ou participant au fil DM / canal (canal : simplifié = même org)
CREATE POLICY "chat_messages_select_thread_or_channel"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR (
      direct_thread_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.chat_direct_members m
        WHERE m.thread_id = chat_messages.direct_thread_id
          AND m.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
      )
    )
    OR (
      channel_id IS NOT NULL
      AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "chat_messages_insert_as_sender"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND (
      (direct_thread_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chat_direct_members m
        WHERE m.thread_id = chat_messages.direct_thread_id
          AND m.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
      ))
      OR (channel_id IS NOT NULL)
    )
  );
