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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const userType = searchParams.get('userType');
    const search = searchParams.get('search');

    // Backend now supports pagination and filters
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (status) params.append('status', status);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    if (userType) params.append('userType', userType);
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE_URL}booking/altered?${params.toString()}`, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch altered bookings' }, { status: response.status });
    }

    // Check content-type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from altered bookings API:', text.substring(0, 500));
      return NextResponse.json({ 
        error: 'Backend returned non-JSON response. This may indicate a server error.',
        details: response.status === 502 ? 'Bad Gateway - Backend server may be down' : `HTTP ${response.status}`
      }, { status: response.status || 500 });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse backend response',
        details: 'Backend returned invalid JSON'
      }, { status: 500 });
    }
    
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
    console.error('Error fetching altered bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

