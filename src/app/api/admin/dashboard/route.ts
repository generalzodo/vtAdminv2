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
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build query params for the dashboard stats API
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    // Call the dedicated dashboard stats endpoint
    const url = `${API_BASE_URL}booking/dashboard/stats${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Fetching dashboard stats from:', url);
    
    const response = await fetch(url, {
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
      console.error('Error fetching dashboard stats:', {
        status: response.status,
        statusText: response.statusText,
        url,
        error: error.error
      });
      return NextResponse.json({ 
        error: error.error || 'Failed to fetch dashboard stats'
      }, { status: response.status });
    }

    // Check content-type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from dashboard API:', text.substring(0, 500));
      return NextResponse.json({ 
        error: 'Backend returned non-JSON response'
      }, { status: 500 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: data.success || true,
      data: data.data || {},
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
