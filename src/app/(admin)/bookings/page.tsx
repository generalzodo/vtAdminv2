import { requireAdmin } from '@/lib/auth';
import { BookingsClient } from './bookings-client';

export default async function BookingsPage() {
  await requireAdmin();

  return <BookingsClient />;
}

