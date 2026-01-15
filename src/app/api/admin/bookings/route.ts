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

    // Ensure API_BASE_URL doesn't have double slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const url = `${baseUrl}/booking${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Fetching bookings from:', url);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
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
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Re-throw fetch errors to be caught by outer catch block
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: Backend server did not respond within 30 seconds');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Internal server error';
    let errorDetails = '';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Network error';
      errorDetails = 'Failed to connect to backend server. Please check if the backend is running and API_BASE_URL is correct.';
    } else if (error.name === 'AbortError') {
      errorMessage = 'Request timeout';
      errorDetails = 'The request took too long to complete. The backend server may be slow or unresponsive.';
    } else if (error.message) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}

