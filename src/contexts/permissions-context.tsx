'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserPermissions {
  isSuperAdmin: boolean;
  role: string | null;
  effectivePermissions: string[];
}

interface PermissionsContextType {
  permissions: UserPermissions | null;
  loading: boolean;
  refetch: () => void;
}

export const PermissionsContext = createContext<PermissionsContextType>({
  permissions: null,
  loading: true,
  refetch: () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      // Server already sets cache headers (5 minutes)
      // Client-side caching is handled by browser automatically
      const response = await fetch('/api/admin/auth/permissions', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [PERMISSIONS CONTEXT] Permissions fetched:', data);
        setPermissions(data.data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [PERMISSIONS CONTEXT] Failed to fetch permissions:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        setPermissions(null);
      }
    } catch (error) {
      console.error('❌ [PERMISSIONS CONTEXT] Exception fetching permissions:', error);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, refetch: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
}
