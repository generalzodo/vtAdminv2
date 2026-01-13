import { requireAdmin } from '@/lib/auth';
import { WithdrawalsClient } from './withdrawals-client';

export default async function WithdrawalsPage() {
  await requireAdmin();

  return <WithdrawalsClient />;
}

