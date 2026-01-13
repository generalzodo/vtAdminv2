import { requireAdmin } from '@/lib/auth';
import { BusesClient } from './buses-client';

export default async function BusesPage() {
  await requireAdmin();

  return <BusesClient />;
}

