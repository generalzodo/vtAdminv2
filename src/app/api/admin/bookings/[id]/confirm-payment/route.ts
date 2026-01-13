import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}booking/confirmPayment/${params.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to confirm payment' }));
      return NextResponse.json({ error: error.error || 'Failed to confirm payment' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data, message: data.message || 'Payment confirmed successfully' });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

