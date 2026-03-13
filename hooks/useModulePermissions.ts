import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { DataService } from '../services/dataService';
import { DepartmentService } from '../services/departmentService';
import { ModuleName, Role } from '../types';
import {
  getDefaultPermissionsForRole,
  PermissionState,
} from '../utils/modulePermissionDefaults';

type ModulePermissions = Record<ModuleName, PermissionState>;

const NO_ACCESS: PermissionState = { canRead: false, canWrite: false, canDelete: false, canApprove: false };

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
      const role = (user.role || 'member') as Role;
      const isSuperAdmin = role === 'super_administrator';
      // Charger d'abord les permissions par défaut
      let effective = getDefaultPermissionsForRole(role);
      // Puis surcharger avec les permissions Supabase si existantes
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
      // Phase 2 : restreindre par départements (super admin hors règle)
      // Plan : Super admin = tous les modules ; sans département = fallback rôle + user_module_permissions ; avec département = union des module_slugs puis granularité user_module_permissions
      const authUserId = user.id;
      const allowedSlugs = await DepartmentService.getAllowedModuleSlugsForUser(String(authUserId));
      if (isSuperAdmin) {
        // Super admin : pas de filtre par département, accès total conservé
      } else if (allowedSlugs.length > 0) {
        // Utilisateur avec au moins un département : restreindre aux modules autorisés sur ces départements
        const allowedSet = new Set<ModuleName>(allowedSlugs);
        (Object.keys(effective) as ModuleName[]).forEach((moduleName) => {
          if (!allowedSet.has(moduleName)) {
            effective[moduleName] = NO_ACCESS;
          }
        });
      }
      // Si allowedSlugs.length === 0 : fallback sur le comportement actuel (effective = défauts rôle + user_module_permissions déjà chargés)
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
          canWrite: canRead,
          canDelete: canRead,
          canApprove: canRead,
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

    // Écouter les événements de rechargement des permissions
    window.addEventListener('permissions-reload', loadPermissions);

    return () => {
      window.removeEventListener('permissions-reload', loadPermissions);
    };
  }, [loadPermissions]);

  // Fonction pour vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (
    module: ModuleName,
    _action: 'read' | 'write' | 'delete' | 'approve'
  ): boolean => {
    if (!user) return false;

    const modulePermissions = permissions[module];
    if (!modulePermissions) return false;

    return !!modulePermissions.canRead;
  };

  // Fonction pour vérifier si l'utilisateur peut accéder à un module (au minimum read)
  const canAccessModule = (module: ModuleName): boolean => {
    return hasPermission(module, 'read');
  };

  return {
    permissions,
    loading,
    hasPermission,
    canAccessModule
  };
};
