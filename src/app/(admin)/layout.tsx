import { requireAdmin } from '@/lib/auth';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { PermissionsProvider } from '@/contexts/permissions-context';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <PermissionsProvider>
      <div className="flex min-h-screen overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 sm:ml-64 overflow-x-hidden">
          <AdminHeader user={user} />
          <main className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </PermissionsProvider>
  );
}

