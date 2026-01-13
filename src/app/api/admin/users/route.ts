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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const state = searchParams.get('state');
    const search = searchParams.get('search');

    // Fetch all users to filter out admin/agent users properly
    // The backend doesn't support type filtering, so we need to fetch and filter server-side
    const response = await fetch(`${API_BASE_URL}users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let error;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          error = await response.json();
        } else {
          const text = await response.text();
          error = { error: `HTTP ${response.status}: ${response.statusText}` };
          console.error('Non-JSON error response:', text.substring(0, 200));
        }
      } catch (e) {
        error = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return NextResponse.json({ error: error.error || 'Failed to fetch users' }, { status: response.status });
    }

    const data = await response.json();
    
    // Filter out admin and agent users - only show regular users (server-side filtering)
    let allUsers = data.data || (Array.isArray(data) ? data : []);
    if (!Array.isArray(allUsers)) {
      allUsers = [];
    }
    
    // Filter to only show users (exclude admin and agent) and apply additional filters
    let filteredUsers = allUsers.filter((user: any) => 
      user.type !== 'admin' && user.type !== 'agent'
    );
    
    // Apply status filter
    if (status && status !== 'all') {
      filteredUsers = filteredUsers.filter((user: any) => 
        (user.status || 'active').toLowerCase() === status.toLowerCase()
      );
    }
    
    // Apply type filter
    if (type && type !== 'all') {
      filteredUsers = filteredUsers.filter((user: any) => 
        (user.type || user.userType || 'user').toLowerCase() === type.toLowerCase()
      );
    }
    
    // Apply state filter
    if (state && state !== 'all') {
      filteredUsers = filteredUsers.filter((user: any) => 
        (user.state || '').toLowerCase() === state.toLowerCase()
      );
    }
    
    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredUsers = filteredUsers.filter((user: any) => {
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const phone = (user.phone || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchLower);
      });
    }
    
    // Handle server-side pagination for filtered results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    return NextResponse.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}users/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create user' }));
      return NextResponse.json({ error: error.error || 'Failed to create user' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

