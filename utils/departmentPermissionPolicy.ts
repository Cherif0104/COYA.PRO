import { ModuleName, Role } from '../types';
import { PermissionState } from './modulePermissionDefaults';

export const NO_ACCESS: PermissionState = {
  canRead: false,
  canWrite: false,
  canDelete: false,
  canApprove: false,
};

/** Accès minimal si aucun département : structure / affectations (admin & manager). */
export const BOOTSTRAP_MODULES_NO_DEPT: ModuleName[] = [
  'organization_management',
  'department_management',
  'user_management',
  'settings',
];

export const BOOTSTRAP_STATE: PermissionState = {
  canRead: true,
  canWrite: true,
  canDelete: false,
  canApprove: false,
};

export function buildExplicitReadDenyFromRows(rows: unknown[] | null | undefined): Set<ModuleName> {
  const s = new Set<ModuleName>();
  if (!Array.isArray(rows)) return s;
  for (const row of rows) {
    const r = row as { module_name?: string; can_read?: boolean | null };
    if (r && r.can_read === false && r.module_name) {
      s.add(r.module_name as ModuleName);
    }
  }
  return s;
}

/**
 * Périmètre départements : hors périmètre = refusé.
 * Sur les modules autorisés : lecture minimale si le rôle / la ligne n’impose pas déjà la lecture,
 * sauf refus explicite en base (`can_read` false sur une ligne existante).
 */
export function applyDepartmentScopeToPermissions(
  effective: Record<ModuleName, PermissionState>,
  allowedSlugs: ModuleName[],
  role: Role,
  explicitReadDeny?: Set<ModuleName>,
): void {
  if (role === 'super_administrator') return;

  if (allowedSlugs.length > 0) {
    const allowedSet = new Set(allowedSlugs);
    (Object.keys(effective) as ModuleName[]).forEach((m) => {
      if (!allowedSet.has(m)) {
        effective[m] = { ...NO_ACCESS };
      }
    });
    for (const m of allowedSlugs) {
      const p = effective[m];
      if (!p) continue;
      if (p.canRead) continue;
      if (explicitReadDeny?.has(m)) continue;
      effective[m] = { ...p, canRead: true };
    }
    return;
  }

  const canBootstrap = role === 'administrator' || role === 'manager';
  (Object.keys(effective) as ModuleName[]).forEach((m) => {
    effective[m] = { ...NO_ACCESS };
  });
  if (canBootstrap) {
    BOOTSTRAP_MODULES_NO_DEPT.forEach((m) => {
      effective[m] = { ...BOOTSTRAP_STATE };
    });
  }
}

/** `null` = pas de filtre (cible super-administrateur). */
export function getSavableModuleFilter(allowedSlugs: ModuleName[], role: Role): Set<ModuleName> | null {
  if (role === 'super_administrator') return null;
  if (allowedSlugs.length > 0) return new Set(allowedSlugs);
  const canBootstrap = role === 'administrator' || role === 'manager';
  if (canBootstrap) return new Set(BOOTSTRAP_MODULES_NO_DEPT);
  return new Set();
}

export function filterPermissionRowsForDepartmentScope<
  T extends {
    moduleName: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canApprove: boolean;
  },
>(rows: T[], savable: Set<ModuleName> | null): T[] {
  if (savable === null) return rows;
  return rows.filter((r) => savable.has(r.moduleName as ModuleName));
}
