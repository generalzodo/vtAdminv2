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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // Determine which endpoint to use based on status
    let endpoint = `${API_BASE_URL}users/agents/all`;
    if (status === 'pending') {
      endpoint = `${API_BASE_URL}users/agents/pending`;
    }

    const response = await fetch(endpoint, {
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
      return NextResponse.json({ error: error.error || 'Failed to fetch agents' }, { status: response.status });
    }

    const data = await response.json();
    
    // Handle response structure - backend returns { success: true, data: [...] }
    let allAgents = data.data || [];
    if (!Array.isArray(allAgents)) {
      allAgents = [];
    }

    // For pending agents, return all without pagination
    if (status === 'pending') {
      return NextResponse.json({
        success: true,
        data: allAgents,
        pagination: {
          page: 1,
          limit: allAgents.length,
          total: allAgents.length,
          pages: 1,
        },
      });
    }

    // Filter for active agents if status is 'approved' or 'active'
    let filteredAgents = allAgents;
    if (status === 'approved' || status === 'active') {
      filteredAgents = allAgents.filter((agent: any) => {
        const agentStatus = agent.agentStatus || agent.status;
        return agentStatus === 'approved' || agentStatus === 'active';
      });
    }

    // Handle server-side pagination for filtered results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAgents = filteredAgents.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedAgents,
      pagination: {
        page,
        limit,
        total: filteredAgents.length,
        pages: Math.ceil(filteredAgents.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

