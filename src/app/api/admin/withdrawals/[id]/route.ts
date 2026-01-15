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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ error: 'Withdrawal ID is required' }, { status: 400 });
    }

    const body = await request.json(); // { status: 'approved' | 'rejected' }

    // Legacy v1 behavior:
    // - Approve:  GET users/approveTransaction/:id
    // - Reject:   GET users/rejectTransaction/:id
    let backendUrl: string | null = null;
    if (body.status === 'approved') {
      backendUrl = `${API_BASE_URL}users/approveTransaction/${id}`;
    } else if (body.status === 'rejected') {
      backendUrl = `${API_BASE_URL}users/rejectTransaction/${id}`;
    } else {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected".' },
        { status: 400 }
      );
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let error;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          error = await response.json();
        } else {
          const text = await response.text();
          error = { error: `HTTP ${response.status}: ${response.statusText}` };
          console.error('Non-JSON error response:', text.substring(0, 200));
        }
      } catch (e) {
        error = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return NextResponse.json({ error: error.error || 'Failed to update withdrawal status' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data.data || data,
      message: data.message || 'Withdrawal status updated successfully',
    });
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

