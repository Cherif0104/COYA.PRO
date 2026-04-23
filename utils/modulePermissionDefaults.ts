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
  'trinite',
  'programme',
  'tech',
  'settings',
  'logistique',
  'parc_auto',
  'ticket_it',
  'messagerie',
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

  applyState(base as Record<ModuleName, PermissionState>, STANDARD_MODULES, STANDARD_ALLOW);
  applyState(base as Record<ModuleName, PermissionState>, MANAGEMENT_MODULES, DISABLED);

  return base as Record<ModuleName, PermissionState>;
};

export const getDefaultPermissionsForRole = (
  role: Role
): Record<ModuleName, PermissionState> => {
  const permissions = createBasePermissions();

  if (role === 'super_administrator') {
    applyState(permissions, MANAGEMENT_MODULES, STANDARD_ALLOW);
  }

  return permissions;
};
