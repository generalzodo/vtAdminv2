import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // First, get the booking to check payment status
    const bookingResponse = await fetch(`${API_BASE_URL}booking/${params.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!bookingResponse.ok) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = await bookingResponse.json();
    
    // Check payment with Paystack/Flutterwave
    // This is a read-only check, doesn't update the database
    // The actual verification logic is in the backend
    
    // For now, return the booking with payment info
    // The actual verification should be done via the confirmPayment endpoint
    return NextResponse.json({ 
      success: true, 
      data: booking,
      message: 'Use confirm payment to update payment status'
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

