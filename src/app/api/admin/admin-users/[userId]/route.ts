import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/admin/admin-users/${params.userId}`, {
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
          { error: true, message: errorData.message || 'Failed to fetch admin user' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to fetch admin user' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching admin user:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch admin user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/admin/admin-users/${params.userId}`, {
      method: 'PATCH',
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
          { error: true, message: errorData.message || 'Failed to update admin user' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to update admin user' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to update admin user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/admin/admin-users/${params.userId}`, {
      method: 'DELETE',
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
          { error: true, message: errorData.message || 'Failed to delete admin user' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to delete admin user' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to delete admin user' },
      { status: 500 }
    );
  }
}

