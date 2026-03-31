import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> | { tripId: string } }
) {
  try {
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tripId } = await Promise.resolve(params);
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const disposition = (searchParams.get('disposition') || '').toLowerCase();
    const printer = (searchParams.get('printer') || '').toLowerCase();
    const print = (searchParams.get('print') || '').toLowerCase();

    const manifestParams = new URLSearchParams();
    manifestParams.set('format', format);
    if (disposition) manifestParams.set('disposition', disposition);
    if (printer) manifestParams.set('printer', printer);
    if (print) manifestParams.set('print', print);

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const response = await fetch(`${baseUrl}/admin/manifests/${tripId}/download?${manifestParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to download manifest');
      return NextResponse.json({ error: errorText || 'Failed to download manifest' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || (format === 'html' ? 'text/html; charset=utf-8' : 'text/csv; charset=utf-8');
    const contentDisposition = response.headers.get('content-disposition')
      || `attachment; filename="manifest_${tripId}.${format === 'html' ? 'html' : 'csv'}"`;

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error: any) {
    console.error('Error downloading manifest:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download manifest' },
      { status: 500 }
    );
  }
}
