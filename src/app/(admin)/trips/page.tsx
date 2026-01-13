import { requireAdmin } from '@/lib/auth';
import { TripsClient } from './trips-client';

export default async function TripsPage() {
  await requireAdmin();

  return <TripsClient />;
}

