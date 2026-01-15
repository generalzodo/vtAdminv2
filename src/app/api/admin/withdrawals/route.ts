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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    // The legacy backend exposes withdrawals via `users/withdrawals` (no pagination or filters).
    // We still build params for potential future support, but the current endpoint ignores them.
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    params.append('page', page);
    params.append('limit', limit);

    const response = await fetch(`${API_BASE_URL}users/withdrawals`, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch withdrawals' }, { status: response.status });
    }

    const data = await response.json();
    
    // Get all withdrawals from backend
    let allWithdrawals = data.data || [];
    if (!Array.isArray(allWithdrawals)) {
      allWithdrawals = [];
    }
    
    // Apply client-side search filter if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      allWithdrawals = allWithdrawals.filter((withdrawal: any) => {
        const userName = withdrawal.userId 
          ? `${withdrawal.userId.firstName || ''} ${withdrawal.userId.lastName || ''}`.toLowerCase().trim()
          : '';
        const userPhone = withdrawal.userId?.phone?.toLowerCase() || '';
        const accountNumber = (withdrawal.accountNumber || '').toLowerCase();
        const bankName = (withdrawal.bankName || '').toLowerCase();
        
        return userName.includes(searchLower) ||
               userPhone.includes(searchLower) ||
               accountNumber.includes(searchLower) ||
               bankName.includes(searchLower);
      });
    }
    
    // Handle pagination for filtered results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedWithdrawals = allWithdrawals.slice(startIndex, endIndex);
    
    return NextResponse.json({
      success: true,
      data: paginatedWithdrawals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allWithdrawals.length,
        pages: Math.ceil(allWithdrawals.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

