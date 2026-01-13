import { requireAdmin } from '@/lib/auth';
import { RoutesClient } from './routes-client';

export default async function RoutesPage() {
  await requireAdmin();

  return <RoutesClient />;
}

