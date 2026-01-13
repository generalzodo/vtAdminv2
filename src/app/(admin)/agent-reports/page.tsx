import { requireAdmin } from '@/lib/auth';
import { AgentReportsClient } from './agent-reports-client';

export default async function AgentReportsPage() {
  await requireAdmin();

  return <AgentReportsClient />;
}

