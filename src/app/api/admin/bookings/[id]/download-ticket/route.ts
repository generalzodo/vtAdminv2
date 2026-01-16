import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Check if id is a MongoDB ObjectId (24 hex characters) or a bookingId (starts with 'T')
    // MongoDB ObjectIds are 24 hex characters, bookingIds start with 'T' followed by numbers
    const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const isBookingId = id.startsWith('T');
    
    let bookingId: string;
    
    if (isBookingId) {
      // If it's already a bookingId, use it directly
      bookingId = id;
    } else if (isMongoObjectId) {
      // If it's a MongoDB ObjectId (_id), we need to fetch the booking first
      // Since the backend /booking/:id endpoint searches by bookingId, not _id,
      // we need to fetch from the bookings list and find the one with matching _id
      // OR we can try to use the admin API endpoint that might handle _id
      const bookingsResponse = await fetch(`${API_BASE_URL}booking`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!bookingsResponse.ok) {
        return NextResponse.json({ 
          error: 'Failed to fetch bookings',
          details: 'Unable to retrieve booking information'
        }, { status: bookingsResponse.status });
      }

      const bookingsData = await bookingsResponse.json();
      const bookings = bookingsData.data || bookingsData;
      
      // Find the booking with matching _id
      const booking = Array.isArray(bookings) 
        ? bookings.find((b: any) => b._id === id || b._id?.toString() === id)
        : null;

      if (!booking) {
        return NextResponse.json({ 
          error: 'Booking not found',
          details: 'No booking found with the provided ID'
        }, { status: 404 });
      }

      bookingId = booking.bookingId;

      if (!bookingId) {
        return NextResponse.json({ 
          error: 'Booking ID not found',
          details: 'The booking was found but does not contain a bookingId field'
        }, { status: 400 });
      }
    } else {
      // If it's neither format, try to use it as bookingId anyway
      bookingId = id;
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

