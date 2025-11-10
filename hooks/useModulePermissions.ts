import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { DataService } from '../services/dataService';
import { ModuleName, Role } from '../types';
import {
  getDefaultPermissionsForRole,
  PermissionState,
} from '../utils/modulePermissionDefaults';

type ModulePermissions = Record<ModuleName, PermissionState>;

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
      // Utiliser profileId si disponible, sinon user.id (fallback pour compatibilité)
      const userIdToUse = (user as any).profileId || user.id;
      console.log('🔄 useModulePermissions - Loading permissions for userId:', userIdToUse, 'profileId:', (user as any).profileId);
      if (!isSuperAdmin) {
        const { data, error } = await DataService.getUserModulePermissions(String(userIdToUse));
        if (!error && Array.isArray(data) && data.length > 0) {
          console.log('✅ useModulePermissions - Loaded', data.length, 'custom permissions from Supabase');
          data.forEach((row: any) => {
            const moduleName = row.module_name as ModuleName;
            effective[moduleName] = {
              canRead: !!row.can_read,
              canWrite: !!row.can_write,
              canDelete: !!row.can_delete,
              canApprove: !!row.can_approve,
            };
          });
        } else {
          console.log('ℹ️ useModulePermissions - No custom permissions, using role defaults');
        }
      }
      const normalizedPermissions = Object.entries(effective).reduce((acc, [moduleName, perms]) => {
        const canRead = !!perms.canRead;
        acc[moduleName as ModuleName] = {
          canRead,
          canWrite: canRead,
          canDelete: canRead,
          canApprove: canRead,
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
