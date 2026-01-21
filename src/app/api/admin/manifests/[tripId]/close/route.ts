import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> | { tripId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tripId } = await Promise.resolve(params);
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    
    const response = await fetch(`${baseUrl}/admin/manifests/${tripId}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to close manifest' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error closing manifest:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close manifest' },
      { status: 500 }
    );
  }
}
