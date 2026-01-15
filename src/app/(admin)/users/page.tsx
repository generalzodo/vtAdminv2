import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/admin/data-table';
import { UsersClient } from './users-client';

export default async function UsersPage() {
  return <UsersClient />;
}

