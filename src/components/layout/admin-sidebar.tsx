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

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Users', url: '/users', icon: Users },
  { title: 'Agents', url: '/agents', icon: UserCheck },
  { title: 'Bookings', url: '/bookings', icon: Calendar },
  { title: 'Routes', url: '/routes', icon: Route },
  { title: 'Trips', url: '/trips', icon: Calendar },
  { title: 'Withdrawals', url: '/withdrawals', icon: Wallet },
  { title: 'Reviews', url: '/reviews', icon: Star },
  { title: 'Buses', url: '/buses', icon: Bus },
  { title: 'Transport Officers', url: '/drivers', icon: UserCog },
  // { title: 'Sub Routes', url: '/subroutes', icon: Route },
  { title: 'Settings', url: '/settings', icon: Settings },
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
  const isSuperAdmin = permissions?.isSuperAdmin || false;
  
  // Debug: Log super admin status
  useEffect(() => {
    if (!permissionsLoading) {
      console.log('Sidebar - Permissions:', permissions);
      console.log('Sidebar - isSuperAdmin:', isSuperAdmin);
    }
  }, [permissions, isSuperAdmin, permissionsLoading]);

  useEffect(() => {
    // Fetch pending agents count
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/admin/agents/pending-count');
        if (response.ok) {
          const data = await response.json();
          setPendingAgentsCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching pending agents count:', error);
      }
    };

    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

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
        
        <ul className="space-y-2">
          {menuItems.map((item) => {
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
      </div>
    </aside>
  );
}

