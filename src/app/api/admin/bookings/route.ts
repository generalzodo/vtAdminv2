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

    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (status) params.append('status', status);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    if (userType) params.append('userType', userType);
    if (search) params.append('search', search);
    // Backend now supports pagination
    params.append('page', page);
    params.append('limit', limit);

    const url = `${API_BASE_URL}booking${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Fetching bookings from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let error;
      let errorDetails = '';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          error = await response.json();
        } else {
          const text = await response.text();
          error = { error: `HTTP ${response.status}: ${response.statusText}` };
          errorDetails = text.substring(0, 200);
          console.error('Non-JSON error response:', errorDetails);
        }
      } catch (e) {
        error = { error: `HTTP ${response.status}: ${response.statusText}` };
        if (response.status === 502) {
          errorDetails = 'Bad Gateway - The backend server may be down or unreachable. Please check the API_BASE_URL configuration.';
        }
      }
      console.error('Error fetching bookings:', {
        status: response.status,
        statusText: response.statusText,
        url,
        error: error.error,
        details: errorDetails
      });
      return NextResponse.json({ 
        error: error.error || 'Failed to fetch bookings',
        details: errorDetails || (response.status === 502 ? 'Backend server may be down or unreachable' : '')
      }, { status: response.status });
    }

    // Check content-type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from bookings API:', text.substring(0, 500));
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
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

