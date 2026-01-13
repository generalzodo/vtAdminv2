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

    const { id } = params;
    const body = await request.json(); // { status: 'approved' | 'rejected' }

    const response = await fetch(`${API_BASE_URL}withdrawals/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

