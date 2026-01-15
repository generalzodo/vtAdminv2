import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.userId;

    if (!userId) {
      return NextResponse.json(
        { error: true, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/admin/admin-users/${userId}/password`, {
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
          { error: true, message: errorData.message || 'Failed to change password' },
          { status: response.status }
        );
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: true, message: 'Failed to change password' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}

