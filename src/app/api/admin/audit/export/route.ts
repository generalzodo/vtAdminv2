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
    const params = new URLSearchParams();
    
    // Forward all query parameters
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    
    const response = await fetch(`${baseUrl}/admin/audit/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Failed to export audit logs');
      return new NextResponse(error, { status: response.status });
    }

    // Return the file as-is (CSV or JSON)
    const contentType = response.headers.get('content-type') || 'text/csv';
    const blob = await response.blob();
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': response.headers.get('content-disposition') || `attachment; filename=audit-logs-${Date.now()}.csv`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
