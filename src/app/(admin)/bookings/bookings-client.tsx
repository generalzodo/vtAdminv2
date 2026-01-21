'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, MoreHorizontal, Eye, Plus, Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Trip {
  tripDate?: string;
  time?: string;
  title?: string;
  bus?: string;
}

interface Booking {
  _id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  from: string;
  to: string;
  status: string;
  paymentStatus: string;
  tripAmount?: number;
  returnAmount?: number;
  discountedFare?: number;
  tripSeat?: string;
  returnSeat?: string;
  mode?: string;
  paystack_ref?: string;
  paystack_reference?: string;
  flutterwave_ref?: string;
  isRescheduled?: boolean;
  onBoarded?: boolean;
  createdAt: string;
  user?: {
    type?: string;
  };
  trip?: Trip;
}

export function BookingsClient() {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [selectedFilter, setSelectedFilter] = useState<{ title: string; value: number | string }>({ title: 'Last 7 Days', value: 7 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkPaymentStatusDialogOpen, setBulkPaymentStatusDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>('');
  const [bulkPaymentStatusValue, setBulkPaymentStatusValue] = useState<string>('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [viewBookingDialogOpen, setViewBookingDialogOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [verifyPaymentDialogOpen, setVerifyPaymentDialogOpen] = useState(false);
  const [verifyingBooking, setVerifyingBooking] = useState<Booking | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const dateFilter = [
    { title: 'Last 7 days', value: 7 },
    { title: 'Last 30 days', value: 30 },
    { title: 'Last 60 days', value: 60 },
    { title: 'Last 3 months', value: 90 },
    { title: 'Last 6 months', value: 180 },
    { title: 'Last Year', value: 365 },
    { title: 'Custom', value: 'custom' },
  ];

  useEffect(() => {
    // Reset to first page when tab or filter changes
    setPage(1);
  }, [activeTab, selectedFilter, statusFilter, paymentStatusFilter, userTypeFilter, customStartDate, customEndDate, searchTerm]);

  // Clear end date if it becomes invalid when start date changes
  useEffect(() => {
    if (selectedFilter.value === 'custom' && customStartDate && customEndDate && customEndDate < customStartDate) {
      setCustomEndDate(undefined);
    }
  }, [customStartDate, selectedFilter.value, customEndDate]);

  useEffect(() => {
    fetchBookings(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, activeTab, selectedFilter, statusFilter, paymentStatusFilter, userTypeFilter, customStartDate, customEndDate, searchTerm]);

  const getDateRange = (daysAgo: number) => {
    const today = new Date();
    const fromDate = new Date();
    
    // Set the 'fromDate' to the same day 'daysAgo' and time to 00:00:00
    fromDate.setDate(today.getDate() - daysAgo);
    fromDate.setHours(0, 0, 0, 0);
    
    // Set the 'toDate' to today and time to 23:59:59
    const toDate = new Date(today);
    toDate.setHours(23, 59, 59, 999);
  
    // Format the dates as YYYY-MM-DDTHH:MM:SS
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };
  
    return {
      from: formatDateTime(fromDate),
      to: formatDateTime(toDate)
    };
  };

  const fetchBookings = async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    try {
      let endpoint = '/api/admin/bookings';
      if (activeTab === 'altered') {
        endpoint = '/api/admin/bookings/altered';
      } else if (activeTab === 'cancelled') {
        endpoint = '/api/admin/bookings/cancelled';
      }

      // Build query params with date filter
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', currentLimit.toString());
      
      // Add date filter if selected
      if (selectedFilter.value === 'custom') {
        // Use custom dates - ensure both are provided for proper range filtering
        if (customStartDate && customEndDate) {
          // Format dates as ISO strings (YYYY-MM-DDTHH:mm:ss)
          // Backend expects these and will parse them correctly
          const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          const fromDate = `${formatDate(customStartDate)}T00:00:00`;
          const toDate = `${formatDate(customEndDate)}T23:59:59`;
          params.append('from', fromDate);
          params.append('to', toDate);
        } else if (customStartDate) {
          // Only start date - set from date
          const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          params.append('from', `${formatDate(customStartDate)}T00:00:00`);
        } else if (customEndDate) {
          // Only end date - set to date
          const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          params.append('to', `${formatDate(customEndDate)}T23:59:59`);
        }
      } else if (selectedFilter.value && typeof selectedFilter.value === 'number') {
        const dateRange = getDateRange(selectedFilter.value);
        params.append('from', dateRange.from);
        params.append('to', dateRange.to);
      }
      
      // Add status filter
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Add payment status filter
      if (paymentStatusFilter !== 'all') {
        params.append('paymentStatus', paymentStatusFilter);
      }
      
      // Add user type filter
      if (userTypeFilter !== 'all') {
        params.append('userType', userTypeFilter);
      }
      
      // Add search parameter
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      
      if (!response.ok) {
        // Handle error responses
        let errorMessage = `Failed to fetch bookings (${response.status})`;
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || '';
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${response.status} ${response.statusText}`;
          if (response.status === 502) {
            errorDetails = 'Backend server may be down or unreachable';
          }
        }
        console.error('Error fetching bookings:', errorMessage, errorDetails);
        
        toast({
          title: 'Error Loading Bookings',
          description: errorDetails || errorMessage,
          variant: 'destructive',
        });
        
        setBookings([]);
        setPagination({
          page: currentPage,
          limit: currentLimit,
          total: 0,
          pages: 1,
        });
        return;
      }

      const data = await response.json();
      if (data.success) {
        setBookings(data.data || []);
        // Always use the current page from parameter, ignore API response page value
        const total = data.pagination?.total || data.data?.length || 0;
        const pages = data.pagination?.pages || Math.ceil(total / currentLimit);
        setPagination({
          page: currentPage, // Always use the requested page, never from API
          limit: currentLimit,
          total: total,
          pages: pages,
        });
      } else {
        console.error('API returned unsuccessful response:', data);
        setBookings([]);
        setPagination({
          page: currentPage,
          limit: currentLimit,
          total: 0,
          pages: 1,
        });
      }
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      
      let errorMessage = 'Failed to fetch bookings';
      let errorDetails = '';
      
      if (error.message) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      }
      
      toast({
        title: 'Error Loading Bookings',
        description: errorDetails || errorMessage,
        variant: 'destructive',
      });
      
      setBookings([]);
      setPagination({
        page: currentPage,
        limit: currentLimit,
        total: 0,
        pages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    params.append('tab', activeTab);
    
    // Add date range
    if (selectedFilter.value === 'custom') {
      if (customStartDate) {
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        params.append('from', `${formatDate(customStartDate)}T00:00:00`);
      }
      if (customEndDate) {
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        params.append('to', `${formatDate(customEndDate)}T23:59:59`);
      }
    } else if (selectedFilter.value && typeof selectedFilter.value === 'number') {
      const dateRange = getDateRange(selectedFilter.value);
      params.append('from', dateRange.from);
      params.append('to', dateRange.to);
      params.append('dateFilter', selectedFilter.value.toString());
    }
    
    // Add filters
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (paymentStatusFilter !== 'all') params.append('paymentStatus', paymentStatusFilter);
    if (userTypeFilter !== 'all') params.append('userType', userTypeFilter);
    
    // Add search parameter
    if (searchTerm) {
      params.append('search', searchTerm);
    }

    // Background export job (non-blocking)
    try {
      const res = await fetch('/api/admin/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bookings',
          params: Object.fromEntries(params.entries()),
          format: 'csv',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Failed to start export');
      }

      toast({
        title: 'Export started',
        description: 'Your bookings export is generating. You can continue working and download it from the Exports icon.',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed to start',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusValue || selectedBookings.length === 0) return;
    
    setBulkUpdating(true);
    try {
      const response = await fetch('/api/admin/bookings/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedBookings,
          status: bulkStatusValue,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: `Updated status for ${selectedBookings.length} booking(s)`,
        });
        setBulkStatusDialogOpen(false);
        setBulkStatusValue('');
        setSelectedBookings([]);
        fetchBookings(page, limit);
      } else {
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkPaymentStatusUpdate = async () => {
    if (!bulkPaymentStatusValue || selectedBookings.length === 0) return;
    
    setBulkUpdating(true);
    try {
      const response = await fetch('/api/admin/bookings/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedBookings,
          paymentStatus: bulkPaymentStatusValue,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: `Updated payment status for ${selectedBookings.length} booking(s)`,
        });
        setBulkPaymentStatusDialogOpen(false);
        setBulkPaymentStatusValue('');
        setSelectedBookings([]);
        fetchBookings(page, limit);
      } else {
        throw new Error(data.error || 'Failed to update payment status');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment status',
        variant: 'destructive',
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  const bulkActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setBulkStatusDialogOpen(true)}
      >
        Update Status
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setBulkPaymentStatusDialogOpen(true)}
      >
        Update Payment Status
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSelectedBookings([])}
      >
        Clear Selection
      </Button>
    </div>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getUserTypeDisplay = (type?: string) => {
    if (!type || type === 'user') return 'User';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getUserTypeColor = (type?: string) => {
    switch (type) {
      case 'agent':
        return 'bg-blue-100 text-blue-800';
      case 'partner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'confirmed' || status === 'completed' ? 'success' : 'secondary'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const status = paymentStatus?.toLowerCase() || '';
    let className = '';
    let displayText = paymentStatus || 'Unknown';

    switch (status) {
      case 'success':
      case 'admin paid':
        className = 'bg-green-100 text-green-800 border-green-200';
        break;
      case 'pending':
        className = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        break;
      case 'failed':
      case 'payment not found':
        className = 'bg-red-100 text-red-800 border-red-200';
        break;
      case 'requires_review':
        className = 'bg-orange-100 text-orange-800 border-orange-200';
        break;
      default:
        className = 'bg-gray-100 text-gray-800 border-gray-200';
    }

    // Format display text
    if (status === 'admin paid') {
      displayText = 'Admin Paid';
    } else if (status === 'requires_review') {
      displayText = 'Requires Review';
    } else if (status === 'payment not found') {
      displayText = 'Payment Not Found';
    } else {
      displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
    }

    return (
      <Badge className={className} variant="outline">
        {displayText}
      </Badge>
    );
  };

  const columns: Column<Booking>[] = [
    { key: 'bookingId', header: 'BookingId' },
    { key: 'name', header: 'Name', cell: (row) => `${row.firstName}, ${row.lastName}` },
    { 
      key: 'userType', 
      header: 'User Type',
      cell: (row) => row.user?.type ? (
        <Badge className={getUserTypeColor(row.user.type)}>
          {getUserTypeDisplay(row.user.type)}
        </Badge>
      ) : <span className="text-gray-400 text-xs">N/A</span>
    },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'tripRoute', 
      header: 'Trip Route',
      cell: (row) => `${row.from}-${row.to}${row.trip?.title ? `(${row.trip.title})` : ''}`
    },
    { key: 'busType', header: 'Bus Type', cell: (row) => row.trip?.bus || 'N/A' },
    { 
      key: 'travelDate', 
      header: 'Travel Date',
      cell: (row) => row.trip?.tripDate && row.trip?.time 
        ? `${row.trip.tripDate} ${row.trip.time}`
        : 'N/A'
    },
    { 
      key: 'amount', 
      header: 'Amount',
      cell: (row) => {
        const total = (row.tripAmount || 0) + (row.returnAmount || 0);
        const discount = row.discountedFare || 0;
        return (
          <span>
            ₦{total}
            {discount > 0 && <span className="text-gray-500"> | {discount}</span>}
          </span>
        );
      }
    },
    { 
      key: 'seatNo', 
      header: 'Seat No.',
      cell: (row) => (
        <span>
          {row.tripSeat || 'N/A'}
          {row.returnSeat && <span> | {row.returnSeat}</span>}
        </span>
      )
    },
    { 
      key: 'paymentRef', 
      header: 'Payment ref',
      cell: (row) => {
        const ref = row.paystack_ref || row.paystack_reference || row.flutterwave_ref || '';
        return `${row.mode || 'Paystack'}: ${row.paymentStatus} ${ref}`;
      }
    },
    { 
      key: 'paymentStatus', 
      header: 'Payment Status', 
      cell: (row) => getPaymentStatusBadge(row.paymentStatus)
    },
    { 
      key: 'status', 
      header: 'Status', 
      cell: (row) => getStatusBadge(row.status)
    },
    { 
      key: 'rescheduled', 
      header: 'Rescheduled',
      cell: (row) => row.isRescheduled ? (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">Rescheduled</Badge>
      ) : <span className="text-gray-400 text-xs">-</span>
    },
    { 
      key: 'onBoarded', 
      header: 'Boarded',
      cell: (row) => (
        <input 
          type="checkbox" 
          checked={row.onBoarded || false}
          onChange={(e) => handleUpdateOnBoarded(row._id, e.target.checked)}
          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
        />
      )
    },
    { key: 'createdAt', header: 'Booking Date', cell: (row) => formatDate(row.createdAt) },
  ];

  const handleViewBooking = async (booking: Booking) => {
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}`);
      const data = await response.json();
      if (data.success) {
        setViewingBooking(data.data || booking);
        setViewBookingDialogOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load booking details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booking details',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyPayment = async (booking: Booking) => {
    setVerifyingBooking(booking);
    setVerifyPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!verifyingBooking) return;
    
    setConfirmingPayment(true);
    try {
      const response = await fetch(`/api/admin/bookings/${verifyingBooking._id}/confirm-payment`, {
        method: 'PATCH',
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: data.message || 'Payment confirmed and ticket sent',
        });
        setVerifyPaymentDialogOpen(false);
        setVerifyingBooking(null);
        fetchBookings(page, limit);
      } else {
        throw new Error(data.error || 'Failed to confirm payment');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm payment',
        variant: 'destructive',
      });
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleMarkAsUsed = async (booking: Booking) => {
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Booking marked as used',
        });
        fetchBookings(page, limit);
      } else {
        throw new Error(data.error || 'Failed to update booking');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsUnused = async (booking: Booking) => {
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Booking marked as unused',
        });
        fetchBookings(page, limit);
      } else {
        throw new Error(data.error || 'Failed to update booking');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadTicket = async (booking: Booking) => {
    try {
      // Always use bookingId for download (backend expects bookingId, not _id)
      if (!booking.bookingId) {
        throw new Error('Booking ID not found. Cannot download ticket.');
      }

      const response = await fetch(`/api/admin/bookings/${booking.bookingId}/download-ticket`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to download ticket' }));
        throw new Error(error.error || 'Failed to download ticket');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${booking.bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Ticket downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download ticket',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateOnBoarded = async (bookingId: string, onBoarded: boolean) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/onboarded`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onBoarded }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        fetchBookings(page, limit);
      } else {
        throw new Error(data.error || 'Failed to update onboarded status');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update onboarded status',
        variant: 'destructive',
      });
    }
  };

  const actions = (row: Booking) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewBooking(row)}>
          <Eye className="mr-2 h-4 w-4" />
          View Booking
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleVerifyPayment(row)}>
          Verify Payment
        </DropdownMenuItem>
        {row.status !== 'completed' && row.status !== 'Used' && (
          <DropdownMenuItem onClick={() => handleMarkAsUsed(row)}>
            Mark as used
          </DropdownMenuItem>
        )}
        {(row.status === 'completed' || row.status === 'Used') && (
          <DropdownMenuItem onClick={() => handleMarkAsUnused(row)}>
            Mark as unused
          </DropdownMenuItem>
        )}
        {(row.paymentStatus === 'success' || row.paymentStatus === 'admin paid') && (
          <DropdownMenuItem onClick={() => handleDownloadTicket(row)}>
            Download Ticket
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => {
          setEditingBooking(row);
          setDialogOpen(true);
        }}>
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h4 className="mb-4 text-primary-600 text-xl font-semibold">Bookings</h4>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1"></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
          <Button onClick={() => {
            setEditingBooking(null);
            setDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add new booking
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Bookings</TabsTrigger>
              <TabsTrigger value="altered">Altered Bookings</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled Bookings</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              {/* Filters and Search Section */}
              <div className="mb-4 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                    
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="admin paid">Admin Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="User Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All User Types</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start">
                        <Filter className="mr-2 h-4 w-4" />
                        {selectedFilter.title}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {dateFilter.map((filter) => (
                        <DropdownMenuItem 
                          key={filter.value}
                          onClick={() => {
                            setSelectedFilter(filter);
                            if (filter.value !== 'custom') {
                              setCustomStartDate(undefined);
                              setCustomEndDate(undefined);
                            }
                          }}
                        >
                          {filter.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedFilter.value === 'custom' && (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[180px] justify-start text-left font-normal",
                              !customStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDate ? format(customStartDate, "PPP") : <span>Start Date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customStartDate}
                            onSelect={setCustomStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[180px] justify-start text-left font-normal",
                              !customEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDate ? format(customEndDate, "PPP") : <span>End Date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customEndDate}
                            onSelect={setCustomEndDate}
                            initialFocus
                            disabled={(date) => customStartDate ? date < customStartDate : false}
                          />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              </div>
              <DataTable
                columns={columns}
                data={bookings}
                loading={loading}
                pagination={pagination}
                onPageChange={(newPage) => {
                  if (newPage !== page) {
                    setPage(newPage);
                    setPagination(prev => ({ ...prev, page: newPage }));
                  }
                }}
                onLimitChange={setLimit}
                searchable={true}
                onSearch={(search) => {
                  setSearchTerm(search);
                  // Only reset to page 1 if search term actually changed (not empty to empty)
                  if (search !== searchTerm && (search || searchTerm)) {
                    setPage(1);
                  }
                }}
                actions={actions}
                selectable
                selectedRows={selectedBookings}
                onSelectionChange={setSelectedBookings}
                bulkActions={bulkActions}
              />
            </TabsContent>
            <TabsContent value="altered" className="mt-4">
              {/* Filters and Search Section */}
              <div className="mb-4 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="admin paid">Admin Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="User Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All User Types</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start">
                        <Filter className="mr-2 h-4 w-4" />
                        {selectedFilter.title}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {dateFilter.map((filter) => (
                        <DropdownMenuItem 
                          key={filter.value}
                          onClick={() => {
                            setSelectedFilter(filter);
                            if (filter.value !== 'custom') {
                              setCustomStartDate(undefined);
                              setCustomEndDate(undefined);
                            }
                          }}
                        >
                          {filter.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedFilter.value === 'custom' && (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[180px] justify-start text-left font-normal",
                              !customStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDate ? format(customStartDate, "PPP") : <span>Start Date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customStartDate}
                            onSelect={setCustomStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[180px] justify-start text-left font-normal",
                              !customEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDate ? format(customEndDate, "PPP") : <span>End Date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customEndDate}
                            onSelect={setCustomEndDate}
                            initialFocus
                            disabled={(date) => customStartDate ? date < customStartDate : false}
                          />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              </div>
              <DataTable
                columns={columns}
                data={bookings}
                loading={loading}
                pagination={pagination}
                onPageChange={(newPage) => {
                  if (newPage !== page) {
                    setPage(newPage);
                    setPagination(prev => ({ ...prev, page: newPage }));
                  }
                }}
                onLimitChange={setLimit}
                searchable={true}
                onSearch={(search) => {
                  setSearchTerm(search);
                  // Only reset to page 1 if search term actually changed (not empty to empty)
                  if (search !== searchTerm && (search || searchTerm)) {
                    setPage(1);
                  }
                }}
                actions={actions}
                selectable
                selectedRows={selectedBookings}
                onSelectionChange={setSelectedBookings}
                bulkActions={bulkActions}
              />
            </TabsContent>
            <TabsContent value="cancelled" className="mt-4">
              {/* Filters and Search Section */}
              <div className="mb-4 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="admin paid">Admin Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="User Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All User Types</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start">
                        <Filter className="mr-2 h-4 w-4" />
                        {selectedFilter.title}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {dateFilter.map((filter) => (
                        <DropdownMenuItem 
                          key={filter.value}
                          onClick={() => {
                            setSelectedFilter(filter);
                            if (filter.value !== 'custom') {
                              setCustomStartDate(undefined);
                              setCustomEndDate(undefined);
                            }
                          }}
                        >
                          {filter.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedFilter.value === 'custom' && (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[180px] justify-start text-left font-normal",
                              !customStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDate ? format(customStartDate, "PPP") : <span>Start Date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customStartDate}
                            onSelect={setCustomStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[180px] justify-start text-left font-normal",
                              !customEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDate ? format(customEndDate, "PPP") : <span>End Date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customEndDate}
                            onSelect={setCustomEndDate}
                            initialFocus
                            disabled={(date) => customStartDate ? date < customStartDate : false}
                          />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              </div>
              <DataTable
                columns={columns}
                data={bookings}
                loading={loading}
                pagination={pagination}
                onPageChange={(newPage) => {
                  if (newPage !== page) {
                    setPage(newPage);
                    setPagination(prev => ({ ...prev, page: newPage }));
                  }
                }}
                onLimitChange={setLimit}
                searchable={true}
                onSearch={(search) => {
                  setSearchTerm(search);
                  // Only reset to page 1 if search term actually changed (not empty to empty)
                  if (search !== searchTerm && (search || searchTerm)) {
                    setPage(1);
                  }
                }}
                actions={actions}
                selectable
                selectedRows={selectedBookings}
                onSelectionChange={setSelectedBookings}
                bulkActions={bulkActions}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBooking ? 'Edit' : 'Add'} Booking</DialogTitle>
            <DialogDescription>
              {editingBooking ? 'Update booking details' : 'Create a new booking'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {editingBooking ? 'Edit booking functionality' : 'Add booking functionality'} is coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This feature will allow you to {editingBooking ? 'modify existing bookings' : 'create new bookings'} with full passenger and trip details.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: 'Coming Soon',
                description: 'This feature is under development',
              });
              setDialogOpen(false);
            }}>
              {editingBooking ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedBookings.length} selected booking(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-status">New Status</Label>
              <Select value={bulkStatusValue} onValueChange={setBulkStatusValue}>
                <SelectTrigger id="bulk-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)} disabled={bulkUpdating}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={!bulkStatusValue || bulkUpdating}>
              {bulkUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Status Update Dialog */}
      <Dialog open={bulkPaymentStatusDialogOpen} onOpenChange={setBulkPaymentStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Update payment status for {selectedBookings.length} selected booking(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-payment-status">New Payment Status</Label>
              <Select value={bulkPaymentStatusValue} onValueChange={setBulkPaymentStatusValue}>
                <SelectTrigger id="bulk-payment-status">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="admin paid">Admin Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPaymentStatusDialogOpen(false)} disabled={bulkUpdating}>
              Cancel
            </Button>
            <Button onClick={handleBulkPaymentStatusUpdate} disabled={!bulkPaymentStatusValue || bulkUpdating}>
              {bulkUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Booking Dialog */}
      <Dialog open={viewBookingDialogOpen} onOpenChange={setViewBookingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>View complete booking information</DialogDescription>
          </DialogHeader>
          {viewingBooking && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Booking ID</Label>
                  <p className="text-sm">{viewingBooking.bookingId}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <p className="text-sm">{getStatusBadge(viewingBooking.status)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Payment Status</Label>
                  <p className="text-sm">{viewingBooking.paymentStatus}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Passenger Name</Label>
                  <p className="text-sm">{viewingBooking.firstName} {viewingBooking.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Email</Label>
                  <p className="text-sm">{viewingBooking.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Phone</Label>
                  <p className="text-sm">{viewingBooking.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Route</Label>
                  <p className="text-sm">{viewingBooking.from} - {viewingBooking.to}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Travel Date</Label>
                  <p className="text-sm">
                    {viewingBooking.trip?.tripDate && viewingBooking.trip?.time 
                      ? `${viewingBooking.trip.tripDate} ${viewingBooking.trip.time}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Seat Number</Label>
                  <p className="text-sm">
                    {viewingBooking.tripSeat || 'N/A'}
                    {viewingBooking.returnSeat && ` | Return: ${viewingBooking.returnSeat}`}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Amount</Label>
                  <p className="text-sm">
                    ₦{((viewingBooking.tripAmount || 0) + (viewingBooking.returnAmount || 0)).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Payment Reference</Label>
                  <p className="text-sm">
                    {viewingBooking.paystack_ref || viewingBooking.paystack_reference || viewingBooking.flutterwave_ref || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Payment Mode</Label>
                  <p className="text-sm">{viewingBooking.mode || 'Paystack'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">On Boarded</Label>
                  <p className="text-sm">{viewingBooking.onBoarded ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Rescheduled</Label>
                  <p className="text-sm">{viewingBooking.isRescheduled ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Booking Date</Label>
                  <p className="text-sm">{formatDate(viewingBooking.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewBookingDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Payment Dialog */}
      <Dialog open={verifyPaymentDialogOpen} onOpenChange={setVerifyPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
            <DialogDescription>
              {verifyingBooking && `Verify payment for booking ${verifyingBooking.bookingId}`}
            </DialogDescription>
          </DialogHeader>
          {verifyingBooking && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Booking ID</Label>
                <p className="text-sm">{verifyingBooking.bookingId}</p>
              </div>
              <div className="space-y-2">
                <Label>Current Payment Status</Label>
                <p className="text-sm">{verifyingBooking.paymentStatus}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <p className="text-sm">
                  {verifyingBooking.paystack_ref || verifyingBooking.paystack_reference || verifyingBooking.flutterwave_ref || 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <p className="text-sm">{verifyingBooking.mode || 'Paystack'}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  Clicking "Confirm Payment" will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Update payment status to "success"</li>
                    <li>Change booking status to "pending"</li>
                    <li>Generate and send ticket email to passenger</li>
                  </ul>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyPaymentDialogOpen(false)} disabled={confirmingPayment}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={confirmingPayment}>
              {confirmingPayment ? 'Confirming...' : 'Confirm Payment & Send Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
