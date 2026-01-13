import { requireAdmin } from '@/lib/auth';
import { DriversClient } from './drivers-client';

export default async function DriversPage() {
  await requireAdmin();

  return <DriversClient />;
}

