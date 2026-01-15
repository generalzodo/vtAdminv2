'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Plus, MoreHorizontal, Edit, Trash2, CalendarIcon, Users, MapPin, Clock, Bus, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Route {
  _id: string;
  title?: string;
  origin?: string;
  destination?: string;
  bus?: {
    seats?: number;
  };
}

interface Driver {
  _id: string;
  firstName?: string;
  lastName?: string;
}

interface Trip {
  _id: string;
  title?: string;
  route?: Route;
  driver?: Driver;
  tripDate?: string;
  time?: string;
  isWalkIn?: boolean;
  walkInTimeSlot?: string;
  busNo?: string;
  availableSeats?: number;
  seats?: string[];
  status: string;
  createdAt: string;
}

export function TripsClient() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [checkAllStatus, setCheckAllStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [fromDateFilter, setFromDateFilter] = useState<Date | undefined>(undefined);
  const [toDateFilter, setToDateFilter] = useState<Date | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [formData, setFormData] = useState({
    route: '',
    title: '',
    driver: '',
    tripDate: undefined as Date | undefined,
    isWalkIn: false,
    time: '',
    walkInTimeSlot: '',
    capacity: '',
    busNo: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [manifestDialogOpen, setManifestDialogOpen] = useState(false);
  const [currentManifestTrip, setCurrentManifestTrip] = useState<any>(null);
  const [manifestBookings, setManifestBookings] = useState<any[]>([]);
  const [manifestFormData, setManifestFormData] = useState({
    selectedDriverId: '',
    vehicleNo: '',
  });
  const [onboardingAll, setOnboardingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
    fetchRoutes();
    fetchDrivers();
  }, [page, limit, statusFilter, routeFilter, fromDateFilter, toDateFilter, searchTerm]);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/admin/routes?page=1&limit=1000');
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/admin/drivers?page=1&limit=1000');
      const data = await response.json();
      if (data.success) {
        setDrivers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  useEffect(() => {
    if (trips.length > 0) {
      const allCurrentPageSelected = trips.every(trip => selectedRecordIds.includes(trip._id));
      setCheckAllStatus(allCurrentPageSelected);
    } else {
      setCheckAllStatus(false);
    }
  }, [selectedRecordIds, trips]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (routeFilter !== 'all') params.append('route', routeFilter);
      if (fromDateFilter) {
        const fromDate = new Date(fromDateFilter);
        fromDate.setHours(0, 0, 0, 0);
        params.append('from', fromDate.toISOString());
      }
      if (toDateFilter) {
        const toDate = new Date(toDateFilter);
        toDate.setHours(23, 59, 59, 999);
        params.append('to', toDate.toISOString());
      }
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/trips?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch trips');
      }
      const data = await response.json();
      if (data.success) {
        setTrips(data.data || []);
        // Ensure pagination always reflects the current page state, not stale state
        const paginationData = data.pagination || {
          page: page,
          limit: limit,
          total: data.data?.length || 0,
          pages: Math.ceil((data.data?.length || 0) / limit),
        };
        // Always use the current page from state, not from response (which might be stale)
        setPagination({
          ...paginationData,
          page: page, // Force current page state
        });
      } else {
        throw new Error(data.error || 'Failed to fetch trips');
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAll = (checked: boolean) => {
    setCheckAllStatus(checked);
    if (checked) {
      const allIds = trips.map(trip => trip._id);
      setSelectedRecordIds(allIds);
    } else {
      setSelectedRecordIds([]);
    }
  };

  const handleRecordSelection = (tripId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(prev => [...prev, tripId]);
    } else {
      setSelectedRecordIds(prev => prev.filter(id => id !== tripId));
      setCheckAllStatus(false);
    }
  };

  const handleOpenDialog = (trip?: Trip) => {
    if (trip) {
      setEditingTrip(trip);
      setFormData({
        route: typeof trip.route === 'string' ? trip.route : trip.route?._id || '',
        title: trip.title || '',
        driver: typeof trip.driver === 'string' ? trip.driver : trip.driver?._id || '',
        tripDate: trip.tripDate ? new Date(trip.tripDate) : undefined,
        isWalkIn: trip.isWalkIn || false,
        time: trip.time || '',
        walkInTimeSlot: trip.walkInTimeSlot || '',
        capacity: (trip as any).capacity?.toString() || '',
        busNo: trip.busNo || '',
      });
    } else {
      setEditingTrip(null);
      setFormData({
        route: '',
        title: '',
        driver: '',
        tripDate: undefined,
        isWalkIn: false,
        time: '',
        walkInTimeSlot: '',
        capacity: '',
        busNo: '',
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTrip(null);
    setFormData({
      route: '',
      title: '',
      driver: '',
      tripDate: undefined,
      isWalkIn: false,
      time: '',
      walkInTimeSlot: '',
      capacity: '',
      busNo: '',
    });
    setFormErrors({});
  };

  const handleRouteChange = (routeId: string) => {
    const selectedRoute = routes.find(r => r._id === routeId);
    setFormData(prev => ({
      ...prev,
      route: routeId,
      title: selectedRoute?.title || prev.title,
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.route) errors.route = 'Please select route';
    if (!formData.title) errors.title = 'Please enter title';
    if (!formData.tripDate) errors.tripDate = 'Please select trip date';
    if (!formData.isWalkIn && !formData.time) errors.time = 'Please enter departure time';
    if (!formData.busNo) errors.busNo = 'Please enter bus number';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        route: formData.route,
        title: formData.title,
        driver: formData.driver || undefined,
        tripDate: formData.tripDate?.toISOString().split('T')[0],
        isWalkIn: formData.isWalkIn,
        time: formData.isWalkIn ? undefined : formData.time,
        walkInTimeSlot: formData.isWalkIn ? formData.walkInTimeSlot : undefined,
        capacity: formData.isWalkIn && formData.capacity ? parseInt(formData.capacity) : undefined,
        busNo: formData.busNo,
      };

      const url = editingTrip 
        ? `/api/admin/trips/${editingTrip._id}`
        : '/api/admin/trips';
      const method = editingTrip ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save trip');
      }

      toast({
        title: 'Success',
        description: editingTrip ? 'Trip updated successfully' : 'Trip created successfully',
      });

      handleCloseDialog();
      fetchTrips();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save trip',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (tripId: string) => {
    setDeletingTripId(tripId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTripId) return;

    try {
      const response = await fetch(`/api/admin/trips/${deletingTripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trip');
      }

      toast({
        title: 'Success',
        description: 'Trip deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingTripId(null);
      fetchTrips();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete trip',
        variant: 'destructive',
      });
    }
  };

  const handleMarkTripStatus = async (tripId: string, status: 'pending' | 'completed') => {
    try {
      const response = await fetch(`/api/admin/trips/${tripId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark trip as ${status}`);
      }

      toast({
        title: 'Success',
        description: `Trip marked as ${status} successfully`,
      });

      fetchTrips();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to mark trip as ${status}`,
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecordIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select trips to delete',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/trips/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedRecordIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete trips');
      }

      toast({
        title: 'Success',
        description: `Successfully deleted ${selectedRecordIds.length} trip(s)`,
      });

      setSelectedRecordIds([]);
      fetchTrips();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete trips',
        variant: 'destructive',
      });
    }
  };

  const handleOpenManifest = async (trip: Trip) => {
    setCurrentManifestTrip(trip);
    setManifestFormData({
      selectedDriverId: '',
      vehicleNo: '',
    });
    setManifestBookings([]);
    setManifestDialogOpen(true);
    await fetchTripManifest(trip._id);
  };

  const fetchTripManifest = async (tripId: string) => {
    try {
      const response = await fetch(`/api/admin/trips/${tripId}/manifest`);
      if (!response.ok) {
        throw new Error('Failed to fetch trip manifest');
      }
      const data = await response.json();
      if (data.success) {
        // Find the original trip to preserve title and other fields
        const originalTrip = trips.find(t => t._id === tripId);
        setCurrentManifestTrip({
          ...originalTrip,
          ...data.trip,
          title: originalTrip?.title || data.trip.title,
        });
        setManifestBookings(data.bookings || []);
        
        // Find matching driver if transportOfficerName exists
        let selectedDriverId = '';
        if (data.trip?.transportOfficerName && drivers.length > 0) {
          const matchingDriver = drivers.find((d) => {
            const fullName = `${d.firstName} ${d.lastName}`.trim();
            return fullName === data.trip.transportOfficerName ||
                   d.firstName === data.trip.transportOfficerName ||
                   d.lastName === data.trip.transportOfficerName;
          });
          if (matchingDriver) {
            selectedDriverId = matchingDriver._id;
          }
        }
        
        setManifestFormData({
          selectedDriverId,
          vehicleNo: data.trip?.vehicleNo || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching trip manifest:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load trip manifest',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateManifest = async () => {
    if (!currentManifestTrip?._id) return;

    try {
      // Get transport officer name from selected driver
      let transportOfficerName = '';
      if (manifestFormData.selectedDriverId && drivers.length > 0) {
        const selectedDriver = drivers.find((d) => d._id === manifestFormData.selectedDriverId);
        if (selectedDriver) {
          transportOfficerName = `${selectedDriver.firstName} ${selectedDriver.lastName}`.trim();
        }
      }

      const response = await fetch(`/api/admin/trips/${currentManifestTrip._id}/manifest`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transportOfficerName,
          vehicleNo: manifestFormData.vehicleNo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update manifest');
      }

      toast({
        title: 'Success',
        description: 'Manifest updated successfully',
      });

      // Refresh manifest data
      await fetchTripManifest(currentManifestTrip._id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update manifest',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateOnBoarded = async (bookingId: string, onBoarded: boolean) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/onboarded`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onBoarded }),
      });

      if (!response.ok) {
        throw new Error('Failed to update onboard status');
      }

      // Update local state
      setManifestBookings(prev =>
        prev.map(booking =>
          booking._id === bookingId ? { ...booking, onBoarded } : booking
        )
      );

      toast({
        title: 'Success',
        description: `Passenger ${onBoarded ? 'marked as on-boarded' : 'marked as not on-boarded'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update onboard status',
        variant: 'destructive',
      });
    }
  };

  const handleOnboardAll = async () => {
    if (!currentManifestTrip?.bookings || manifestBookings.length === 0) {
      toast({
        title: 'No Passengers',
        description: 'No passengers found for this trip',
        variant: 'destructive',
      });
      return;
    }

    // Filter out passengers that are already onboarded
    const passengersToOnboard = manifestBookings.filter((booking) => !booking.onBoarded);
    
    if (passengersToOnboard.length === 0) {
      toast({
        title: 'Already Onboarded',
        description: 'All passengers are already onboarded',
      });
      return;
    }

    setOnboardingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process all passengers
      const updatePromises = passengersToOnboard.map(async (booking) => {
        try {
          const response = await fetch(`/api/admin/bookings/${booking._id}/onboarded`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ onBoarded: true }),
          });

          if (response.ok) {
            successCount++;
            return { success: true };
          } else {
            errorCount++;
            return { success: false };
          }
        } catch (error) {
          errorCount++;
          return { success: false };
        }
      });

      await Promise.all(updatePromises);

      // Refresh manifest to ensure UI is up to date
      if (currentManifestTrip?._id) {
        await fetchTripManifest(currentManifestTrip._id);
      }

      if (errorCount === 0) {
        toast({
          title: 'Success',
          description: `Successfully onboarded all ${successCount} passenger(s)`,
        });
      } else if (successCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Onboarded ${successCount} passenger(s), ${errorCount} failed`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to onboard passengers. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to onboard passengers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setOnboardingAll(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'pending' ? 'secondary' : status === 'completed' ? 'success' : 'destructive'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  const columns: Column<Trip>[] = [
    {
      key: 'checkbox',
      header: (
        <Checkbox
          checked={checkAllStatus}
          onCheckedChange={handleCheckAll}
        />
      ),
      cell: (row) => (
        <Checkbox
          checked={selectedRecordIds.includes(row._id)}
          onCheckedChange={(checked) => handleRecordSelection(row._id, checked as boolean)}
        />
      ),
    },
    { key: 'title', header: 'Title', cell: (row) => row.title || 'N/A' },
    { key: 'tripDate', header: 'Trip Date', cell: (row) => row.tripDate || 'N/A' },
    { 
      key: 'time', 
      header: 'Time',
      cell: (row) => {
        if (row.isWalkIn) {
          return (
            <span>
              <span className="text-orange-600 font-semibold">Walk-In</span>
              {row.walkInTimeSlot && (
                <span className="text-gray-500 text-xs"> ({row.walkInTimeSlot})</span>
              )}
            </span>
          );
        }
        return row.time || 'N/A';
      }
    },
    { 
      key: 'type', 
      header: 'Type',
      cell: (row) => {
        if (row.isWalkIn) {
          return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Walk-In</Badge>;
        }
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      }
    },
    { 
      key: 'route', 
      header: 'Route', 
      cell: (row) => row.route?.title || 'N/A'
    },
    { 
      key: 'driver', 
      header: 'TO', 
      cell: (row) => row.driver 
        ? `${row.driver.firstName || ''} ${row.driver.lastName || ''}` 
        : 'N/A' 
    },
    { key: 'busNo', header: 'Assigned Bus', cell: (row) => row.busNo || 'N/A' },
    { 
      key: 'availableSeats', 
      header: 'Available Seats',
      cell: (row) => {
        if (row.isWalkIn) {
          return row.availableSeats || 0;
        }
        const totalSeats = row.route?.bus?.seats || 0;
        const bookedSeats = row.seats?.length || 0;
        return totalSeats - bookedSeats;
      }
    },
    { 
      key: 'status', 
      header: 'Status', 
      cell: (row) => getStatusBadge(row.status)
    },
    { key: 'createdAt', header: 'Created On', cell: (row) => formatDate(row.createdAt) },
  ];

  const actions = (row: Trip) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleOpenDialog(row)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenManifest(row)}>
          View Manifest
        </DropdownMenuItem>
        {row.status === 'pending' && (
          <DropdownMenuItem onClick={() => handleMarkTripStatus(row._id, 'completed')}>
            Mark trip as completed
          </DropdownMenuItem>
        )}
        {row.status !== 'pending' && (
          <DropdownMenuItem onClick={() => handleMarkTripStatus(row._id, 'pending')}>
            Mark trip as pending
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={() => handleDeleteClick(row._id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trips</h1>
          <p className="text-muted-foreground">
            All Trips: <span className="font-semibold">{pagination.total}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams();
              
              // Add date range
              if (fromDateFilter) {
                const fromDate = new Date(fromDateFilter);
                fromDate.setHours(0, 0, 0, 0);
                params.append('from', fromDate.toISOString());
              }
              if (toDateFilter) {
                const toDate = new Date(toDateFilter);
                toDate.setHours(23, 59, 59, 999);
                params.append('to', toDate.toISOString());
              }
              
              // Add filters
              if (statusFilter !== 'all') params.append('status', statusFilter);
              if (routeFilter !== 'all') params.append('route', routeFilter);
              
              const exportUrl = `/api/admin/export/trips?${params.toString()}`;
              window.open(exportUrl, '_blank');
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline"
            onClick={handleBulkDelete}
            disabled={selectedRecordIds.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add new trip
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters Section */}
          <div className="mb-4 space-y-4 mt-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route._id} value={route._id}>
                      {route.title || `${route.origin} - ${route.destination}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !fromDateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDateFilter ? format(fromDateFilter, "PPP") : <span>From Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDateFilter}
                    onSelect={setFromDateFilter}
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
                      !toDateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDateFilter ? format(toDateFilter, "PPP") : <span>To Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDateFilter}
                    onSelect={setToDateFilter}
                    initialFocus
                    disabled={(date) => fromDateFilter ? date < fromDateFilter : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={trips}
            loading={loading}
            pagination={pagination}
            onPageChange={(newPage) => {
              setPage(newPage);
            }}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            searchable={true}
            onSearch={(search) => {
              setSearchTerm(search);
              setPage(1); // Reset to first page when searching
            }}
            actions={actions}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Trip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrip ? 'Edit' : 'Add'} Trip</DialogTitle>
            <DialogDescription>
              {editingTrip ? 'Update trip details' : 'Create a new trip'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route *</Label>
              <Select
                value={formData.route}
                onValueChange={handleRouteChange}
              >
                <SelectTrigger id="route">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route._id} value={route._id}>
                      {route.title || `${route.origin} - ${route.destination}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.route && (
                <p className="text-sm text-destructive">{formErrors.route}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Trip title (auto-filled from route)"
              />
              {formErrors.title && (
                <p className="text-sm text-destructive">{formErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver">TO (Transport Officer)</Label>
              <Select
                value={formData.driver}
                onValueChange={(value) => setFormData({ ...formData, driver: value })}
              >
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Select a TO" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver._id} value={driver._id}>
                      {driver.firstName} {driver.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripDate">Trip Date *</Label>
              <Input
                id="tripDate"
                type="date"
                value={formData.tripDate ? formData.tripDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, tripDate: e.target.value ? new Date(e.target.value) : undefined })}
              />
              {formErrors.tripDate && (
                <p className="text-sm text-destructive">{formErrors.tripDate}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isWalkIn"
                checked={formData.isWalkIn}
                onCheckedChange={(checked) => setFormData({ ...formData, isWalkIn: checked as boolean, time: '', walkInTimeSlot: '', capacity: '' })}
              />
              <label
                htmlFor="isWalkIn"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Walk-In Bus (No time slot, no seat plan)
              </label>
            </div>

            {!formData.isWalkIn && (
              <div className="space-y-2">
                <Label htmlFor="time">Departure time *</Label>
                <Input
                  id="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="Departure time (e.g., 08:00)"
                />
                {formErrors.time && (
                  <p className="text-sm text-destructive">{formErrors.time}</p>
                )}
              </div>
            )}

            {formData.isWalkIn && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="walkInTimeSlot">Walk-In Time Slot (Optional)</Label>
                  <Input
                    id="walkInTimeSlot"
                    value={formData.walkInTimeSlot}
                    onChange={(e) => setFormData({ ...formData, walkInTimeSlot: e.target.value })}
                    placeholder="Time slot for organization (e.g., Morning, Afternoon, Evening)"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is for display/organization purposes only. Walk-in buses have no fixed departure time.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="Bus capacity (optional, defaults to route bus capacity)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default capacity from the route's bus type.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="busNo">Bus No. *</Label>
              <Input
                id="busNo"
                value={formData.busNo}
                onChange={(e) => setFormData({ ...formData, busNo: e.target.value })}
                placeholder="Bus Number"
              />
              {formErrors.busNo && (
                <p className="text-sm text-destructive">{formErrors.busNo}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trip Manifest Dialog */}
      <Dialog open={manifestDialogOpen} onOpenChange={setManifestDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Trip Manifest</DialogTitle>
            <DialogDescription>
              View and manage passengers for this trip
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Trip Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Trip Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trip</p>
                      <p className="font-semibold">{currentManifestTrip?.title || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trip Date</p>
                      <p className="font-semibold">{currentManifestTrip?.tripDate || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trip Time</p>
                      <p className="font-semibold">
                        {currentManifestTrip?.isWalkIn 
                          ? <Badge variant="secondary" className="bg-orange-100 text-orange-800">Walk-In</Badge>
                          : currentManifestTrip?.time || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-semibold">{currentManifestTrip?.route?.title || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Passengers</p>
                      <p className="font-semibold text-lg">{manifestBookings.length}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <UserCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Onboarded</p>
                      <p className="font-semibold text-lg text-green-600">
                        {manifestBookings.filter(b => b.onBoarded).length} / {manifestBookings.length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manifest Update Card */}
            <Card>
              <CardHeader>
                <CardTitle>Manifest Details</CardTitle>
                <CardDescription>Update transport officer and vehicle information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transportOfficer">Transport Officer</Label>
                    <Select
                      value={manifestFormData.selectedDriverId}
                      onValueChange={(value) => setManifestFormData({ ...manifestFormData, selectedDriverId: value })}
                    >
                      <SelectTrigger id="transportOfficer">
                        <SelectValue placeholder="Select Transport Officer" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver._id} value={driver._id}>
                            {driver.firstName} {driver.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleNo">Vehicle Number</Label>
                    <Input
                      id="vehicleNo"
                      value={manifestFormData.vehicleNo}
                      onChange={(e) => setManifestFormData({ ...manifestFormData, vehicleNo: e.target.value })}
                      placeholder="Enter vehicle number"
                    />
                  </div>
                </div>
                <Button onClick={handleUpdateManifest} className="mt-4 w-full md:w-auto">
                  Update Manifest Info
                </Button>
              </CardContent>
            </Card>

            {/* Passengers Table Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Passengers ({manifestBookings.length})
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Manage passenger onboard status
                    </CardDescription>
                  </div>
                  {manifestBookings.length > 0 && (
                    <Button
                      onClick={handleOnboardAll}
                      disabled={onboardingAll}
                      variant="default"
                      className="gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      {onboardingAll ? 'Onboarding...' : 'Onboard All'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {manifestBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No passengers found for this trip.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Booking ID</TableHead>
                          <TableHead>Passenger Name</TableHead>
                          <TableHead className="w-[130px]">Phone</TableHead>
                          <TableHead className="w-[150px]">Destination</TableHead>
                          <TableHead className="w-[100px]">Seat No.</TableHead>
                          <TableHead className="w-[180px]">Emergency Contact</TableHead>
                          <TableHead className="w-[120px] text-center">On-Boarded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manifestBookings.map((booking) => (
                          <TableRow key={booking._id}>
                            <TableCell className="font-medium">{booking.bookingId}</TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {booking.firstName} {booking.middleName || ''} {booking.lastName}
                              </div>
                            </TableCell>
                            <TableCell>{booking.phone}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{booking.to || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {booking.tripSeat && (
                                  <Badge variant="secondary">{booking.tripSeat}</Badge>
                                )}
                                {booking.returnSeat && (
                                  <Badge variant="secondary">{booking.returnSeat}</Badge>
                                )}
                                {!booking.tripSeat && !booking.returnSeat && (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {booking.emergencyFirstName} {booking.emergencyLastName}
                                </div>
                                <div className="text-muted-foreground">{booking.emergencyPhone}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={booking.onBoarded || false}
                                onCheckedChange={(checked) => handleUpdateOnBoarded(booking._id, checked as boolean)}
                                className="mx-auto"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

