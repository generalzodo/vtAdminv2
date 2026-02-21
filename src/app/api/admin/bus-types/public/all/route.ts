import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';

    const response = await fetch(`${API_BASE_URL}bus-types/public/all?status=${status}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch bus types' }));
      return NextResponse.json(
        { error: error.error || 'Failed to fetch bus types' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data.data || [],
    });
  } catch (error) {
    console.error('Error fetching public bus types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
