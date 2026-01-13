import { requireAdmin } from '@/lib/auth';
import { AgentsClient } from './agents-client';

export default async function AgentsPage() {
  await requireAdmin();

  return <AgentsClient />;
}

