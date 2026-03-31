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
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const response = await fetch(`${baseUrl}/admin/reports/payments-summary/export?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to export financials summary' }));
      return NextResponse.json(error, { status: response.status });
    }

    const fileBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get('content-type') ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const contentDisposition =
      response.headers.get('content-disposition') ||
      `attachment; filename="financials-summary-${new Date().toISOString().slice(0, 10)}.xlsx"`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error: any) {
    console.error('Error exporting financials summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export financials summary' },
      { status: 500 }
    );
  }
}
