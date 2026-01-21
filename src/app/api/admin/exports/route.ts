import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken();
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const url = new URL(request.url);

    const upstream = await fetch(`${baseUrl}/admin/exports?${url.searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' }
    });
  } catch (error: any) {
    console.error('Error listing exports:', error);
    return NextResponse.json({ error: error.message || 'Failed to list exports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken();
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    const upstream = await fetch(`${baseUrl}/admin/exports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' }
    });
  } catch (error: any) {
    console.error('Error creating export job:', error);
    return NextResponse.json({ error: error.message || 'Failed to create export job' }, { status: 500 });
  }
}

