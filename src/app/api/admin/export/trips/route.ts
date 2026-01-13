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
    const status = searchParams.get('status');
    const route = searchParams.get('route');
    
    // Get date range
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
    if (route && route !== 'all') params.append('route', route);
    
    // For export, we want all matching records
    // Fetch all pages by looping through pagination
    let allTrips: any[] = [];
    let currentPage = 1;
    const limit = 100; // Fetch 100 at a time
    let hasMore = true;

    while (hasMore) {
      const pageParams = new URLSearchParams(params);
      pageParams.append('page', currentPage.toString());
      pageParams.append('limit', limit.toString());

      const response = await fetch(`${API_BASE_URL}trip?${pageParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch trips' }));
        return NextResponse.json({ error: error.error || 'Failed to fetch trips' }, { status: response.status });
      }

      const data = await response.json();
      const pageTrips = data.data || [];
      
      if (pageTrips.length === 0) {
        hasMore = false;
      } else {
        allTrips = [...allTrips, ...pageTrips];
        
        // Check if there are more pages
        if (data.pagination) {
          hasMore = currentPage < data.pagination.pages;
        } else {
          // If no pagination info, assume no more if we got less than limit
          hasMore = pageTrips.length === limit;
        }
        currentPage++;
      }
    }

    const trips = allTrips;

    // Transform data for Excel
    const excelData = trips.map((trip: any) => ({
      'Title': trip.title || '',
      'Route': trip.route?.title || `${trip.route?.origin || ''} - ${trip.route?.destination || ''}`,
      'Trip Date': trip.tripDate || '',
      'Time': trip.isWalkIn ? 'Walk-In' : (trip.time || ''),
      'Walk-In Time Slot': trip.walkInTimeSlot || '',
      'Type': trip.isWalkIn ? 'Walk-In' : 'Scheduled',
      'Transport Officer': trip.driver ? `${trip.driver.firstName || ''} ${trip.driver.lastName || ''}` : '',
      'Bus No': trip.busNo || '',
      'Available Seats': trip.isWalkIn 
        ? (trip.availableSeats || 0)
        : ((trip.route?.bus?.seats || 0) - (trip.seats?.length || 0)),
      'Total Seats': trip.route?.bus?.seats || trip.availableSeats || 0,
      'Booked Seats': trip.seats?.length || 0,
      'Status': trip.status || '',
      'Created At': trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Trips');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with date range if available
    let filename = 'trips';
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
    console.error('Error exporting trips:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

