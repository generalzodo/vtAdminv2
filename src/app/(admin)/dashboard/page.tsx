import { requireAdmin } from '@/lib/auth';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  await requireAdmin();

  return <DashboardClient />;
}

