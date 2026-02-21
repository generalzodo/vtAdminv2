import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { busTypeId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}bus-types/${params.busTypeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Bus type not found' }));
      return NextResponse.json(
        { error: error.error || 'Bus type not found' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching bus type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { busTypeId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Handle both JSON and FormData (for file uploads)
    let body: any;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Pass through FormData for file uploads
      body = await request.formData();
    } else {
      // Handle JSON data
      body = await request.json();
    }

    const response = await fetch(`${API_BASE_URL}bus-types/${params.busTypeId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Let the browser/fetch API set content-type with boundary for FormData
        ...(!(body instanceof FormData) && { 'Content-Type': 'application/json' }),
      },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update bus type' }));
      return NextResponse.json(
        { error: error.error || 'Failed to update bus type' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating bus type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { busTypeId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}bus-types/${params.busTypeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete bus type' }));
      return NextResponse.json(
        { error: error.error || 'Failed to delete bus type' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Bus type deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
