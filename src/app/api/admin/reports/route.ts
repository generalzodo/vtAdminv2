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
    const reportType = searchParams.get('type') || 'financial';
    
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'type') {
        params.append(key, value);
      }
    });

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    let endpoint = '';
    
    switch (reportType) {
      case 'financial':
        endpoint = 'financial';
        break;
      case 'agent':
        endpoint = 'agent';
        break;
      case 'passenger':
        endpoint = 'passenger';
        break;
      case 'bus-performance':
        endpoint = 'bus-performance';
        break;
      default:
        endpoint = 'financial';
    }
    
    const response = await fetch(`${baseUrl}/admin/reports/${endpoint}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch report' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
