import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Backend now supports pagination
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (status) params.append('status', status);
    if (type) params.append('type', type);

    const response = await fetch(`${API_BASE_URL}buses?${params.toString()}`, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch buses' }, { status: response.status });
    }

    const data = await response.json();
    
    // Backend now handles pagination, so return the response directly
    return NextResponse.json({
      success: data.success || true,
      data: data.data || [],
      pagination: data.pagination || {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching buses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}buses/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create bus' }));
      return NextResponse.json({ error: error.error || 'Failed to create bus' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating bus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

