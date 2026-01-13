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
    // Fix URL construction to handle trailing slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const url = `${baseUrl}/booking/dashboard/stats${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Fetching dashboard stats from:', url);
    
    // Add timeout to prevent Vercel 504 errors (Vercel has 10s timeout on Hobby, 60s on Pro)
    // Set timeout to 60 seconds (1 minute) to allow for large dataset processing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        // Add cache and revalidate options
        cache: 'no-store',
        next: { revalidate: 0 },
      });
      
      clearTimeout(timeoutId);

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
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout/abort errors
      if (fetchError.name === 'AbortError' || controller.signal.aborted) {
        console.error('Dashboard API request timed out after 60 seconds');
        return NextResponse.json({ 
          error: 'Request timeout: The dashboard data is taking too long to load. Please try again or contact support if this persists.'
        }, { status: 504 });
      }
      
      // Re-throw to be handled by outer catch
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    
    // Check if it's a timeout error
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Request timeout: The dashboard data is taking too long to load. Please try again.'
      }, { status: 504 });
    }
    
    // Check if it's a network error
    if (error.message?.includes('fetch') || error.code === 'ECONNREFUSED') {
      return NextResponse.json({ 
        error: 'Network error: Unable to connect to the server. Please check your connection.'
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
