'use client';

import { ReactNode } from 'react';
import { useHasPermission, useIsSuperAdmin } from '@/hooks/use-permissions';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to conditionally render content based on user permissions
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const hasPermission = useHasPermission(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface SuperAdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to conditionally render content for super admin only
 */
export function SuperAdminGate({ children, fallback = null }: SuperAdminGateProps) {
  const isSuperAdmin = useIsSuperAdmin();

  if (!isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

