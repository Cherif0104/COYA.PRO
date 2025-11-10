-- ====================================================
-- SYSTÈME D'HISTORIQUE DES ACTIONS (Activity Logs)
-- ====================================================
-- Ce script crée la table activity_logs et les triggers
-- pour enregistrer automatiquement toutes les modifications
-- ====================================================

-- ÉTAPE 1 : Créer la table activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'project', 'invoice', 'expense', 'course', etc.
    entity_id UUID NOT NULL, -- ID de l'entité concernée
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
    user_id UUID NOT NULL, -- ID du profil (profiles.id) qui a fait l'action
    user_name TEXT, -- Nom de l'utilisateur (pour affichage rapide)
    user_email TEXT, -- Email de l'utilisateur
    changes JSONB, -- Détails des modifications (avant/après pour 'updated')
    description TEXT, -- Description libre de l'action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ÉTAPE 2 : Activer RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs peuvent voir les logs des entités auxquelles ils ont accès
CREATE POLICY activity_logs_select_authenticated
ON public.activity_logs
FOR SELECT
TO authenticated
USING (true); -- Pour l'instant, tous les utilisateurs authentifiés peuvent voir les logs

-- ÉTAPE 3 : Fonction helper pour obtenir le profil depuis auth.uid()
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE(profile_id UUID, full_name TEXT, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.full_name, p.email
    FROM profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 4 : Fonction générique pour logger une action
CREATE OR REPLACE FUNCTION log_activity(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_action TEXT,
    p_changes JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_profile RECORD;
    v_log_id UUID;
BEGIN
    -- Récupérer le profil de l'utilisateur actuel
    SELECT * INTO v_profile FROM get_user_profile();
    
    IF v_profile.profile_id IS NULL THEN
        RAISE WARNING 'User profile not found for auth.uid()';
        RETURN NULL;
    END IF;
    
    -- Insérer le log
    INSERT INTO public.activity_logs (
        entity_type,
        entity_id,
        action,
        user_id,
        user_name,
        user_email,
        changes,
        description
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_action,
        v_profile.profile_id,
        v_profile.full_name,
        v_profile.email,
        p_changes,
        p_description
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 5 : Trigger pour projets (exemple)
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := jsonb_build_object(
            'new', row_to_json(NEW)
        );
        PERFORM log_activity('project', NEW.id, v_action, v_changes, 'Projet créé');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'updated';
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW),
            'changed_fields', (
                SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
                FROM jsonb_each(to_jsonb(OLD)) AS old_data(key, old_val)
                JOIN jsonb_each(to_jsonb(NEW)) AS new_data(key, new_val)
                ON old_data.key = new_data.key
                WHERE old_data.value IS DISTINCT FROM new_data.value
            )
        );
        PERFORM log_activity('project', NEW.id, v_action, v_changes, 'Projet modifié');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := jsonb_build_object('old', row_to_json(OLD));
        PERFORM log_activity('project', OLD.id, v_action, v_changes, 'Projet supprimé');
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Attacher le trigger aux projets
DROP TRIGGER IF EXISTS trigger_log_project_changes ON public.projects;
CREATE TRIGGER trigger_log_project_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION log_project_changes();

-- ÉTAPE 6 : Trigger pour factures
CREATE OR REPLACE FUNCTION log_invoice_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := jsonb_build_object('new', row_to_json(NEW));
        PERFORM log_activity('invoice', NEW.id, v_action, v_changes, 'Facture créée');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'updated';
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW),
            'changed_fields', (
                SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
                FROM jsonb_each(to_jsonb(OLD)) AS old_data(key, old_val)
                JOIN jsonb_each(to_jsonb(NEW)) AS new_data(key, new_val)
                ON old_data.key = new_data.key
                WHERE old_data.value IS DISTINCT FROM new_data.value
            )
        );
        PERFORM log_activity('invoice', NEW.id, v_action, v_changes, 'Facture modifiée');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := jsonb_build_object('old', row_to_json(OLD));
        PERFORM log_activity('invoice', OLD.id, v_action, v_changes, 'Facture supprimée');
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_invoice_changes ON public.invoices;
CREATE TRIGGER trigger_log_invoice_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION log_invoice_changes();

-- ÉTAPE 7 : Trigger pour dépenses
CREATE OR REPLACE FUNCTION log_expense_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_activity('expense', NEW.id, 'created', jsonb_build_object('new', row_to_json(NEW)), 'Dépense créée');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_activity('expense', NEW.id, 'updated', jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)), 'Dépense modifiée');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_activity('expense', OLD.id, 'deleted', jsonb_build_object('old', row_to_json(OLD)), 'Dépense supprimée');
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_expense_changes ON public.expenses;
CREATE TRIGGER trigger_log_expense_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION log_expense_changes();

-- ÉTAPE 8 : Trigger pour cours
CREATE OR REPLACE FUNCTION log_course_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_activity('course', NEW.id, 'created', jsonb_build_object('new', row_to_json(NEW)), 'Cours créé');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_activity('course', NEW.id, 'updated', jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)), 'Cours modifié');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_activity('course', OLD.id, 'deleted', jsonb_build_object('old', row_to_json(OLD)), 'Cours supprimé');
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_course_changes ON public.courses;
CREATE TRIGGER trigger_log_course_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION log_course_changes();

-- ÉTAPE 9 : Trigger pour objectifs (OKRs)
CREATE OR REPLACE FUNCTION log_objective_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_activity('objective', NEW.id, 'created', jsonb_build_object('new', row_to_json(NEW)), 'Objectif créé');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_activity('objective', NEW.id, 'updated', jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)), 'Objectif modifié');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_activity('objective', OLD.id, 'deleted', jsonb_build_object('old', row_to_json(OLD)), 'Objectif supprimé');
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_objective_changes ON public.objectives;
CREATE TRIGGER trigger_log_objective_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.objectives
    FOR EACH ROW EXECUTE FUNCTION log_objective_changes();

-- ÉTAPE 10 : Ajouter des colonnes created_by_name et updated_by_name aux tables principales (optionnel, pour affichage rapide)
-- Note: Ces colonnes peuvent être calculées depuis activity_logs, mais on les ajoute pour performance

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- Trigger pour mettre à jour created_by_name et updated_by_name automatiquement
CREATE OR REPLACE FUNCTION update_entity_creator_names()
RETURNS TRIGGER AS $$
DECLARE
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile FROM get_user_profile();
    
    IF v_profile.profile_id IS NOT NULL THEN
        IF TG_OP = 'INSERT' THEN
            NEW.created_by_name := v_profile.full_name;
            NEW.updated_by_name := v_profile.full_name;
        ELSIF TG_OP = 'UPDATE' THEN
            NEW.updated_by_name := v_profile.full_name;
            -- Garder created_by_name s'il existe déjà
            IF NEW.created_by_name IS NULL AND OLD.created_by_name IS NOT NULL THEN
                NEW.created_by_name := OLD.created_by_name;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attacher aux tables
DROP TRIGGER IF EXISTS trigger_update_project_creator_names ON public.projects;
CREATE TRIGGER trigger_update_project_creator_names
    BEFORE INSERT OR UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_entity_creator_names();

DROP TRIGGER IF EXISTS trigger_update_invoice_creator_names ON public.invoices;
CREATE TRIGGER trigger_update_invoice_creator_names
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_entity_creator_names();

DROP TRIGGER IF EXISTS trigger_update_expense_creator_names ON public.expenses;
CREATE TRIGGER trigger_update_expense_creator_names
    BEFORE INSERT OR UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_entity_creator_names();

DROP TRIGGER IF EXISTS trigger_update_course_creator_names ON public.courses;
CREATE TRIGGER trigger_update_course_creator_names
    BEFORE INSERT OR UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION update_entity_creator_names();

DROP TRIGGER IF EXISTS trigger_update_objective_creator_names ON public.objectives;
CREATE TRIGGER trigger_update_objective_creator_names
    BEFORE INSERT OR UPDATE ON public.objectives
    FOR EACH ROW EXECUTE FUNCTION update_entity_creator_names();

-- ✅ Vérification
SELECT '✅ Système d''historique créé avec succès!' as status;
SELECT COUNT(*) as total_triggers FROM pg_trigger WHERE tgname LIKE 'trigger_log_%' OR tgname LIKE 'trigger_update_%';

