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
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const search = searchParams.get('search');

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // If there's a search term, we need all routes for client-side filtering
    // Otherwise, use backend pagination for better performance
    if (search && search.trim()) {
      // Fetch all routes for client-side search - make multiple requests if needed
      let allRoutes: any[] = [];
      let currentPage = 1;
      const fetchLimit = 1000; // Fetch in batches
      let hasMore = true;
      
      while (hasMore) {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', fetchLimit.toString());
        if (origin && origin !== 'all') params.append('origin', origin);
        if (destination && destination !== 'all') params.append('destination', destination);

        const response = await fetch(`${API_BASE_URL}routes?${params.toString()}`, {
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
          return NextResponse.json({ error: error.error || 'Failed to fetch routes' }, { status: response.status });
        }

        const data = await response.json();
        const routes = data.data || [];
        
        if (routes.length === 0) {
          hasMore = false;
        } else {
          allRoutes = [...allRoutes, ...routes];
          // Check if we got all routes
          if (routes.length < fetchLimit || (data.pagination && currentPage >= data.pagination.pages)) {
            hasMore = false;
          } else {
            currentPage++;
          }
        }
      }
      
      // Apply client-side search filter
      const searchLower = search.toLowerCase().trim();
      allRoutes = allRoutes.filter((route: any) => {
        const title = (route.title || '').toLowerCase();
        const routeOrigin = (route.origin || '').toLowerCase();
        const routeDestination = (route.destination || '').toLowerCase();
        const fullRoute = `${routeOrigin} - ${routeDestination}`.toLowerCase();
        
        return title.includes(searchLower) ||
               routeOrigin.includes(searchLower) ||
               routeDestination.includes(searchLower) ||
               fullRoute.includes(searchLower);
      });
      
      // Handle pagination for filtered results
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedRoutes = allRoutes.slice(startIndex, endIndex);
      
      return NextResponse.json({
        success: true,
        data: paginatedRoutes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: allRoutes.length,
          pages: Math.ceil(allRoutes.length / limitNum) || 1,
        },
      });
    } else {
      // No search - use backend pagination for better performance
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (origin && origin !== 'all') params.append('origin', origin);
      if (destination && destination !== 'all') params.append('destination', destination);

      const response = await fetch(`${API_BASE_URL}routes?${params.toString()}`, {
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
        return NextResponse.json({ error: error.error || 'Failed to fetch routes' }, { status: response.status });
      }

      const data = await response.json();
      
      // Backend handles pagination, return it directly
      return NextResponse.json({
        success: data.success || true,
        data: data.data || [],
        pagination: data.pagination || {
          page: pageNum,
          limit: limitNum,
          total: 0,
          pages: 0,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching routes:', error);
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

    const response = await fetch(`${API_BASE_URL}routes/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create route' }));
      return NextResponse.json({ error: error.error || 'Failed to create route' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

