import { ModuleName, Role } from '../types';

export type PermissionState = {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canApprove: boolean;
};

const createState = (
  read = false,
  write = false,
  del = false,
  approve = false
): PermissionState => ({
  canRead: read,
  canWrite: write,
  canDelete: del,
  canApprove: approve,
});

const clone = (state: PermissionState): PermissionState => ({ ...state });

const STANDARD_ALLOW = createState(true, true, true, true);
const DISABLED = createState(false, false, false, false);

/** Modules métier : accès possible selon département / droits */
const STANDARD_MODULES: ModuleName[] = [
  'dashboard',
  'projects',
  'goals_okrs',
  'time_tracking',
  'planning',
  'leave_management',
  'finance',
  'comptabilite',
  'knowledge_base',
  'daf_services',
  'courses',
  'jobs',
  'crm_sales',
  'analytics',
  'talent_analytics',
  'rh',
  'postes_management',
  'trinite',
  'programme',
  'tech',
  'settings',
  'logistique',
  'parc_auto',
  'ticket_it',
  'messagerie',
  'qualite',
  'conseil',
];

/** Administration : paramétrage / droits (Paramètres) ; désactivé par défaut */
export const MANAGEMENT_MODULES: ModuleName[] = [
  'organization_management',
  'department_management',
  'course_management',
  'job_management',
  'leave_management_admin',
  'user_management',
];

const applyState = (
  target: Record<ModuleName, PermissionState>,
  modules: ModuleName[],
  state: PermissionState
) => {
  modules.forEach((module) => {
    target[module] = clone(state);
  });
};

const createBasePermissions = (): Record<ModuleName, PermissionState> => {
  const base: Partial<Record<ModuleName, PermissionState>> = {};
  const all = [...STANDARD_MODULES, ...MANAGEMENT_MODULES] as ModuleName[];
  applyState(base as Record<ModuleName, PermissionState>, all, DISABLED);
  return base as Record<ModuleName, PermissionState>;
};

/**
 * Droits « théoriques » avant surcharges Supabase (`user_module_permissions`) et filtre départements.
 * Hors super-admin : tout refusé par défaut — l’accès ne vient que des droits configurés + départements.
 */
export const getDefaultPermissionsForRole = (
  role: Role
): Record<ModuleName, PermissionState> => {
  const permissions = createBasePermissions();

  if (role === 'super_administrator') {
    applyState(permissions, STANDARD_MODULES, STANDARD_ALLOW);
    applyState(permissions, MANAGEMENT_MODULES, STANDARD_ALLOW);
  }

  return permissions;
};
