import { ModuleName } from '../types';

/**
 * Associe une vue App (`currentView`) au module métier contrôlé par `useModulePermissions`.
 * Retourne `null` pour les vues internes (notifications, etc.) sans garde module.
 */
export function viewNameToModuleName(view: string): ModuleName | null {
  if (!view || view === 'login' || view === 'signup' || view === 'pending_access') return null;

  if (view === 'notifications_center' || view === 'activity_logs' || view === 'status_selector') {
    return null;
  }

  const map: Record<string, ModuleName> = {
    dashboard: 'dashboard',
    time_tracking: 'time_tracking',
    projects: 'projects',
    goals_okrs: 'goals_okrs',
    courses: 'courses',
    course_detail: 'courses',
    course_management: 'course_management',
    jobs: 'jobs',
    create_job: 'jobs',
    job_management: 'job_management',
    crm_sales: 'crm_sales',
    knowledge_base: 'knowledge_base',
    daf_services: 'daf_services',
    leave_management: 'leave_management',
    leave_management_admin: 'leave_management_admin',
    finance: 'finance',
    comptabilite: 'comptabilite',
    analytics: 'analytics',
    talent_analytics: 'talent_analytics',
    rh: 'rh',
    planning: 'planning',
    user_management: 'user_management',
    organization_management: 'organization_management',
    department_management: 'department_management',
    settings: 'settings',
    programme: 'programme',
    tech: 'tech',
    trinite: 'trinite',
    logistique: 'logistique',
    parc_auto: 'parc_auto',
    ticket_it: 'ticket_it',
    messagerie: 'messagerie',
    qualite: 'qualite',
    conseil: 'conseil',
    postes_management: 'postes_management',
  };

  if (map[view]) return map[view];
  if (view.startsWith('project')) return 'projects';
  if (view.startsWith('course')) return 'courses';
  return null;
}

const LANDING_ORDER: ModuleName[] = [
  'dashboard',
  'settings',
  'crm_sales',
  'projects',
  'rh',
  'planning',
  'messagerie',
  'time_tracking',
  'goals_okrs',
  'courses',
  'jobs',
  'finance',
  'comptabilite',
  'knowledge_base',
  'daf_services',
  'leave_management',
  'analytics',
  'talent_analytics',
  'programme',
  'tech',
  'trinite',
  'logistique',
  'parc_auto',
  'ticket_it',
  'qualite',
  'conseil',
  'postes_management',
  'department_management',
  'user_management',
  'organization_management',
  'course_management',
  'job_management',
  'leave_management_admin',
];

/** Première vue accessible après connexion (hors super-admin géré par l’appelant). */
export function getFirstAccessibleView(canAccessModule: (m: ModuleName) => boolean): string {
  for (const m of LANDING_ORDER) {
    if (canAccessModule(m)) {
      if (m === 'dashboard') return 'dashboard';
      if (m === 'settings') return 'settings';
      return m;
    }
  }
  return 'pending_access';
}
