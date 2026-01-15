import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'all';
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const userType = searchParams.get('userType');
    const search = searchParams.get('search');
    
    // Get date range - prioritize custom dates, then use filter dates
    let from = searchParams.get('from');
    let to = searchParams.get('to');
    
    // If no explicit dates, check for date filter
    const dateFilter = searchParams.get('dateFilter');
    if (!from && !to && dateFilter && dateFilter !== 'custom') {
      const daysAgo = parseInt(dateFilter);
      if (!isNaN(daysAgo)) {
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - daysAgo);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(today);
        toDate.setHours(23, 59, 59, 999);
        from = fromDate.toISOString();
        to = toDate.toISOString();
      }
    }

    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (status && status !== 'all') params.append('status', status);
    if (paymentStatus && paymentStatus !== 'all') params.append('paymentStatus', paymentStatus);
    if (userType && userType !== 'all') params.append('userType', userType);
    if (search) params.append('search', search);

    // Determine endpoint based on tab
    let endpoint = `${API_BASE_URL}booking`;
    if (tab === 'altered') {
      endpoint = `${API_BASE_URL}booking/altered`;
    } else if (tab === 'cancelled') {
      endpoint = `${API_BASE_URL}booking/auto-cancelled`;
    }

    // For export, we want all matching records
    // Fetch all pages by looping through pagination
    let allBookings: any[] = [];
    let currentPage = 1;
    const limit = 100; // Fetch 100 at a time
    let hasMore = true;

    while (hasMore) {
      const pageParams = new URLSearchParams(params);
      pageParams.append('page', currentPage.toString());
      pageParams.append('limit', limit.toString());

      const response = await fetch(`${endpoint}?${pageParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch bookings' }));
        return NextResponse.json({ error: error.error || 'Failed to fetch bookings' }, { status: response.status });
      }

      const data = await response.json();
      const pageBookings = data.bookings || data.data || [];
      
      if (pageBookings.length === 0) {
        hasMore = false;
      } else {
        allBookings = [...allBookings, ...pageBookings];
        
        // Check if there are more pages
        if (data.pagination) {
          hasMore = currentPage < data.pagination.pages;
        } else {
          // If no pagination info, assume no more if we got less than limit
          hasMore = pageBookings.length === limit;
        }
        currentPage++;
      }
    }

    const bookings = allBookings;

    // Define column order - first 15 fields as specified, then the rest
    const primaryColumnOrder = [
      'id',
      'Trip seats',
      'First Name',
      'Second name',
      'Last name',
      'Phone',
      'Emergency Phone',
      'From',
      'TO',
      'Trip Amount',
      'Payment Status',
      'Trip Tittle',
      'Trip Time',
      'Trip Date',
      'Status',
    ];

    // Transform data for Excel with all fields
    const allData = bookings.map((booking: any) => {
      // Combine trip seats (tripSeat and returnSeat if both exist)
      const tripSeats = booking.tripSeat 
        ? (booking.returnSeat ? `${booking.tripSeat} | ${booking.returnSeat}` : booking.tripSeat)
        : (booking.returnSeat || '');

      return {
        'id': booking.bookingId || booking._id || '',
        'Trip seats': tripSeats,
        'First Name': booking.firstName || '',
        'Second name': booking.middleName || '',
        'Last name': booking.lastName || '',
        'Phone': booking.phone || '',
        'Emergency Phone': booking.emergencyPhone || '',
        'From': booking.from || '',
        'TO': booking.to || '',
        'Trip Amount': booking.tripAmount || 0,
        'Payment Status': booking.paymentStatus || '',
        'Trip Tittle': booking.trip?.title || '',
        'Trip Time': booking.trip?.time || '',
        'Trip Date': booking.trip?.tripDate || '',
        'Status': booking.status || '',
        // Remaining columns in any order
        'Email': booking.email || '',
        'User Type': booking.user?.type || 'user',
        'Trip Route': booking.trip?.title || `${booking.from}-${booking.to}`,
        'Bus Type': booking.trip?.bus || '',
        'Return Amount': booking.returnAmount || 0,
        'Total Amount': (booking.tripAmount || 0) + (booking.returnAmount || 0),
        'Discounted Fare': booking.discountedFare || 0,
        'Payment Mode': booking.mode || 'Paystack',
        'Payment Ref': booking.paystack_ref || booking.paystack_reference || booking.flutterwave_ref || '',
        'Rescheduled': booking.isRescheduled ? 'Yes' : 'No',
        'On Boarded': booking.onBoarded ? 'Yes' : 'No',
        'Emergency First Name': booking.emergencyFirstName || '',
        'Emergency Last Name': booking.emergencyLastName || '',
        'Emergency Email': booking.emergencyEmail || '',
        'Booking Date': booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '',
        'Created At': booking.createdAt ? new Date(booking.createdAt).toISOString() : '',
      };
    });

    // Reorder columns according to specified order
    const excelData = allData.map((row: any) => {
      const orderedRow: any = {};
      
      // Add primary columns in specified order
      for (const col of primaryColumnOrder) {
        orderedRow[col] = row[col];
      }
      
      // Add remaining columns in any order
      for (const key in row) {
        if (!primaryColumnOrder.includes(key)) {
          orderedRow[key] = row[key];
        }
      }
      
      return orderedRow;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with date range if available
    let filename = `bookings-${tab}`;
    if (from && to) {
      const fromDate = new Date(from).toISOString().split('T')[0];
      const toDate = new Date(to).toISOString().split('T')[0];
      filename += `-${fromDate}_to_${toDate}`;
    } else {
      filename += `-${new Date().toISOString().split('T')[0]}`;
    }
    filename += '.xlsx';

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

