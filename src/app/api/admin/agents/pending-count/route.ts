import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}users/agents/pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ count: 0 });
    }

    const data = await response.json();
    const pendingAgents = data.data || [];
    const count = Array.isArray(pendingAgents) ? pendingAgents.length : 0;

    const responseJson = NextResponse.json({ count });
    
    // Add cache headers to reduce redundant API calls
    // Cache for 1 minute - pending count doesn't change that frequently
    responseJson.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
    
    return responseJson;
  } catch (error) {
    console.error('Error fetching pending agents count:', error);
    return NextResponse.json({ count: 0 });
  }
}

