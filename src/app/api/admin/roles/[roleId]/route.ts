import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/admin/roles/${params.roleId}`, {
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
          { error: true, message: errorData.message || 'Failed to fetch role' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to fetch role' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { roleId: string } }
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

    const response = await fetch(`${API_BASE_URL}/admin/roles/${params.roleId}`, {
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
          { error: true, message: errorData.message || 'Failed to update role' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to update role' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/admin/roles/${params.roleId}`, {
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
          { error: true, message: errorData.message || 'Failed to delete role' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to delete role' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to delete role' },
      { status: 500 }
    );
  }
}

