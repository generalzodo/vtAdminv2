import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const search = searchParams.get('search') || '';

    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(search && { search }),
    });

    const response = await fetch(`${API_BASE_URL}/admin/roles?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: true, message: errorData.message || 'Failed to fetch roles' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to fetch roles' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/admin/roles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: true, message: errorData.message || 'Failed to create role' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to create role' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to create role' },
      { status: 500 }
    );
  }
}

