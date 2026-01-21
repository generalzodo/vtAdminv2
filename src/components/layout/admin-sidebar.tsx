'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Star, 
  Wallet, 
  Calendar, 
  Bus, 
  UserCog, 
  Route, 
  Settings,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePermissions as usePermissionsContext } from '@/contexts/permissions-context';
import { useRole, useHasRole } from '@/hooks/use-role';
import { useHasPermission } from '@/hooks/use-permissions';
import { FileText, BarChart3 } from 'lucide-react';

// All possible menu items with their required permissions/roles
const allMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { title: 'Users', url: '/users', icon: Users, permission: 'users.view' },
  { title: 'Agents', url: '/agents', icon: UserCheck, permission: 'agents.view' },
  { title: 'Bookings', url: '/bookings', icon: Calendar, permission: 'bookings.view' },
  { title: 'CSO Dashboard', url: '/cso', icon: Calendar, role: 'cso' },
  { title: 'Routes', url: '/routes', icon: Route, permission: 'routes.view' },
  { title: 'Trips', url: '/trips', icon: Calendar, permission: 'trips.view' },
  { title: 'Withdrawals', url: '/withdrawals', icon: Wallet, permission: 'withdrawals.view' },
  { title: 'Reviews', url: '/reviews', icon: Star, permission: 'reviews.view' },
  { title: 'Buses', url: '/buses', icon: Bus, permission: 'buses.view' },
  { title: 'Transport Officers', url: '/drivers', icon: UserCog, permission: 'drivers.view' },
  { title: 'Reports', url: '/reports', icon: BarChart3, permission: 'reports.view' },
  { title: 'Audit Logs', url: '/audit', icon: FileText, permission: 'audit.view' },
  { title: 'Settings', url: '/settings', icon: Settings, permission: 'settings.view' },
];

const superAdminMenuItems = [
  { title: 'Admin Users', url: '/admin-users', icon: Shield },
  { title: 'Roles & Permissions', url: '/roles', icon: ShieldCheck },
];

interface AdminSidebarProps {
  mobile?: boolean;
}

export function AdminSidebar({ mobile = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const [pendingAgentsCount, setPendingAgentsCount] = useState(0);
  const { permissions, loading: permissionsLoading } = usePermissionsContext();
  const { role } = useRole();
  const isSuperAdmin = permissions?.isSuperAdmin || false;
  
  // Hooks must be called at top level - create helper functions for permission checks
  const checkHasRole = (roleName: string) => {
    if (!permissions || permissionsLoading) return false;
    return role === roleName;
  };
  
  const checkHasPermission = (permissionName: string) => {
    if (!permissions || permissionsLoading) return false;
    if (isSuperAdmin) return true; // Super admin has all permissions
    return permissions.effectivePermissions?.includes(permissionName) || 
           permissions.effectivePermissions?.includes('*');
  };
  
  // Filter menu items based on role and permissions
  const visibleMenuItems = allMenuItems.filter(item => {
    // Show all items while loading for super admin (optimistic rendering)
    // Otherwise wait for permissions to load
    if (permissionsLoading) {
      // If we don't have permissions yet, don't show anything
      return false;
    }
    
    if (!permissions) {
      // Only log once when permissions become null (not on every render)
      return false;
    }
    
    // Super admin sees everything
    if (isSuperAdmin) {
      return true;
    }
    
    // Check role-specific items
    if (item.role) {
      return checkHasRole(item.role);
    }
    
    // Check permission-based items
    if (item.permission) {
      return checkHasPermission(item.permission);
    }
    
    return false;
  });
  
  // Debug: Log detailed information
  useEffect(() => {
    console.log('🔍 [SIDEBAR DEBUG]', {
      permissionsLoading,
      permissions,
      role,
      isSuperAdmin,
      visibleMenuItemsCount: visibleMenuItems.length,
      allMenuItemsCount: allMenuItems.length,
      effectivePermissions: permissions?.effectivePermissions,
    });
  }, [permissions, isSuperAdmin, permissionsLoading, visibleMenuItems.length, role]);

  useEffect(() => {
    let countCache: { value: number; timestamp: number } | null = null;
    const CACHE_DURATION = 60000; // 60 seconds client-side cache
    
    // Fetch pending agents count
    const fetchPendingCount = async () => {
      // Skip if we have fresh cached data (within 60 seconds)
      if (countCache && Date.now() - countCache.timestamp < CACHE_DURATION) {
        setPendingAgentsCount(countCache.value);
        return;
      }
      
      try {
        // Server already sets cache headers
        const response = await fetch('/api/admin/agents/pending-count', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const count = data.count || 0;
          setPendingAgentsCount(count);
          countCache = { value: count, timestamp: Date.now() };
        }
      } catch (error) {
        console.error('Error fetching pending agents count:', error);
      }
    };

    fetchPendingCount();
    // Refresh every 2 minutes (120 seconds) instead of 30 seconds - reduces requests by 75%
    const interval = setInterval(fetchPendingCount, 120000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={cn(
      mobile ? "flex" : "hidden sm:flex",
      mobile ? "relative w-full h-full" : "fixed top-0 left-0 z-40 w-64 h-screen",
      "bg-green-800 border-r border-green-900"
    )}>
      <div className="overflow-y-auto py-5 px-3 h-full w-full">
        <div className="mb-6 px-3">
          <h2 className="text-xl font-bold text-white">Victoria Travels</h2>
          <p className="text-sm text-green-100">Admin Panel</p>
        </div>
        
        <Separator className="my-4 bg-green-900" />
        
        {permissionsLoading ? (
          <div className="px-3 py-4 text-green-100 text-sm">
            Loading menu...
          </div>
        ) : visibleMenuItems.length === 0 ? (
          <div className="px-3 py-4 text-green-100 text-sm">
            <p className="text-yellow-300 mb-2">⚠️ No menu items available</p>
            <p className="text-xs text-green-200">
              Check console for debug info
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
            const showBadge = item.url === '/agents' && pendingAgentsCount > 0;
            
            return (
              <li key={item.url}>
                <Link
                  href={item.url}
                  className={cn(
                    "flex items-center justify-between p-2 text-base font-normal text-white rounded-lg transition duration-75 hover:bg-green-900 group",
                    isActive && "bg-green-900 text-white font-semibold"
                  )}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.title}</span>
                  </div>
                  {showBadge && (
                    <Badge 
                      variant="destructive" 
                      className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600"
                    >
                      {pendingAgentsCount > 99 ? '99+' : pendingAgentsCount}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
          
          {isSuperAdmin && (
            <>
              <Separator className="my-4 bg-green-900" />
              {superAdminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
                
                return (
                  <li key={item.url}>
                    <Link
                      href={item.url}
                      className={cn(
                        "flex items-center p-2 text-base font-normal text-white rounded-lg transition duration-75 hover:bg-green-900 group",
                        isActive && "bg-green-900 text-white font-semibold"
                      )}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </>
          )}
          </ul>
        )}
      </div>
    </aside>
  );
}

