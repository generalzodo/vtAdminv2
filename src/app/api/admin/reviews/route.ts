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
    const rating = searchParams.get('rating');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    if (rating) params.append('rating', rating);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await fetch(`${API_BASE_URL}reviews?${params.toString()}`, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch reviews' }, { status: response.status });
    }

    const data = await response.json();
    
    // Get all reviews from backend
    let allReviews = data.data || [];
    if (!Array.isArray(allReviews)) {
      allReviews = [];
    }
    
    // Apply client-side search filter if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      allReviews = allReviews.filter((review: any) => {
        const comment = (review.comment || '').toLowerCase();
        const userName = review.userId 
          ? `${review.userId.firstName || ''} ${review.userId.lastName || ''}`.toLowerCase().trim()
          : '';
        const userEmail = review.userId?.email?.toLowerCase() || '';
        const bookingId = review.bookingId?.bookingId?.toLowerCase() || '';
        
        return comment.includes(searchLower) ||
               userName.includes(searchLower) ||
               userEmail.includes(searchLower) ||
               bookingId.includes(searchLower);
      });
    }
    
    // Handle pagination for filtered results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedReviews = allReviews.slice(startIndex, endIndex);
    
    return NextResponse.json({
      success: true,
      data: paginatedReviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allReviews.length,
        pages: Math.ceil(allReviews.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

