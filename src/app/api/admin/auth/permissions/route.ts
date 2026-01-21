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
    // Construct URL properly - remove trailing slash from base, add /users/me
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const apiUrl = `${baseUrl}/users/me`;
    console.log('🔍 [PERMISSIONS API] API_BASE_URL:', API_BASE_URL);
    console.log('🔍 [PERMISSIONS API] Fetching user from:', apiUrl);
    console.log('🔍 [PERMISSIONS API] Token present:', !!token);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let userResponse;
    try {
      userResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Check if it's a network/connection error
      if (fetchError.name === 'AbortError') {
        console.error('❌ [PERMISSIONS API] Request timeout - backend not responding');
        return NextResponse.json(
          { 
            error: true, 
            message: 'Backend server is not responding. Please ensure the backend server is running.',
            details: `Timeout connecting to ${apiUrl}`
          },
          { status: 503 }
        );
      }
      
      // Network error (ECONNREFUSED, ENOTFOUND, etc.)
      if (fetchError.message?.includes('fetch failed') || fetchError.code === 'ECONNREFUSED' || fetchError.code === 'ENOTFOUND') {
        console.error('❌ [PERMISSIONS API] Network error - cannot connect to backend:', fetchError.message);
        return NextResponse.json(
          { 
            error: true, 
            message: 'Cannot connect to backend server. Please ensure the backend server is running.',
            details: `Failed to connect to ${apiUrl}. Error: ${fetchError.message}`
          },
          { status: 503 }
        );
      }
      
      // Re-throw other errors
      throw fetchError;
    }

    if (!userResponse.ok) {
      console.error('❌ [PERMISSIONS API] Failed to fetch user:', userResponse.status, userResponse.statusText);
      return NextResponse.json(
        { error: true, message: 'Failed to fetch user information' },
        { status: 401 }
      );
    }

    const userData = await userResponse.json();
    const user = userData.user || userData.data;

    console.log('👤 [PERMISSIONS API] User data:', {
      id: user?._id || user?.id,
      email: user?.email,
      type: user?.type,
      role: user?.role,
    });

    // Check if user is admin
    if (user.type !== 'admin') {
      console.warn('⚠️ [PERMISSIONS API] User is not admin:', user.type);
      return NextResponse.json(
        { error: true, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Debug logging
    console.log('🔍 [PERMISSIONS API] User role data:', {
      role: user.role,
      roleName: user.role?.name,
      roleId: user.role?._id,
      roleType: typeof user.role,
      roleString: JSON.stringify(user.role),
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
        console.warn('⚠️ [PERMISSIONS API] Role is a string ID, not populated:', user.role);
        roleName = null;
      }
    }

    const isSuperAdmin = roleName === 'super_admin';
    console.log('✅ [PERMISSIONS API] Role check:', {
      roleName,
      isSuperAdmin,
      checkResult: roleName === 'super_admin',
    });
    const effectivePermissions = isSuperAdmin 
      ? ['*'] 
      : [...(user.role?.permissions || []), ...(user.permissions || [])];

    const responseData = {
      success: true,
      data: {
        isSuperAdmin,
        role: roleName,
        effectivePermissions: [...new Set(effectivePermissions)]
      }
    };

    console.log('📤 [PERMISSIONS API] Response data:', responseData);

    const response = NextResponse.json(responseData);

    // Add cache headers to reduce redundant API calls
    // Cache for 5 minutes - permissions don't change frequently
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    
    return response;
  } catch (error: any) {
    console.error('❌ [PERMISSIONS API] Exception:', error);
    console.error('❌ [PERMISSIONS API] Error type:', error?.constructor?.name);
    console.error('❌ [PERMISSIONS API] Error message:', error?.message);
    console.error('❌ [PERMISSIONS API] Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: true, 
        message: error?.message || 'Failed to fetch permissions',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

