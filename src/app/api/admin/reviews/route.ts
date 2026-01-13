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

    const response = await fetch(`${API_BASE_URL}reviews?${new URLSearchParams({ page, limit }).toString()}`, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch reviews' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data.data || [],
      pagination: data.pagination || {
        page: parseInt(page),
        limit: parseInt(limit),
        total: data.data?.length || 0,
        pages: Math.ceil((data.data?.length || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

