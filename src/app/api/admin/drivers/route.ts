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
    const state = searchParams.get('state');
    const search = searchParams.get('search');

    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    if (state) params.append('state', state);

    const response = await fetch(`${API_BASE_URL}drivers?${params.toString()}`, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch drivers' }, { status: response.status });
    }

    const data = await response.json();
    
    // Get all drivers from backend
    let allDrivers = data.data || [];
    if (!Array.isArray(allDrivers)) {
      allDrivers = [];
    }
    
    // Apply client-side search filter if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      allDrivers = allDrivers.filter((driver: any) => {
        const firstName = (driver.firstName || '').toLowerCase();
        const lastName = (driver.lastName || '').toLowerCase();
        const phone = (driver.phone || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               fullName.includes(searchLower) ||
               phone.includes(searchLower);
      });
    }
    
    // Handle pagination for filtered results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedDrivers = allDrivers.slice(startIndex, endIndex);
    
    return NextResponse.json({
      success: true,
      data: paginatedDrivers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allDrivers.length,
        pages: Math.ceil(allDrivers.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
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

    const response = await fetch(`${API_BASE_URL}drivers/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create driver' }));
      return NextResponse.json({ error: error.error || 'Failed to create driver' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

