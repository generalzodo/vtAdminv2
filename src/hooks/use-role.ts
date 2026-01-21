'use client';

import { useContext } from 'react';
import { PermissionsContext } from '@/contexts/permissions-context';

export type AdminRole = 
  | 'cso'
  | 'scheduling_officer'
  | 'transport_officer'
  | 'station_manager'
  | 'booking_officer'
  | 'finance_officer'
  | 'finance_admin'
  | 'finance_accountant'
  | 'it_officer'
  | 'audit_compliance_officer'
  | 'admin'
  | 'super_admin';

/**
 * Hook to get current user's role
 * Uses PermissionsContext to avoid duplicate API calls
 */
export function useRole(): { role: AdminRole | null; loading: boolean } {
  const context = useContext(PermissionsContext);
  
  if (!context || context.loading || !context.permissions) {
    return { role: null, loading: context?.loading ?? true };
  }

  // Get role from permissions context
  const role = context.permissions.role || null;
  
  return { role: role as AdminRole | null, loading: false };
}

/**
 * Hook to check if user has a specific role
 * Can be used as a hook or standalone function
 */
export function hasRole(roleName: AdminRole | AdminRole[]): boolean {
  const context = useContext(PermissionsContext);
  
  if (!context || context.loading || !context.permissions) {
    return false;
  }

  const userRole = context.permissions.role || null;
  const rolesToCheck = Array.isArray(roleName) ? roleName : [roleName];
  
  return userRole ? rolesToCheck.includes(userRole as AdminRole) : false;
}

/**
 * Hook version of hasRole for use in components
 */
export function useHasRole(roleName: AdminRole | AdminRole[]): boolean {
  return hasRole(roleName);
}

/**
 * Hook to check if user has any of the specified roles
 */
export function hasAnyRole(roleNames: AdminRole[]): boolean {
  return hasRole(roleNames);
}

/**
 * Hook to check if user has CSO role
 */
export function useIsCSO(): boolean {
  return hasRole('cso');
}

/**
 * Hook to check if user has Scheduling Officer role
 */
export function useIsSO(): boolean {
  return hasRole('scheduling_officer');
}

/**
 * Hook to check if user has Transport Officer role
 */
export function useIsTO(): boolean {
  return hasRole('transport_officer');
}

/**
 * Hook to check if user has Station Manager role
 */
export function useIsSM(): boolean {
  return hasRole('station_manager');
}

/**
 * Hook to check if user has Booking Officer role
 */
export function useIsBO(): boolean {
  return hasRole('booking_officer');
}

/**
 * Hook to check if user has Finance role (any finance role)
 */
export function useIsFinance(): boolean {
  return hasAnyRole(['finance_officer', 'finance_admin', 'finance_accountant']);
}

/**
 * Hook to check if user has IT Officer role
 */
export function useIsITO(): boolean {
  return hasRole('it_officer');
}

/**
 * Hook to check if user has Audit & Compliance Officer role
 */
export function useIsACO(): boolean {
  return hasRole('audit_compliance_officer');
}
