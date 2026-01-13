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
    const search = searchParams.get('search');

    // Backend now supports pagination
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);

    const response = await fetch(`${API_BASE_URL}subroutes?${params.toString()}`, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch subroutes' }, { status: response.status });
    }

    const data = await response.json();
    
    // Get all subroutes from backend
    let allSubroutes = data.data || [];
    if (!Array.isArray(allSubroutes)) {
      allSubroutes = [];
    }
    
    // Apply client-side search filter if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      allSubroutes = allSubroutes.filter((subroute: any) => {
        const stop = (subroute.stop || '').toLowerCase();
        
        return stop.includes(searchLower);
      });
    }
    
    // Handle pagination for filtered results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedSubroutes = allSubroutes.slice(startIndex, endIndex);
    
    return NextResponse.json({
      success: true,
      data: paginatedSubroutes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allSubroutes.length,
        pages: Math.ceil(allSubroutes.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching subroutes:', error);
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

    const response = await fetch(`${API_BASE_URL}subroutes/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create subroute' }));
      return NextResponse.json({ error: error.error || 'Failed to create subroute' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating subroute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

