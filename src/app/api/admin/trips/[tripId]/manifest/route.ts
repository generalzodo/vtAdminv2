import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> | { tripId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const tripId = resolvedParams.tripId;

    if (!tripId) {
      return NextResponse.json(
        { error: true, message: 'Trip ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}trips/manifest/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: true, message: 'Failed to fetch trip manifest' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching trip manifest:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch trip manifest' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> | { tripId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const tripId = resolvedParams.tripId;

    if (!tripId) {
      return NextResponse.json(
        { error: true, message: 'Trip ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}trips/manifest/${tripId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: true, message: 'Failed to update trip manifest' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating trip manifest:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to update trip manifest' },
      { status: 500 }
    );
  }
}

