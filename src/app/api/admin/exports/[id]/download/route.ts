import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const token = await getAuthToken();
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const jobId = resolvedParams.id;

    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      console.error('Download route received invalid jobId:', jobId);
      return NextResponse.json({ error: `Invalid export id: ${jobId}` }, { status: 400 });
    }

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    const upstream = await fetch(`${baseUrl}/admin/exports/${jobId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => 'Failed to download export');
      return new NextResponse(text, { status: upstream.status });
    }

    const blob = await upstream.blob();
    const contentType = upstream.headers.get('content-type') || 'text/csv';
    const contentDisposition =
      upstream.headers.get('content-disposition') || `attachment; filename="export-${jobId}.csv"`;

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition
      }
    });
  } catch (error: any) {
    console.error('Error downloading export job:', error);
    return NextResponse.json({ error: error.message || 'Failed to download export' }, { status: 500 });
  }
}

