import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: true, message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}admin/standby-pools/bulk-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: true, message: data.message || 'Failed to bulk upload standby pool' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message || 'Failed to bulk upload standby pool' }, { status: 500 });
  }
}