-- ====================================================
-- SYSTÈME DE NOTIFICATIONS EN TEMPS RÉEL
-- ====================================================
-- Ce script crée la table notifications et active Realtime
-- pour notifier les utilisateurs de toutes les actions
-- ====================================================

-- ÉTAPE 1 : Créer la table notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Utilisateur qui reçoit la notification
    type TEXT NOT NULL, -- 'info', 'success', 'warning', 'error'
    module TEXT NOT NULL, -- 'project', 'invoice', 'expense', 'course', 'goal', 'time_tracking', 'leave', etc.
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'approved', 'rejected', 'assigned', etc.
    title TEXT NOT NULL, -- Titre de la notification
    message TEXT NOT NULL, -- Message détaillé
    entity_type TEXT, -- Type d'entité concernée ('project', 'invoice', etc.)
    entity_id UUID, -- ID de l'entité concernée
    entity_title TEXT, -- Titre de l'entité pour affichage rapide
    created_by UUID REFERENCES profiles(id), -- Utilisateur qui a déclenché la notification
    created_by_name TEXT, -- Nom de l'utilisateur (pour affichage rapide)
    read BOOLEAN DEFAULT FALSE, -- Notification lue ou non
    read_at TIMESTAMP WITH TIME ZONE, -- Date de lecture
    metadata JSONB, -- Données supplémentaires (lien, actions, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_module ON public.notifications(module);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id);

-- ÉTAPE 2 : Activer RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs ne peuvent voir que leurs propres notifications
CREATE POLICY notifications_select_own
ON public.notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = notifications.user_id 
        AND profiles.user_id = auth.uid()
    )
);

-- Politique RLS : Les utilisateurs peuvent créer des notifications pour eux-mêmes
CREATE POLICY notifications_insert_own
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = notifications.user_id 
        AND profiles.user_id = auth.uid()
    )
);

-- Politique RLS : Les utilisateurs peuvent mettre à jour leurs propres notifications
CREATE POLICY notifications_update_own
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = notifications.user_id 
        AND profiles.user_id = auth.uid()
    )
);

-- ÉTAPE 3 : Activer Realtime pour la table notifications
-- Note: À activer manuellement dans Supabase Dashboard > Database > Replication
-- ou via cette commande :
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ÉTAPE 4 : Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_module TEXT,
    p_action TEXT,
    p_title TEXT,
    p_message TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_entity_title TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_created_by_profile RECORD;
BEGIN
    -- Récupérer le profil de l'utilisateur actuel (celui qui déclenche la notification)
    SELECT * INTO v_created_by_profile FROM get_user_profile();
    
    -- Insérer la notification
    INSERT INTO public.notifications (
        user_id,
        type,
        module,
        action,
        title,
        message,
        entity_type,
        entity_id,
        entity_title,
        created_by,
        created_by_name,
        metadata
    ) VALUES (
        p_user_id,
        p_type,
        p_module,
        p_action,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id,
        p_entity_title,
        v_created_by_profile.profile_id,
        v_created_by_profile.full_name,
        p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 5 : Fonction pour notifier plusieurs utilisateurs
CREATE OR REPLACE FUNCTION create_notifications_for_users(
    p_user_ids UUID[],
    p_type TEXT,
    p_module TEXT,
    p_action TEXT,
    p_title TEXT,
    p_message TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_entity_title TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER := 0;
BEGIN
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        PERFORM create_notification(
            v_user_id,
            p_type,
            p_module,
            p_action,
            p_title,
            p_message,
            p_entity_type,
            p_entity_id,
            p_entity_title,
            p_metadata
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 6 : Fonction pour marquer une notification comme lue
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Récupérer l'ID du profil de l'utilisateur actuel
    SELECT profile_id INTO v_user_id FROM get_user_profile();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Mettre à jour la notification uniquement si elle appartient à l'utilisateur
    UPDATE public.notifications
    SET read = TRUE,
        read_at = NOW()
    WHERE id = p_notification_id
      AND user_id = v_user_id
      AND read = FALSE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 7 : Fonction pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    -- Récupérer l'ID du profil de l'utilisateur actuel
    SELECT profile_id INTO v_user_id FROM get_user_profile();
    
    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Mettre à jour toutes les notifications non lues
    UPDATE public.notifications
    SET read = TRUE,
        read_at = NOW()
    WHERE user_id = v_user_id
      AND read = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 8 : Trigger pour notifier automatiquement lors de la création d'un projet
-- (Les autres triggers seront créés dans le code pour plus de flexibilité)
CREATE OR REPLACE FUNCTION notify_project_created()
RETURNS TRIGGER AS $$
DECLARE
    v_notification_title TEXT;
    v_notification_message TEXT;
    v_user_ids UUID[];
BEGIN
    -- Construire le titre et le message
    v_notification_title := 'Nouveau projet créé';
    v_notification_message := 'Le projet "' || NEW.name || '" a été créé';
    
    -- Collecter les IDs de tous les membres de l'équipe
    IF NEW.team_members IS NOT NULL AND jsonb_array_length(NEW.team_members::jsonb) > 0 THEN
        -- Extraire les IDs depuis team_members (si c'est un array de UUIDs ou d'objets)
        SELECT ARRAY_AGG(DISTINCT value::text::uuid)
        INTO v_user_ids
        FROM jsonb_array_elements_text(NEW.team_members::jsonb) AS value;
    END IF;
    
    -- Ajouter le créateur à la liste (s'il veut être notifié de sa propre action)
    -- v_user_ids := array_append(COALESCE(v_user_ids, ARRAY[]::UUID[]), NEW.owner_id);
    
    -- Notifier tous les membres de l'équipe
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        PERFORM create_notifications_for_users(
            v_user_ids,
            'info',
            'project',
            'created',
            v_notification_title,
            v_notification_message,
            'project',
            NEW.id,
            NEW.name,
            jsonb_build_object('project_id', NEW.id, 'action', 'view_project')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Ce trigger sera attaché dans le code TypeScript pour plus de contrôle
-- DROP TRIGGER IF EXISTS trigger_notify_project_created ON public.projects;
-- CREATE TRIGGER trigger_notify_project_created
--     AFTER INSERT ON public.projects
--     FOR EACH ROW EXECUTE FUNCTION notify_project_created();

-- ✅ Vérification
SELECT '✅ Système de notifications créé avec succès!' as status;
SELECT '📝 IMPORTANT: Activez Realtime manuellement dans Supabase Dashboard > Database > Replication' as note;

