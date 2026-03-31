import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${API_BASE_URL}booking/cancel/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to cancel booking' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: data.message || 'Booking cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
