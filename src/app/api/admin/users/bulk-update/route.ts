import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function PATCH(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Status must be provided' }, { status: 400 });
    }

    // Update each user
    const updatePromises = ids.map(async (id: string) => {
      const response = await fetch(`${API_BASE_URL}users/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update user' }));
        throw new Error(error.error || `Failed to update user ${id}`);
      }

      return response.json();
    });

    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0) {
      return NextResponse.json({
        success: true,
        message: `Updated ${successful} user(s), ${failed} failed`,
        successful,
        failed,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${successful} user(s)`,
      successful,
      failed: 0,
    });
  } catch (error: any) {
    console.error('Error in bulk update:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

