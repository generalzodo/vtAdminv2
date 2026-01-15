'use client';

import { useContext } from 'react';
import { PermissionsContext, UserPermissions } from '@/contexts/permissions-context';

/**
 * Helper function to check if effective permissions include a specific permission
 * Supports .manage permissions as wildcards for their category
 */
const checkPermissionInList = (effectivePerms: string[], permission: string): boolean => {
  // Check if user has the permission or wildcard
  if (effectivePerms.includes(permission) || effectivePerms.includes('*')) {
    return true;
  }

  // Check if user has .manage permission for the category
  // e.g., users.manage grants access to users.view, users.create, etc.
  const permissionParts = permission.split('.');
  if (permissionParts.length >= 2) {
    const category = permissionParts[0];
    const managePermission = `${category}.manage`;
    if (effectivePerms.includes(managePermission)) {
      return true;
    }
  }

  return false;
};

/**
 * Hook to check if current user has a specific permission
 * Uses PermissionsContext to avoid duplicate API calls
 */
export function useHasPermission(permission: string): boolean {
  const context = useContext(PermissionsContext);
  
  if (!context || context.loading || !context.permissions) {
    return false;
  }

  const { permissions } = context;
  
  // Super admin has all permissions
  if (permissions.isSuperAdmin) {
    return true;
  }

  // Check if user has the permission (including .manage wildcards)
  return checkPermissionInList(permissions.effectivePermissions, permission);
}

/**
 * Hook to check if current user is super admin
 * Uses PermissionsContext to avoid duplicate API calls
 */
export function useIsSuperAdmin(): boolean {
  const context = useContext(PermissionsContext);
  
  if (!context || context.loading || !context.permissions) {
    return false;
  }

  return context.permissions.isSuperAdmin;
}

/**
 * Hook to get all user permissions
 * Uses PermissionsContext for shared state
 */
export function usePermissions(): { permissions: UserPermissions | null; loading: boolean } {
  const context = useContext(PermissionsContext);
  
  if (!context) {
    // Fallback if context not available (shouldn't happen in admin layout)
    return { permissions: null, loading: true };
  }
  
  return { permissions: context.permissions, loading: context.loading };
}

