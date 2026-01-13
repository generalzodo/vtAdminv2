import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // First get the booking to get the bookingId
    const bookingResponse = await fetch(`${API_BASE_URL}booking/${params.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!bookingResponse.ok) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const bookingData = await bookingResponse.json();
    // Handle different response formats
    const booking = bookingData.data || bookingData;
    const bookingId = booking.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID not found' }, { status: 400 });
    }

    // Download ticket using bookingId (backend expects bookingId, not _id)
    const ticketResponse = await fetch(`${API_BASE_URL}booking/download/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!ticketResponse.ok) {
      const error = await ticketResponse.json().catch(() => ({ error: 'Failed to download ticket' }));
      return NextResponse.json({ error: error.error || error.message || 'Failed to download ticket' }, { status: ticketResponse.status });
    }

    // Check if response is PDF
    const contentType = ticketResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      // Get the PDF buffer
      const buffer = await ticketResponse.arrayBuffer();
      
      // Return as downloadable file
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ticket-${bookingId}.pdf"`,
        },
      });
    } else {
      // If not PDF, might be JSON error
      const error = await ticketResponse.json().catch(() => ({ error: 'Failed to download ticket' }));
      return NextResponse.json({ error: error.error || error.message || 'Failed to download ticket' }, { status: ticketResponse.status });
    }
  } catch (error: any) {
    console.error('Error downloading ticket:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

