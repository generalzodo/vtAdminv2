import { requireAdmin } from '@/lib/auth';
import { SubRoutesClient } from './subroutes-client';

export default async function SubRoutesPage() {
  await requireAdmin();

  return <SubRoutesClient />;
}

