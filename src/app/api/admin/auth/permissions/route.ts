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

    // Get current user info from backend
    const userResponse = await fetch(`${API_BASE_URL}users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: true, message: 'Failed to fetch user information' },
        { status: 401 }
      );
    }

    const userData = await userResponse.json();
    const user = userData.user || userData.data;

    // Check if user is admin
    if (user.type !== 'admin') {
      return NextResponse.json(
        { error: true, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Debug logging
    console.log('User role data:', {
      role: user.role,
      roleName: user.role?.name,
      roleId: user.role?._id,
      roleType: typeof user.role
    });

    // Get role and permissions
    // Handle both populated role object and role ID
    let roleName = null;
    if (user.role) {
      if (typeof user.role === 'object' && user.role.name) {
        roleName = user.role.name;
      } else if (typeof user.role === 'string') {
        // Role is just an ID, we'd need to fetch it, but for now check if it exists
        // This shouldn't happen if populate is working, but handle it
        roleName = null;
      }
    }

    const isSuperAdmin = roleName === 'super_admin';
    const effectivePermissions = isSuperAdmin 
      ? ['*'] 
      : [...(user.role?.permissions || []), ...(user.permissions || [])];

    const response = NextResponse.json({
      success: true,
      data: {
        isSuperAdmin,
        effectivePermissions: [...new Set(effectivePermissions)]
      }
    });

    // Add cache headers to reduce redundant API calls
    // Cache for 5 minutes - permissions don't change frequently
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    
    return response;
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

