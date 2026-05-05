'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Plus, MoreHorizontal, Edit, Trash2, CalendarIcon, Users, MapPin, Clock, Bus, UserCheck, Printer, FileText, ImageIcon, UserMinus } from 'lucide-react';
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
import { useHasPermission, useIsSuperAdmin } from '@/hooks/use-permissions';
import { useIsSM } from '@/hooks/use-role';
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
  /** Counter maintained by booking create/cancel (not `trip.seats`). */
  availableSeats?: number;
  /** Reschedule holds — subtract non-expired entries for “bookable now”, same as booking.controller */
  heldSeats?: { expiresAt: string | Date }[];
  seats?: string[];
  status: string;
  createdAt: string;
}

/** Effective seats left using booking-maintained `availableSeats` minus active reschedule holds. */
function getBookableSeatCount(trip: Trip): number | null {
  const raw = trip.availableSeats;
  if (raw == null || (typeof raw === 'string' && raw === '')) return null;
  const base = Number(raw);
  if (Number.isNaN(base)) return null;
  const now = Date.now();
  const activeHolds = (trip.heldSeats ?? []).filter(
    (h) => h?.expiresAt != null && new Date(h.expiresAt).getTime() > now
  ).length;
  return Math.max(0, base - activeHolds);
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
  const [manifestDownloadLoading, setManifestDownloadLoading] = useState(false);
  const [luggagePricePerKg, setLuggagePricePerKg] = useState(120);
  const [manifestExcludedBookingIds, setManifestExcludedBookingIds] = useState<string[]>([]);
  const [excludedBookingsPreview, setExcludedBookingsPreview] = useState<
    { _id: string; bookingId?: string; firstName?: string; lastName?: string; phone?: string }[]
  >([]);
  const [manifestExtraPassengers, setManifestExtraPassengers] = useState<
    { localId: string; firstName: string; lastName: string; phone: string; from: string; to: string; seat: string; onBoarded: boolean }[]
  >([]);
  const [manifestLuggage, setManifestLuggage] = useState<
    {
      targetType: 'booking' | 'extra';
      bookingId?: string;
      extraPassengerLocalId?: string;
      kgs: number;
      paymentMethod: '' | 'cash' | 'transfer';
    }[]
  >([]);
  const [manifestWaybills, setManifestWaybills] = useState<
    { localId: string; label: string; kgs: number; paymentMethod: '' | 'cash' | 'transfer' }[]
  >([]);
  const [manifestStats, setManifestStats] = useState<{
    totalManifestRows?: number;
    totalOnboarded?: number;
    totalLuggageKgs?: number;
    totalLuggageAmount?: number;
    totalWaybillKgs?: number;
    totalWaybillAmount?: number;
    totalBookingFare?: number;
    grandTotalFare?: number;
  } | null>(null);
  const [manifestSaving, setManifestSaving] = useState(false);
  const [addPassengerOpen, setAddPassengerOpen] = useState(false);
  const [newExtraForm, setNewExtraForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    from: '',
    to: '',
    seat: '',
  });
  const manifestExportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Manifest permissions
  const isSuperAdmin = useIsSuperAdmin();
  const isSM = useIsSM();
  const canClose = useHasPermission('manifests.close');
  const canSubmit = useHasPermission('manifests.submit');

  // Reset to page 1 when filters change (but not when page changes)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, routeFilter, fromDateFilter, toDateFilter, searchTerm]);

  useEffect(() => {
    fetchTrips(page, limit);
    fetchRoutes();
    fetchDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchTrips = async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: currentLimit.toString(),
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
      
      // Helper to safely get a value, ensuring it's never the string "undefined"
      const safeValue = (value: any, fallback: string = '') => {
        if (value === 'undefined' || value === undefined || value === null) return fallback;
        const str = String(value).trim();
        return str === 'undefined' ? fallback : str;
      };
      
      // Parse tripDate from DD-MM-YYYY format to Date object
      const parseTripDate = (dateString: string | undefined): Date | undefined => {
        if (!dateString) return undefined;
        
        // Check if it's DD-MM-YYYY format (e.g., "16-01-2026")
        const ddmmyyyyMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (ddmmyyyyMatch) {
          const [, day, month, year] = ddmmyyyyMatch;
          // Create date in local timezone (month is 0-indexed in JS Date)
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        // Check if it's YYYY-MM-DD format (e.g., "2026-01-16") - for backward compatibility
        const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (yyyymmddMatch) {
          const [, year, month, day] = yyyymmddMatch;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        // Fallback to standard Date parsing
        const parsed = new Date(dateString);
        return isNaN(parsed.getTime()) ? undefined : parsed;
      };
      
      const routeValue = typeof trip.route === 'string' ? trip.route : trip.route?._id;
      const driverValue = typeof trip.driver === 'string' ? trip.driver : trip.driver?._id;
      
      setFormData({
        route: safeValue(routeValue),
        title: safeValue(trip.title),
        driver: safeValue(driverValue),
        tripDate: parseTripDate(trip.tripDate),
        isWalkIn: trip.isWalkIn || false,
        time: safeValue(trip.time),
        walkInTimeSlot: safeValue(trip.walkInTimeSlot),
        capacity: safeValue((trip as any).capacity?.toString()),
        busNo: safeValue(trip.busNo),
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
    // Only validate busNo when creating a new trip, not when editing
    if (!editingTrip && !formData.busNo) errors.busNo = 'Please enter bus number';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Build payload, explicitly excluding _id and undefined values
      const payload: any = {};
      
      // Helper function to safely add a value (excludes undefined, null strings, and "undefined" string)
      const addIfValid = (key: string, value: any) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'undefined' && String(value).trim() !== 'undefined') {
          payload[key] = value;
        }
      };
      
      addIfValid('route', formData.route);
      addIfValid('title', formData.title);
      addIfValid('driver', formData.driver);
      if (formData.tripDate) {
        // Format date as DD-MM-YYYY to match auto-generated trips format
        const day = String(formData.tripDate.getDate()).padStart(2, '0');
        const month = String(formData.tripDate.getMonth() + 1).padStart(2, '0');
        const year = formData.tripDate.getFullYear();
        payload.tripDate = `${day}-${month}-${year}`;
      }
      payload.isWalkIn = formData.isWalkIn;
      
      if (formData.isWalkIn) {
        // For walk-in buses, time should be null, not undefined
        payload.time = null;
        addIfValid('walkInTimeSlot', formData.walkInTimeSlot);
        if (formData.capacity) payload.capacity = parseInt(formData.capacity);
      } else {
        // For regular buses, time is required
        addIfValid('time', formData.time);
      }
      
      addIfValid('busNo', formData.busNo);

      // Explicitly remove _id if it somehow got in there
      delete payload._id;
      
      // Final safety check: remove any fields that are the string "undefined"
      Object.keys(payload).forEach(key => {
        if (payload[key] === 'undefined' || String(payload[key]).trim() === 'undefined') {
          delete payload[key];
        }
      });

      const url = editingTrip 
        ? `/api/admin/trips/${editingTrip._id}`
        : '/api/admin/trips';
      const method = editingTrip ? 'PATCH' : 'POST';

      // Debug log to see what we're sending
      console.log('Sending trip payload:', JSON.stringify(payload, null, 2));

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
      fetchTrips(page, limit);
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
      fetchTrips(page, limit);
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

      fetchTrips(page, limit);
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
      fetchTrips(page, limit);
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
      const response = await fetch(`/api/admin/manifests/${tripId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trip manifest');
      }
      const data = await response.json();
      if (data.success || data.trip) {
        const tripData = data.trip || data;
        // Find the original trip to preserve title and other fields
        const originalTrip = trips.find(t => t._id === tripId);
        setCurrentManifestTrip({
          ...originalTrip,
          ...tripData,
          title: originalTrip?.title || tripData.title,
        });
        if (typeof data.luggagePricePerKg === 'number') {
          setLuggagePricePerKg(data.luggagePricePerKg);
        }
        setManifestExcludedBookingIds(data.manifestExcludedBookingIds || []);
        setExcludedBookingsPreview(data.excludedBookingsPreview || []);
        setManifestExtraPassengers(
          (data.manifestExtraPassengers || []).map((e: any) => ({
            localId: e.localId,
            firstName: e.firstName || '',
            lastName: e.lastName || '',
            phone: e.phone || '',
            from: e.from || '',
            to: e.to || '',
            seat: e.seat || '',
            onBoarded: Boolean(e.onBoarded),
          }))
        );
        setManifestLuggage(
          (data.manifestLuggage || []).map((l: any) => ({
            targetType: l.targetType === 'extra' ? 'extra' : 'booking',
            bookingId: l.bookingId ? String(l.bookingId) : undefined,
            extraPassengerLocalId: l.extraPassengerLocalId || '',
            kgs: Number(l.kgs) || 0,
            paymentMethod: l.paymentMethod === 'transfer' ? 'transfer' : l.paymentMethod === 'cash' ? 'cash' : '',
          }))
        );
        setManifestWaybills(
          (data.manifestWaybills || []).map((w: any) => ({
            localId: w.localId,
            label: w.label || '',
            kgs: Number(w.kgs) || 0,
            paymentMethod: w.paymentMethod === 'transfer' ? 'transfer' : w.paymentMethod === 'cash' ? 'cash' : '',
          }))
        );
        if (data.stats) {
          setManifestStats(data.stats);
        }
        const rows = data.passengerManifest || data.bookings || tripData.bookings || [];
        setManifestBookings(rows);
        
        // Find matching driver if transportOfficerName exists
        let selectedDriverId = '';
        if (tripData?.transportOfficerName && drivers.length > 0) {
          const matchingDriver = drivers.find((d) => {
            const fullName = `${d.firstName} ${d.lastName}`.trim();
            return fullName === tripData.transportOfficerName ||
                   d.firstName === tripData.transportOfficerName ||
                   d.lastName === tripData.transportOfficerName;
          });
          if (matchingDriver) {
            selectedDriverId = matchingDriver._id;
          }
        }
        
        setManifestFormData({
          selectedDriverId,
          vehicleNo: tripData?.vehicleNo || '',
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

  const buildManifestTransportPayload = () => {
    let transportOfficerName = '';
    if (manifestFormData.selectedDriverId && drivers.length > 0) {
      const selectedDriver = drivers.find((d) => d._id === manifestFormData.selectedDriverId);
      if (selectedDriver) {
        transportOfficerName = `${selectedDriver.firstName} ${selectedDriver.lastName}`.trim();
      }
    }
    return {
      transportOfficerName,
      vehicleNo: manifestFormData.vehicleNo,
      manifestExcludedBookingIds,
      manifestExtraPassengers,
      manifestLuggage,
      manifestWaybills,
    };
  };

  const handleSaveManifest = async () => {
    if (!currentManifestTrip?._id) return;
    setManifestSaving(true);
    try {
      const response = await fetch(`/api/admin/manifests/${currentManifestTrip._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildManifestTransportPayload()),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save manifest');
      }

      toast({ title: 'Saved', description: 'Manifest data saved (luggage, waybills, exclusions).' });
      await fetchTripManifest(currentManifestTrip._id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save manifest',
        variant: 'destructive',
      });
    } finally {
      setManifestSaving(false);
    }
  };

  const patchManifestPartial = async (body: Record<string, unknown>) => {
    if (!currentManifestTrip?._id) return;
    const response = await fetch(`/api/admin/manifests/${currentManifestTrip._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Manifest update failed');
    }
    await fetchTripManifest(currentManifestTrip._id);
  };

  const handleRemoveBookingFromManifest = async (bookingMongoId: string) => {
    if (!currentManifestTrip?._id) return;
    if (!confirm('Remove this passenger from the manifest view only? Booking records are unchanged.')) return;
    try {
      const next = [...new Set([...manifestExcludedBookingIds, bookingMongoId])];
      await patchManifestPartial({ manifestExcludedBookingIds: next });
      toast({ title: 'Removed from manifest', description: 'Passenger can be restored from the excluded list.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRestoreExcludedBooking = async (bookingMongoId: string) => {
    try {
      const next = manifestExcludedBookingIds.filter((id) => id !== bookingMongoId);
      await patchManifestPartial({ manifestExcludedBookingIds: next });
      toast({ title: 'Restored', description: 'Passenger is back on the manifest.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveExtraPassenger = async (localId: string) => {
    if (!confirm('Remove this manifest-only passenger from the list?')) return;
    try {
      const nextExtras = manifestExtraPassengers.filter((e) => e.localId !== localId);
      const lugNext = manifestLuggage.filter(
        (l) => !(l.targetType === 'extra' && l.extraPassengerLocalId === localId)
      );
      setManifestLuggage(lugNext);
      await patchManifestPartial({ manifestExtraPassengers: nextExtras, manifestLuggage: lugNext });
      toast({ title: 'Removed', description: 'Manifest-only passenger removed.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddManifestPassenger = async () => {
    if (!newExtraForm.firstName.trim() || !newExtraForm.lastName.trim()) {
      toast({
        title: 'Validation',
        description: 'First and last name are required.',
        variant: 'destructive',
      });
      return;
    }
    const localId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `mp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const next = [
      ...manifestExtraPassengers,
      {
        localId,
        firstName: newExtraForm.firstName.trim(),
        lastName: newExtraForm.lastName.trim(),
        phone: newExtraForm.phone.trim(),
        from: newExtraForm.from.trim(),
        to: newExtraForm.to.trim(),
        seat: newExtraForm.seat.trim(),
        onBoarded: false,
      },
    ];
    try {
      await patchManifestPartial({ manifestExtraPassengers: next });
      setAddPassengerOpen(false);
      setNewExtraForm({ firstName: '', lastName: '', phone: '', from: '', to: '', seat: '' });
      toast({ title: 'Added', description: 'Manifest-only passenger added.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateLuggageForPassenger = (
    row: any,
    patch: { kgs?: number; paymentMethod?: '' | 'cash' | 'transfer' }
  ) => {
    const targetType = row.rowKind === 'extra' ? 'extra' : 'booking';
    const keyBooking = row.rowKind === 'booking' ? String(row._id) : '';
    const keyExtra = row.rowKind === 'extra' ? row.localId : '';

    const others = manifestLuggage.filter((l) => {
      if (targetType === 'booking') {
        return !(l.targetType === 'booking' && l.bookingId === keyBooking);
      }
      return !(l.targetType === 'extra' && l.extraPassengerLocalId === keyExtra);
    });

    const prev = manifestLuggage.find((l) =>
      targetType === 'booking'
        ? l.targetType === 'booking' && l.bookingId === keyBooking
        : l.targetType === 'extra' && l.extraPassengerLocalId === keyExtra
    );

    const kgs = patch.kgs !== undefined ? patch.kgs : prev?.kgs ?? 0;
    const paymentMethod =
      patch.paymentMethod !== undefined ? patch.paymentMethod : prev?.paymentMethod ?? '';

    const entry = {
      targetType: targetType as 'booking' | 'extra',
      bookingId: targetType === 'booking' ? keyBooking : undefined,
      extraPassengerLocalId: targetType === 'extra' ? keyExtra : '',
      kgs: Math.max(0, Number(kgs) || 0),
      paymentMethod: (paymentMethod || '') as '' | 'cash' | 'transfer',
    };

    setManifestLuggage([...others, entry]);
  };

  const manifestTotalsLocal = useMemo(() => {
    const fareSum = manifestBookings.reduce((acc: number, row: any) => {
      if (row.rowKind === 'extra') return acc;
      return acc + (Number(row.amount) || 0);
    }, 0);
    let luggageAmt = 0;
    let luggageKgs = 0;
    for (const l of manifestLuggage) {
      const k = Number(l.kgs) || 0;
      if (k <= 0) continue;
      luggageKgs += k;
      luggageAmt += Math.round(k * luggagePricePerKg);
    }
    let waybillAmt = 0;
    let waybillKgs = 0;
    for (const w of manifestWaybills) {
      const k = Number(w.kgs) || 0;
      if (k <= 0) continue;
      waybillKgs += k;
      waybillAmt += Math.round(k * luggagePricePerKg);
    }
    const onboard = manifestBookings.filter((r: any) => r.onBoarded).length;
    return {
      fareSum,
      luggageAmt,
      luggageKgs,
      waybillAmt,
      waybillKgs,
      grand: fareSum + luggageAmt + waybillAmt,
      onboard,
    };
  }, [manifestBookings, manifestLuggage, manifestWaybills, luggagePricePerKg]);

  const triggerFileDownload = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const handleManifestDownload = async (format: 'csv' | 'html') => {
    if (!currentManifestTrip?._id) return;

    setManifestDownloadLoading(true);
    try {
      const response = await fetch(`/api/admin/manifests/${currentManifestTrip._id}/download?format=${format}&disposition=attachment`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to download manifest' }));
        throw new Error(errorData.error || 'Failed to download manifest');
      }

      const blob = await response.blob();
      const extension = format === 'html' ? 'html' : 'csv';
      const fileName = `manifest_${currentManifestTrip._id}.${extension}`;
      triggerFileDownload(blob, fileName);

      toast({
        title: 'Manifest Downloaded',
        description: `Downloaded ${format.toUpperCase()} manifest successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download manifest',
        variant: 'destructive',
      });
    } finally {
      setManifestDownloadLoading(false);
    }
  };

  const handleManifestPrint = () => {
    if (!currentManifestTrip?._id) return;
    const printUrl = `/api/admin/manifests/${currentManifestTrip._id}/download?format=html&disposition=inline&printer=mobile&print=1`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  };

  const handleUpdateOnBoarded = async (row: any, onBoarded: boolean) => {
    if (row.rowKind === 'extra' && row.localId) {
      try {
        const next = manifestExtraPassengers.map((e) =>
          e.localId === row.localId ? { ...e, onBoarded } : e
        );
        await patchManifestPartial({ manifestExtraPassengers: next });
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
      return;
    }

    const bookingId = row._id;
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

      setManifestBookings((prev) =>
        prev.map((booking) =>
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
    if (manifestBookings.length === 0) {
      toast({
        title: 'No Passengers',
        description: 'No passengers found for this trip',
        variant: 'destructive',
      });
      return;
    }

    const bookingRows = manifestBookings.filter(
      (b: any) => b.rowKind !== 'extra' && !b.onBoarded
    );
    const extraRows = manifestBookings.filter((b: any) => b.rowKind === 'extra' && !b.onBoarded);

    if (bookingRows.length === 0 && extraRows.length === 0) {
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
      const bookingPromises = bookingRows.map(async (booking: any) => {
        try {
          const response = await fetch(`/api/admin/bookings/${booking._id}/onboarded`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onBoarded: true }),
          });
          if (response.ok) {
            successCount++;
            return true;
          }
          errorCount++;
          return false;
        } catch {
          errorCount++;
          return false;
        }
      });

      await Promise.all(bookingPromises);

      if (extraRows.length > 0) {
        try {
          const nextExtras = manifestExtraPassengers.map((e) => ({ ...e, onBoarded: true }));
          await patchManifestPartial({ manifestExtraPassengers: nextExtras });
          successCount += extraRows.length;
        } catch {
          errorCount += extraRows.length;
        }
      } else if (currentManifestTrip?._id) {
        await fetchTripManifest(currentManifestTrip._id);
      }

      if (errorCount === 0) {
        toast({
          title: 'Success',
          description: `Successfully onboarded ${successCount} passenger(s)`,
        });
      } else if (successCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Onboarded ${successCount}, ${errorCount} failed`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to onboard passengers. Please try again.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to onboard passengers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setOnboardingAll(false);
    }
  };

  const handleExportManifestImage = async (mime: 'image/png' | 'image/jpeg') => {
    if (!manifestExportRef.current || !currentManifestTrip?._id) return;
    try {
      const canvas = await html2canvas(manifestExportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const url = canvas.toDataURL(mime, mime === 'image/jpeg' ? 0.92 : undefined);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manifest_${currentManifestTrip._id}.${mime === 'image/jpeg' ? 'jpg' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: 'Downloaded', description: 'Manifest image export ready.' });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error?.message || 'Could not create image',
        variant: 'destructive',
      });
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
        const n = getBookableSeatCount(row);
        return n == null ? '—' : n;
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
            onClick={async () => {
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

              try {
                const res = await fetch('/api/admin/exports', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'trips',
                    params: Object.fromEntries(params.entries()),
                    format: 'xlsx',
                  }),
                });

                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.message || data.error || 'Failed to start export');
                }

                toast({
                  title: 'Export started',
                  description: 'Your trips export is generating. You can continue working and download it from the Exports icon.',
                });
              } catch (error: any) {
                toast({
                  title: 'Export failed to start',
                  description: error.message || 'Please try again',
                  variant: 'destructive',
                });
              }
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
              // Only update if the page actually changed
              if (newPage !== page) {
                setPage(newPage);
                // Immediately update pagination to prevent flicker
                setPagination(prev => ({ ...prev, page: newPage }));
              }
            }}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            searchable={true}
            onSearch={(search) => {
              setSearchTerm(search);
              // Only reset to page 1 if search term actually changed (not empty to empty)
              if (search !== searchTerm && (search || searchTerm)) {
                setPage(1);
              }
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
              <Label htmlFor="busNo">Bus No. {!editingTrip && '*'}</Label>
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
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManifestDownload('csv')}
                disabled={manifestDownloadLoading || !currentManifestTrip?._id}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManifestDownload('html')}
                disabled={manifestDownloadLoading || !currentManifestTrip?._id}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Download HTML
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleManifestPrint}
                disabled={!currentManifestTrip?._id}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print (Mobile)
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => handleExportManifestImage('image/png')}
                disabled={!currentManifestTrip?._id}
                className="gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => handleExportManifestImage('image/jpeg')}
                disabled={!currentManifestTrip?._id}
                className="gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                JPG
              </Button>
            </div>
          </DialogHeader>
          
          <div ref={manifestExportRef} className="flex-1 overflow-y-auto space-y-4 pr-2 bg-background">
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
                      <p className="text-sm text-muted-foreground">Listed passengers</p>
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
                        {manifestTotalsLocal.onboard} / {manifestBookings.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Luggage rate</p>
                      <p className="font-semibold">₦{luggagePricePerKg.toLocaleString()} / kg</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manifest Update Card */}
            <Card>
              <CardHeader>
                <CardTitle>Manifest Details</CardTitle>
                <CardDescription>Transport officer, vehicle, luggage, waybills — save to persist.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transportOfficer">Transport Officer</Label>
                    <Select
                      value={manifestFormData.selectedDriverId}
                      onValueChange={(value) => setManifestFormData({ ...manifestFormData, selectedDriverId: value })}
                      disabled={currentManifestTrip?.isLocked}
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
                      disabled={currentManifestTrip?.isLocked}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveManifest}
                  className="mt-4 w-full md:w-auto"
                  disabled={manifestSaving || currentManifestTrip?.isLocked}
                >
                  {manifestSaving ? 'Saving…' : 'Save manifest'}
                </Button>
              </CardContent>
            </Card>

            {/* Passengers Table Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Passengers ({manifestBookings.length})
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Onboard status, luggage (kg × ₦{luggagePricePerKg}/kg). Save manifest to persist luggage &amp; waybills.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAddPassengerOpen(true)}
                      disabled={currentManifestTrip?.isLocked}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add passenger (manifest only)
                    </Button>
                    {manifestBookings.length > 0 && (
                      <Button
                        onClick={handleOnboardAll}
                        disabled={onboardingAll || currentManifestTrip?.isLocked}
                        variant="default"
                        size="sm"
                        className="gap-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        {onboardingAll ? 'Onboarding...' : 'Onboard All'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {manifestBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No passengers on this manifest. Add a manifest-only passenger or restore excluded bookings.</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Booking ID</TableHead>
                          <TableHead className="min-w-[140px]">Passenger</TableHead>
                          <TableHead className="min-w-[100px]">Phone</TableHead>
                          <TableHead className="min-w-[100px]">To</TableHead>
                          <TableHead className="min-w-[80px]">Seat</TableHead>
                          <TableHead className="min-w-[120px]">Fare</TableHead>
                          <TableHead className="min-w-[70px]">Luggage kg</TableHead>
                          <TableHead className="min-w-[110px]">Payment</TableHead>
                          <TableHead className="min-w-[90px]">Luggage ₦</TableHead>
                          <TableHead className="text-center min-w-[90px]">Onboard</TableHead>
                          <TableHead className="min-w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manifestBookings.map((row: any) => {
                          const lugEntry = manifestLuggage.find((l) =>
                            row.rowKind === 'extra'
                              ? l.targetType === 'extra' && l.extraPassengerLocalId === row.localId
                              : l.targetType === 'booking' && l.bookingId === String(row._id)
                          );
                          const kgs = lugEntry?.kgs ?? row.luggageKgs ?? 0;
                          const pay = lugEntry?.paymentMethod ?? row.luggagePaymentMethod ?? '';
                          const lugAmt = Math.round((Number(kgs) || 0) * luggagePricePerKg);
                          return (
                            <TableRow key={String(row._id)}>
                              <TableCell className="font-mono text-xs">
                                {row.rowKind === 'extra' ? (
                                  <Badge variant="secondary">MANIFEST</Badge>
                                ) : (
                                  row.bookingId
                                )}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {row.firstName} {row.middleName || ''} {row.lastName}
                              </TableCell>
                              <TableCell className="text-sm">{row.phone || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{row.to || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.tripSeat || row.returnSeat || '—'}
                              </TableCell>
                              <TableCell>₦{(Number(row.amount) || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-8 w-20"
                                  value={kgs || ''}
                                  disabled={currentManifestTrip?.isLocked}
                                  onChange={(e) =>
                                    updateLuggageForPassenger(row, {
                                      kgs: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={pay || '__none__'}
                                  onValueChange={(v) =>
                                    updateLuggageForPassenger(row, {
                                      paymentMethod:
                                        v === 'cash' ? 'cash' : v === 'transfer' ? 'transfer' : '',
                                    })
                                  }
                                  disabled={currentManifestTrip?.isLocked}
                                >
                                  <SelectTrigger className="h-8 w-[130px]">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">—</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="transfer">Transfer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                ₦{lugAmt.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={row.onBoarded || false}
                                  disabled={currentManifestTrip?.isLocked}
                                  onCheckedChange={(checked) =>
                                    handleUpdateOnBoarded(row, checked as boolean)
                                  }
                                  className="mx-auto"
                                />
                              </TableCell>
                              <TableCell>
                                {row.rowKind === 'extra' ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    disabled={currentManifestTrip?.isLocked}
                                    onClick={() => handleRemoveExtraPassenger(row.localId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    title="Remove from manifest only"
                                    disabled={currentManifestTrip?.isLocked}
                                    onClick={() => handleRemoveBookingFromManifest(String(row._id))}
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {excludedBookingsPreview.length > 0 && (
                  <div className="rounded-md border border-dashed p-3 text-sm">
                    <p className="font-medium mb-2">Excluded from manifest (bookings unchanged)</p>
                    <ul className="space-y-1">
                      {excludedBookingsPreview.map((ex) => (
                        <li key={ex._id} className="flex flex-wrap justify-between gap-2 items-center">
                          <span>
                            {ex.bookingId} — {ex.firstName} {ex.lastName}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={currentManifestTrip?.isLocked}
                            onClick={() => handleRestoreExcludedBooking(ex._id)}
                          >
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waybills */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-lg">Waybills</CardTitle>
                    <CardDescription>Same per-kg rate as luggage. Save manifest to persist.</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentManifestTrip?.isLocked}
                    onClick={() =>
                      setManifestWaybills((w) => [
                        ...w,
                        {
                          localId:
                            typeof crypto !== 'undefined' && crypto.randomUUID
                              ? crypto.randomUUID()
                              : `wb_${Date.now()}`,
                          label: '',
                          kgs: 0,
                          paymentMethod: '',
                        },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add waybill
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {manifestWaybills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No waybills yet.</p>
                ) : (
                  <div className="space-y-3">
                    {manifestWaybills.map((w) => (
                      <div key={w.localId} className="flex flex-wrap gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            className="h-9 w-40"
                            value={w.label}
                            disabled={currentManifestTrip?.isLocked}
                            onChange={(e) =>
                              setManifestWaybills((prev) =>
                                prev.map((x) =>
                                  x.localId === w.localId ? { ...x, label: e.target.value } : x
                                )
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Kg</Label>
                          <Input
                            type="number"
                            min={0}
                            className="h-9 w-24"
                            value={w.kgs || ''}
                            disabled={currentManifestTrip?.isLocked}
                            onChange={(e) =>
                              setManifestWaybills((prev) =>
                                prev.map((x) =>
                                  x.localId === w.localId
                                    ? { ...x, kgs: parseFloat(e.target.value) || 0 }
                                    : x
                                )
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Payment</Label>
                          <Select
                            value={w.paymentMethod || '__none__'}
                            onValueChange={(v) =>
                              setManifestWaybills((prev) =>
                                prev.map((x) =>
                                  x.localId === w.localId
                                    ? {
                                        ...x,
                                        paymentMethod:
                                          v === 'cash' ? 'cash' : v === 'transfer' ? 'transfer' : '',
                                      }
                                    : x
                                )
                              )
                            }
                            disabled={currentManifestTrip?.isLocked}
                          >
                            <SelectTrigger className="h-9 w-[130px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-sm pb-2 text-muted-foreground">
                          ₦{Math.round((Number(w.kgs) || 0) * luggagePricePerKg).toLocaleString()}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={currentManifestTrip?.isLocked}
                          onClick={() =>
                            setManifestWaybills((prev) => prev.filter((x) => x.localId !== w.localId))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Totals</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Booking fare (listed)</p>
                  <p className="font-semibold text-lg">₦{manifestTotalsLocal.fareSum.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Luggage ({manifestTotalsLocal.luggageKgs} kg)</p>
                  <p className="font-semibold text-lg">₦{manifestTotalsLocal.luggageAmt.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Waybills ({manifestTotalsLocal.waybillKgs} kg)</p>
                  <p className="font-semibold text-lg">₦{manifestTotalsLocal.waybillAmt.toLocaleString()}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t">
                  <p className="text-muted-foreground">Grand total (fare + luggage + waybills)</p>
                  <p className="font-bold text-xl">₦{manifestTotalsLocal.grand.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Manifest Actions (Close/Submit) */}
            {(isSM || isSuperAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle>Manifest Actions</CardTitle>
                  <CardDescription>
                    Close and submit manifest to QuickBooks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentManifestTrip?.isLocked ? (
                    <div className="text-sm text-muted-foreground p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-semibold text-yellow-800 mb-1">Manifest is Locked</p>
                      <p>This manifest has been submitted and cannot be edited.</p>
                      {currentManifestTrip?.submittedAt && (
                        <p className="mt-2 text-xs">
                          Submitted on: {new Date(currentManifestTrip.submittedAt).toLocaleString()}
                        </p>
                      )}
                      {currentManifestTrip?.financialData && (
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <p className="font-semibold text-sm mb-1">Financial Summary:</p>
                          <div className="text-xs space-y-1">
                            <p>Total Revenue: ₦{currentManifestTrip.financialData.totalRevenue?.toLocaleString() || 0}</p>
                            <p>Total Fare: ₦{currentManifestTrip.financialData.totalFare?.toLocaleString() || 0}</p>
                            <p>Luggage Fees: ₦{currentManifestTrip.financialData.luggageFees?.toLocaleString() || 0}</p>
                            <p>Waybill Fees: ₦{currentManifestTrip.financialData.waybillFees?.toLocaleString() || 0}</p>
                            <p>Bookings: {currentManifestTrip.financialData.bookingCount || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {(canClose || isSuperAdmin) && (
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            if (!currentManifestTrip?._id) return;
                            if (!confirm('Are you sure you want to close this manifest? This will prevent further passenger check-ins.')) {
                              return;
                            }
                            try {
                              const res = await fetch(`/api/admin/manifests/${currentManifestTrip._id}/close`, {
                                method: 'POST',
                                credentials: 'include'
                              });
                              if (res.ok) {
                                toast({
                                  title: 'Success',
                                  description: 'Manifest closed successfully',
                                });
                                await fetchTripManifest(currentManifestTrip._id);
                              } else {
                                throw new Error('Failed to close manifest');
                              }
                            } catch (error: any) {
                              toast({
                                title: 'Error',
                                description: error.message || 'Failed to close manifest',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          Close Manifest
                        </Button>
                      )}
                      {(canSubmit || isSuperAdmin) && (
                        <Button 
                          onClick={async () => {
                            if (!currentManifestTrip?._id) return;
                            if (!confirm('Are you sure you want to submit this manifest to QuickBooks? This will lock the manifest and prevent further edits.')) {
                              return;
                            }
                            try {
                              const res = await fetch(`/api/admin/manifests/${currentManifestTrip._id}/submit`, {
                                method: 'POST',
                                credentials: 'include'
                              });
                              if (res.ok) {
                                const data = await res.json();
                                toast({
                                  title: 'Success',
                                  description: `Manifest submitted successfully! Total Revenue: ₦${data.financialData?.totalRevenue?.toLocaleString() || 0}`,
                                });
                                await fetchTripManifest(currentManifestTrip._id);
                              } else {
                                throw new Error('Failed to submit manifest');
                              }
                            } catch (error: any) {
                              toast({
                                title: 'Error',
                                description: error.message || 'Failed to submit manifest',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          Submit to QuickBooks
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addPassengerOpen} onOpenChange={setAddPassengerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add manifest-only passenger</DialogTitle>
            <DialogDescription>
              Does not create a booking—used when a passenger moved from another bus.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input
                  value={newExtraForm.firstName}
                  onChange={(e) => setNewExtraForm({ ...newExtraForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input
                  value={newExtraForm.lastName}
                  onChange={(e) => setNewExtraForm({ ...newExtraForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newExtraForm.phone}
                onChange={(e) => setNewExtraForm({ ...newExtraForm, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  value={newExtraForm.from}
                  onChange={(e) => setNewExtraForm({ ...newExtraForm, from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  value={newExtraForm.to}
                  onChange={(e) => setNewExtraForm({ ...newExtraForm, to: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Seat</Label>
              <Input
                value={newExtraForm.seat}
                onChange={(e) => setNewExtraForm({ ...newExtraForm, seat: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddPassengerOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddManifestPassenger}>
              Add to manifest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

