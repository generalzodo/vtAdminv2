import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const token = await getAuthToken();
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const jobId = resolvedParams.id;

    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      return NextResponse.json({ error: `Invalid export id: ${jobId}` }, { status: 400 });
    }

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const upstream = await fetch(`${baseUrl}/admin/exports/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' }
    });
  } catch (error: any) {
    console.error('Error getting export job:', error);
    return NextResponse.json({ error: error.message || 'Failed to get export job' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const token = await getAuthToken();
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const jobId = resolvedParams.id;

    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      return NextResponse.json({ error: `Invalid export id: ${jobId}` }, { status: 400 });
    }

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const upstream = await fetch(`${baseUrl}/admin/exports/${jobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' }
    });
  } catch (error: any) {
    console.error('Error deleting export job:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete export job' }, { status: 500 });
  }
}

