'use client';

import { useState, useEffect } from 'react';

interface UserPermissions {
  isSuperAdmin: boolean;
  effectivePermissions: string[];
}

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
 * Supports .manage permissions as wildcards for their category
 */
export function useHasPermission(permission: string): boolean {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const response = await fetch('/api/admin/auth/permissions');
        if (response.ok) {
          const data = await response.json();
          const userPerms: UserPermissions = data.data;
          
          // Super admin has all permissions
          if (userPerms.isSuperAdmin) {
            setHasPermission(true);
          } else {
            // Check if user has the permission (including .manage wildcards)
            setHasPermission(
              checkPermissionInList(userPerms.effectivePermissions, permission)
            );
          }
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permission]);

  return hasPermission;
}

/**
 * Hook to check if current user is super admin
 */
export function useIsSuperAdmin(): boolean {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const response = await fetch('/api/admin/auth/permissions');
        if (response.ok) {
          const data = await response.json();
          console.log('Permissions API response:', data);
          setIsSuperAdmin(data.data?.isSuperAdmin || false);
        } else {
          console.error('Permissions API error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, []);

  return isSuperAdmin;
}

/**
 * Hook to get all user permissions
 */
export function usePermissions(): { permissions: UserPermissions | null; loading: boolean } {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/admin/auth/permissions');
        if (response.ok) {
          const data = await response.json();
          setPermissions(data.data);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return { permissions, loading };
}

