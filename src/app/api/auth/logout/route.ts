import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('vts-token');
  cookieStore.delete('vts-user');
  
  return NextResponse.json({ success: true });
}

