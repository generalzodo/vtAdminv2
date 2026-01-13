import { requireAdmin } from '@/lib/auth';
import { ReviewsClient } from './reviews-client';

export default async function ReviewsPage() {
  await requireAdmin();

  return <ReviewsClient />;
}

