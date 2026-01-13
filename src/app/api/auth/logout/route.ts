import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  cookies().delete('vts-token');
  cookies().delete('vts-user');
  
  return NextResponse.json({ success: true });
}

