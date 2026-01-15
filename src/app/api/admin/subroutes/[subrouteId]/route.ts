import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ subrouteId: string }> | { subrouteId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const subrouteId = resolvedParams.subrouteId;

    if (!subrouteId) {
      return NextResponse.json({ error: 'Subroute ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}subroutes/${subrouteId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update subroute' }));
      return NextResponse.json({ error: error.error || 'Failed to update subroute' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating subroute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subrouteId: string }> | { subrouteId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const subrouteId = resolvedParams.subrouteId;

    if (!subrouteId) {
      return NextResponse.json({ error: 'Subroute ID is required' }, { status: 400 });
    }

    const response = await fetch(`${API_BASE_URL}subroutes/${subrouteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete subroute' }));
      return NextResponse.json({ error: error.error || 'Failed to delete subroute' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subroute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

