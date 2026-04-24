import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { DataService } from '../services/dataService';
import { DepartmentService } from '../services/departmentService';
import { ModuleName, Role } from '../types';
import { getDefaultPermissionsForRole, PermissionState } from '../utils/modulePermissionDefaults';

type ModulePermissions = Record<ModuleName, PermissionState>;

const NO_ACCESS: PermissionState = { canRead: false, canWrite: false, canDelete: false, canApprove: false };

/** Accès minimal si aucun département : structure / affectations (admin & manager). */
const BOOTSTRAP_MODULES_NO_DEPT: ModuleName[] = [
  'organization_management',
  'department_management',
  'user_management',
  'settings',
];

const BOOTSTRAP_STATE: PermissionState = {
  canRead: true,
  canWrite: true,
  canDelete: false,
  canApprove: false,
};

export const useModulePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermissions>({});
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const role = (user.role || 'student') as Role;
      const isSuperAdmin = role === 'super_administrator';
      let effective = getDefaultPermissionsForRole(role);

      const userIdToUse = (user as any).profileId || user.id;
      if (!isSuperAdmin) {
        const { data, error } = await DataService.getUserModulePermissions(String(userIdToUse));
        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach((row: any) => {
            const moduleName = row.module_name as ModuleName;
            effective[moduleName] = {
              canRead: !!row.can_read,
              canWrite: !!row.can_write,
              canDelete: !!row.can_delete,
              canApprove: !!row.can_approve,
            };
          });
        }
      }

      const authUserId = String(user.id);
      const allowedSlugs = await DepartmentService.getAllowedModuleSlugsForUser(authUserId);

      if (isSuperAdmin) {
        // pas de filtre département
      } else if (allowedSlugs.length > 0) {
        const allowedSet = new Set<ModuleName>(allowedSlugs);
        (Object.keys(effective) as ModuleName[]).forEach((moduleName) => {
          if (!allowedSet.has(moduleName)) {
            effective[moduleName] = NO_ACCESS;
          }
        });
      } else {
        // Aucun département (ou départements sans modules) : accès métier refusé.
        // Administrateur / manager : garde-fou pour créer départements et affecter les membres.
        const canBootstrap = role === 'administrator' || role === 'manager';
        (Object.keys(effective) as ModuleName[]).forEach((moduleName) => {
          effective[moduleName] = NO_ACCESS;
        });
        if (canBootstrap) {
          BOOTSTRAP_MODULES_NO_DEPT.forEach((m) => {
            effective[m] = { ...BOOTSTRAP_STATE };
          });
        }
      }

      const normalizedPermissions = Object.entries(effective).reduce((acc, [moduleName, perms]) => {
        const canRead = !!perms.canRead;
        acc[moduleName as ModuleName] = {
          canRead,
          canWrite: canRead ? perms.canWrite : false,
          canDelete: canRead ? perms.canDelete : false,
          canApprove: canRead ? perms.canApprove : false,
        };
        return acc;
      }, {} as Record<ModuleName, PermissionState>);

      setPermissions(normalizedPermissions);
    } catch (e) {
      console.error('❌ useModulePermissions - Error loading permissions:', e);
      const fallback = getDefaultPermissionsForRole(user.role as Role);
      const normalizedFallback = Object.entries(fallback).reduce((acc, [moduleName, perms]) => {
        const canRead = !!perms.canRead;
        acc[moduleName as ModuleName] = {
          canRead,
          canWrite: canRead ? perms.canWrite : false,
          canDelete: canRead ? perms.canDelete : false,
          canApprove: canRead ? perms.canApprove : false,
        };
        return acc;
      }, {} as Record<ModuleName, PermissionState>);
      setPermissions(normalizedFallback);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPermissions();

    window.addEventListener('permissions-reload', loadPermissions);

    return () => {
      window.removeEventListener('permissions-reload', loadPermissions);
    };
  }, [loadPermissions]);

  const hasPermission = (
    module: ModuleName,
    action: 'read' | 'write' | 'delete' | 'approve'
  ): boolean => {
    if (!user) return false;

    const modulePermissions = permissions[module];
    if (!modulePermissions) return false;

    if (action === 'read') return !!modulePermissions.canRead;
    if (action === 'write') return !!modulePermissions.canWrite;
    if (action === 'delete') return !!modulePermissions.canDelete;
    if (action === 'approve') return !!modulePermissions.canApprove;
    return false;
  };

  const canAccessModule = (module: ModuleName): boolean => {
    return hasPermission(module, 'read');
  };

  return {
    permissions,
    loading,
    hasPermission,
    canAccessModule,
  };
};
