-- ════════════════════════════════════════════════════════════════
-- NETTOYAGE DES DONNÉES DE TEST POUR LA PRODUCTION
-- ════════════════════════════════════════════════════════════════
-- 
-- ⚠️ ATTENTION : Ce script supprime définitivement les données de test
-- Exécutez-le UNIQUEMENT si vous êtes sûr de vouloir tout nettoyer
-- 
-- Recommandation : Faites un backup de votre base avant d'exécuter
-- ════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- OPTION 1 : NETTOYAGE COMPLET (décommenter pour exécuter)
-- ═══════════════════════════════════════════════════════════

-- Supprimer toutes les données de test dans l'ordre (contraintes FK)

-- 1. Documents et favoris
-- TRUNCATE TABLE document_favorites CASCADE;
-- TRUNCATE TABLE documents CASCADE;

-- 2. Base de connaissances (si tables corpus activées)
-- TRUNCATE TABLE kb_chunks CASCADE;
-- TRUNCATE TABLE kb_files CASCADE;

-- 3. Emplois et candidatures
-- TRUNCATE TABLE job_applications CASCADE;
-- TRUNCATE TABLE jobs CASCADE;

-- 4. Cours et inscriptions
-- TRUNCATE TABLE course_notes CASCADE;
-- TRUNCATE TABLE course_enrollments CASCADE;
-- TRUNCATE TABLE lessons CASCADE;
-- TRUNCATE TABLE modules CASCADE;
-- TRUNCATE TABLE courses CASCADE;

-- 5. Gestion de projet
-- TRUNCATE TABLE key_results CASCADE;
-- TRUNCATE TABLE objectives CASCADE;
-- TRUNCATE TABLE project_reports CASCADE;
-- TRUNCATE TABLE task_summaries CASCADE;
-- TRUNCATE TABLE projects CASCADE;

-- 6. Temps et congés
-- TRUNCATE TABLE time_logs CASCADE;
-- TRUNCATE TABLE leave_requests CASCADE;

-- 7. Réunions
-- TRUNCATE TABLE meetings CASCADE;

-- 8. Finance
-- TRUNCATE TABLE budget_items CASCADE;
-- TRUNCATE TABLE budget_lines CASCADE;
-- TRUNCATE TABLE budgets CASCADE;
-- TRUNCATE TABLE expenses CASCADE;
-- TRUNCATE TABLE recurring_expenses CASCADE;
-- TRUNCATE TABLE invoices CASCADE;
-- TRUNCATE TABLE recurring_invoices CASCADE;

-- 9. CRM
-- TRUNCATE TABLE contacts CASCADE;

-- 10. Permissions personnalisées
-- TRUNCATE TABLE user_module_permissions CASCADE;

-- 11. Notifications
-- TRUNCATE TABLE notifications CASCADE;

-- 12. Logs d'activité
-- TRUNCATE TABLE activity_logs CASCADE;

-- ═══════════════════════════════════════════════════════════
-- OPTION 2 : NETTOYAGE SÉLECTIF (recommandé)
-- ═══════════════════════════════════════════════════════════

-- Garder l'organisation SENEGEL et le super admin principal
-- Supprimer uniquement les données créées après une certaine date

-- Définir la date limite (ajuster selon vos besoins)
-- Exemple : garder uniquement les données créées aujourd'hui
DO $$ 
DECLARE
  cutoff_date TIMESTAMP := '2025-11-07 00:00:00'::timestamp;
  senegel_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
  super_admin_email TEXT := 'contact.cherif.pro@gmail.com';
  super_admin_id UUID;
BEGIN
  -- Récupérer l'ID du super admin
  SELECT user_id INTO super_admin_id FROM profiles WHERE email = super_admin_email LIMIT 1;
  
  -- Afficher le nombre d'éléments à supprimer (pour info)
  RAISE NOTICE 'Projets à supprimer: %', (SELECT COUNT(*) FROM projects WHERE created_at < cutoff_date);
  RAISE NOTICE 'Documents à supprimer: %', (SELECT COUNT(*) FROM documents WHERE created_at < cutoff_date);
  RAISE NOTICE 'Cours à supprimer: %', (SELECT COUNT(*) FROM courses WHERE created_at < cutoff_date);
  RAISE NOTICE 'Jobs à supprimer: %', (SELECT COUNT(*) FROM jobs WHERE created_at < cutoff_date);
  RAISE NOTICE 'Factures à supprimer: %', (SELECT COUNT(*) FROM invoices WHERE created_at < cutoff_date);
  RAISE NOTICE 'Congés à supprimer: %', (SELECT COUNT(*) FROM leave_requests WHERE created_at < cutoff_date);
  
  -- Décommenter pour exécuter la suppression
  /*
  DELETE FROM documents WHERE created_at < cutoff_date;
  DELETE FROM jobs WHERE created_at < cutoff_date;
  DELETE FROM course_enrollments WHERE created_at < cutoff_date;
  DELETE FROM courses WHERE created_at < cutoff_date;
  DELETE FROM objectives WHERE created_at < cutoff_date;
  DELETE FROM projects WHERE created_at < cutoff_date;
  DELETE FROM time_logs WHERE created_at < cutoff_date;
  DELETE FROM leave_requests WHERE created_at < cutoff_date;
  DELETE FROM meetings WHERE created_at < cutoff_date;
  DELETE FROM expenses WHERE created_at < cutoff_date;
  DELETE FROM invoices WHERE created_at < cutoff_date;
  DELETE FROM budgets WHERE created_at < cutoff_date;
  DELETE FROM contacts WHERE created_at < cutoff_date;
  DELETE FROM notifications WHERE created_at < cutoff_date;
  DELETE FROM activity_logs WHERE created_at < cutoff_date;
  */
END $$;

-- ═══════════════════════════════════════════════════════════
-- OPTION 3 : NETTOYAGE PAR TYPE DE DONNÉES
-- ═══════════════════════════════════════════════════════════

-- Nettoyer uniquement certains types de données

-- A. Supprimer tous les projets de test
-- DELETE FROM projects WHERE title ILIKE '%test%' OR description ILIKE '%test%' OR title ILIKE '%demo%';

-- B. Supprimer tous les cours de test
-- DELETE FROM courses WHERE title ILIKE '%test%' OR title ILIKE '%demo%';

-- C. Supprimer tous les emplois de test
-- DELETE FROM jobs WHERE title ILIKE '%test%' OR company ILIKE '%test%';

-- D. Supprimer tous les contacts de test
-- DELETE FROM contacts WHERE name ILIKE '%test%' OR company ILIKE '%test%' OR work_email ILIKE '%test%';

-- E. Supprimer toutes les factures de test
-- DELETE FROM invoices WHERE client_name ILIKE '%test%' OR invoice_number ILIKE '%test%';

-- F. Supprimer tous les budgets de test
-- DELETE FROM budgets WHERE title ILIKE '%test%';

-- G. Supprimer tous les documents de test
-- DELETE FROM documents WHERE title ILIKE '%test%' OR content ILIKE '%test%';

-- ═══════════════════════════════════════════════════════════
-- OPTION 4 : NETTOYAGE DES UTILISATEURS TEST
-- ═══════════════════════════════════════════════════════════

-- ⚠️ ATTENTION : Supprimer des utilisateurs supprime aussi toutes leurs données
-- Ne supprimez PAS le super admin principal !

-- Lister les utilisateurs test (pour vérification avant suppression)
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  p.organization_id,
  (SELECT name FROM organizations WHERE id = p.organization_id) as organization_name
FROM profiles p
WHERE 
  email NOT IN ('contact.cherif.pro@gmail.com') -- Garder le super admin
  AND (
    email ILIKE '%test%' 
    OR email ILIKE '%demo%'
    OR email ILIKE '%facilitateur-partenaire%'
    OR full_name ILIKE '%test%'
  )
ORDER BY created_at DESC;

-- Supprimer les utilisateurs test (décommenter pour exécuter)
-- ⚠️ Vérifiez d'abord la requête SELECT ci-dessus !
/*
DELETE FROM profiles 
WHERE 
  email NOT IN ('contact.cherif.pro@gmail.com') -- GARDER le super admin
  AND (
    email ILIKE '%test%' 
    OR email ILIKE '%demo%'
    OR email ILIKE '%facilitateur-partenaire%'
    OR full_name ILIKE '%test%'
  );
*/

-- ═══════════════════════════════════════════════════════════
-- OPTION 5 : RÉINITIALISATION COMPLÈTE (dernier recours)
-- ═══════════════════════════════════════════════════════════

-- Supprimer TOUTES les données SAUF :
-- - L'organisation SENEGEL
-- - Le super admin principal
-- - Les tables système

-- ⚠️ NE PAS EXÉCUTER À LA LÉGÈRE !

/*
DO $$ 
DECLARE
  senegel_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
  super_admin_email TEXT := 'contact.cherif.pro@gmail.com';
  super_admin_user_id UUID;
  super_admin_profile_id UUID;
BEGIN
  -- Récupérer les IDs du super admin
  SELECT user_id, id INTO super_admin_user_id, super_admin_profile_id 
  FROM profiles 
  WHERE email = super_admin_email 
  LIMIT 1;
  
  -- Supprimer toutes les données sauf celles du super admin
  DELETE FROM documents WHERE created_by_id != super_admin_profile_id;
  DELETE FROM jobs WHERE organization_id = senegel_org_id;
  DELETE FROM courses WHERE organization_id = senegel_org_id;
  DELETE FROM projects WHERE organization_id = senegel_org_id;
  DELETE FROM time_logs WHERE user_id != super_admin_profile_id;
  DELETE FROM leave_requests WHERE user_id != super_admin_profile_id;
  DELETE FROM meetings WHERE organizer_id != super_admin_profile_id;
  DELETE FROM expenses WHERE organization_id = senegel_org_id;
  DELETE FROM invoices WHERE organization_id = senegel_org_id;
  DELETE FROM budgets WHERE organization_id = senegel_org_id;
  DELETE FROM contacts WHERE organization_id = senegel_org_id;
  DELETE FROM objectives WHERE organization_id = senegel_org_id;
  DELETE FROM notifications;
  DELETE FROM activity_logs;
  DELETE FROM user_module_permissions WHERE user_id != super_admin_profile_id;
  
  -- Supprimer tous les utilisateurs SAUF le super admin
  DELETE FROM profiles WHERE user_id != super_admin_user_id;
  
  -- Supprimer toutes les organisations SAUF SENEGEL
  DELETE FROM organizations WHERE id != senegel_org_id;
  
  RAISE NOTICE 'Nettoyage complet terminé. Seul le super admin % et SENEGEL ont été conservés.', super_admin_email;
END $$;
*/

-- ═══════════════════════════════════════════════════════════
-- VÉRIFICATIONS POST-NETTOYAGE
-- ═══════════════════════════════════════════════════════════

-- Compter les éléments restants
SELECT 
  'Utilisateurs' as table_name, COUNT(*) as count FROM profiles
UNION ALL SELECT 'Projets', COUNT(*) FROM projects
UNION ALL SELECT 'Cours', COUNT(*) FROM courses
UNION ALL SELECT 'Emplois', COUNT(*) FROM jobs
UNION ALL SELECT 'Documents', COUNT(*) FROM documents
UNION ALL SELECT 'Contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'Factures', COUNT(*) FROM invoices
UNION ALL SELECT 'Dépenses', COUNT(*) FROM expenses
UNION ALL SELECT 'Budgets', COUNT(*) FROM budgets
UNION ALL SELECT 'Objectifs', COUNT(*) FROM objectives
UNION ALL SELECT 'Meetings', COUNT(*) FROM meetings
UNION ALL SELECT 'Time Logs', COUNT(*) FROM time_logs
UNION ALL SELECT 'Congés', COUNT(*) FROM leave_requests
UNION ALL SELECT 'Organisations', COUNT(*) FROM organizations
ORDER BY table_name;

-- Vérifier les utilisateurs restants
SELECT 
  email,
  full_name,
  role,
  (SELECT name FROM organizations WHERE id = profiles.organization_id) as organization,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- Vérifier les organisations restantes
SELECT 
  name,
  slug,
  is_active,
  (SELECT COUNT(*) FROM profiles WHERE organization_id = organizations.id) as users_count,
  created_at
FROM organizations
ORDER BY created_at;

