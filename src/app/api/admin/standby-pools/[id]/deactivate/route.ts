import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: true, message: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    const response = await fetch(`${API_BASE_URL}admin/standby-pools/${id}/deactivate`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: true, message: data.message || 'Failed to deactivate standby pool entry' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message || 'Failed to deactivate standby pool entry' }, { status: 500 });
  }
}
