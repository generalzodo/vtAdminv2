'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, MoreHorizontal, Edit, Trash2, Plus, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface Bus {
  _id: string;
  title: string;
}

interface Location {
  _id: string;
  title: string;
}

interface Route {
  _id: string;
  title: string;
  origin: string;
  destination: string;
  bus: Bus | string;
  recurrentDays: string[];
  times: string[];
  stops?: string[];
  price?: number;
  premiumPrice?: number;
  discountedPrice?: number;
  totalTrips: number;
  markForFullPrice?: boolean;
  createdAt: string;
}

const daysOfWeek = [
  { value: 'Sunday', label: 'Sunday' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
];

const timeSlots = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM'
];

// View Stops Content Component
function ViewStopsContent({ routeId, onClose }: { routeId: string; onClose: () => void }) {
  const [subroutes, setSubroutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subrouteDialogOpen, setSubrouteDialogOpen] = useState(false);
  const [editingSubroute, setEditingSubroute] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubrouteId, setDeletingSubrouteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    stop: '',
    times: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (routeId && routeId.trim() !== '') {
      fetchSubroutes();
      fetchLocations();
    } else {
      setLoading(false);
      setSubroutes([]);
    }
  }, [routeId]);

  const fetchSubroutes = async () => {
    if (!routeId || routeId.trim() === '') {
      setLoading(false);
      setSubroutes([]);
      setError('Route ID is missing');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/subroutes/routes/${routeId}`);
      const data = await response.json();
      if (data.success) {
        setSubroutes(data.data || []);
        setError(null);
      } else {
        const errorMessage = data.error || 'Failed to fetch stops';
        console.error('Failed to fetch subroutes:', errorMessage);
        setSubroutes([]);
        setError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error fetching stops';
      console.error('Error fetching subroutes:', error);
      setSubroutes([]);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations');
      const data = await response.json();
      if (data.success) {
        setLocations(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleOpenSubrouteDialog = (subroute?: any) => {
    if (subroute) {
      setEditingSubroute(subroute);
      setFormData({
        stop: subroute.stop || '',
        times: subroute.times?.toString() || '',
      });
    } else {
      setEditingSubroute(null);
      setFormData({
        stop: '',
        times: '',
      });
    }
    setFormErrors({});
    setSubrouteDialogOpen(true);
  };

  const handleCloseSubrouteDialog = () => {
    setSubrouteDialogOpen(false);
    setEditingSubroute(null);
    setFormData({
      stop: '',
      times: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.stop) errors.stop = 'Please select subroute\'s stop';
    if (!formData.times) errors.times = 'Please enter time difference';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload: any = {
        stop: formData.stop,
        route: routeId,
        times: parseFloat(formData.times),
      };

      const url = editingSubroute
        ? `/api/admin/subroutes/${editingSubroute._id}`
        : '/api/admin/subroutes';
      const method = editingSubroute ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save stop');
      }

      toast({
        title: 'Success',
        description: editingSubroute ? 'Stop updated successfully' : 'Stop created successfully',
      });

      handleCloseSubrouteDialog();
      fetchSubroutes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save stop',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (subrouteId: string) => {
    setDeletingSubrouteId(subrouteId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSubrouteId) return;

    try {
      const response = await fetch(`/api/admin/subroutes/${deletingSubrouteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete stop');
      }

      toast({
        title: 'Success',
        description: 'Stop deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingSubrouteId(null);
      fetchSubroutes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete stop',
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

  const columns: Column<any>[] = [
    { key: 'stop', header: 'Stop', cell: (row) => row.stop || 'N/A' },
    { key: 'times', header: 'Stop time difference', cell: (row) => row.times || 'N/A' },
    { key: 'createdAt', header: 'Created on', cell: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleOpenSubrouteDialog(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteClick(row._id)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenSubrouteDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add new stop
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading stops...</div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchSubroutes} variant="outline">
            Retry
          </Button>
        </div>
      ) : subroutes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No stops found for this route
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={subroutes}
          loading={loading}
          pagination={{ page: 1, limit: 10, total: subroutes.length, pages: 1 }}
          onPageChange={() => {}}
          onLimitChange={() => {}}
          searchable
        />
      )}

      {/* Add/Edit Stop Dialog */}
      <Dialog open={subrouteDialogOpen} onOpenChange={setSubrouteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSubroute ? 'Edit' : 'Add'} Stop</DialogTitle>
            <DialogDescription>
              {editingSubroute ? 'Update stop details' : 'Create a new stop'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stop">Stop *</Label>
              <Select
                value={formData.stop}
                onValueChange={(value) => setFormData({ ...formData, stop: value })}
              >
                <SelectTrigger id="stop">
                  <SelectValue placeholder="Select subroute's stop" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location._id} value={location.title}>
                      {location.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.stop && <p className="text-sm text-destructive">{formErrors.stop}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="times">Time difference from origin *</Label>
              <Input
                id="times"
                type="number"
                value={formData.times}
                onChange={(e) => setFormData({ ...formData, times: e.target.value })}
                placeholder="SubRoute time difference from origin"
              />
              {formErrors.times && <p className="text-sm text-destructive">{formErrors.times}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSubrouteDialog} disabled={submitting}>
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
              Do you want to delete this stop? This action cannot be undone.
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
    </div>
  );
}

export function RoutesClient() {
  const [routes, setRoutes] = useState<Route[]>([]);
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
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [destinationFilter, setDestinationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewStopsDialogOpen, setViewStopsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [selectedRouteForStops, setSelectedRouteForStops] = useState<Route | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    origin: '',
    destination: '',
    price: '',
    premiumPrice: '',
    discountedPrice: '',
    bus: '',
    recurrentDays: [] as string[],
    stops: [] as string[],
    times: [] as string[],
    totalTrips: '',
    markForFullPrice: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Reset to first page when filters change
    setPage(1);
  }, [originFilter, destinationFilter, searchTerm]);

  useEffect(() => {
    fetchRoutes();
  }, [page, limit, originFilter, destinationFilter, searchTerm]);

  useEffect(() => {
    fetchLocations();
    fetchBuses();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations');
      const data = await response.json();
      if (data.success) {
        setLocations(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await fetch('/api/admin/buses?page=1&limit=1000');
      const data = await response.json();
      if (data.success) {
        setBuses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  useEffect(() => {
    // Update checkAllStatus based on current page selection
    if (routes.length > 0) {
      const allCurrentPageSelected = routes.every(route => selectedRecordIds.includes(route._id));
      setCheckAllStatus(allCurrentPageSelected);
    } else {
      setCheckAllStatus(false);
    }
  }, [selectedRecordIds, routes]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (originFilter !== 'all') params.append('origin', originFilter);
      if (destinationFilter !== 'all') params.append('destination', destinationFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/routes?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatArray = (arr: string[] | undefined) => {
    if (!arr || arr.length === 0) return 'N/A';
    return Array.isArray(arr) ? arr.join(', ') : String(arr);
  };

  const handleCheckAll = (checked: boolean) => {
    setCheckAllStatus(checked);
    if (checked) {
      const allIds = routes.map(route => route._id);
      setSelectedRecordIds(allIds);
    } else {
      setSelectedRecordIds([]);
    }
  };

  const handleRecordSelection = (routeId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(prev => [...prev, routeId]);
    } else {
      setSelectedRecordIds(prev => prev.filter(id => id !== routeId));
      setCheckAllStatus(false);
    }
  };

  const filteredLocationsForDestination = () => {
    if (!formData.origin) return locations;
    return locations.filter(loc => loc.title !== formData.origin);
  };

  const handleOpenDialog = (route?: Route) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        title: route.title || '',
        origin: route.origin || '',
        destination: route.destination || '',
        price: route.price?.toString() || '',
        premiumPrice: route.premiumPrice?.toString() || '',
        discountedPrice: route.discountedPrice?.toString() || '',
        bus: typeof route.bus === 'string' ? route.bus : route.bus?._id || '',
        recurrentDays: Array.isArray(route.recurrentDays) ? route.recurrentDays : [],
        stops: Array.isArray(route.stops) ? route.stops : [],
        times: Array.isArray(route.times) ? route.times : [],
        totalTrips: route.totalTrips?.toString() || '',
        markForFullPrice: route.markForFullPrice || false,
      });
    } else {
      setEditingRoute(null);
      setFormData({
        title: '',
        origin: '',
        destination: '',
        price: '',
        premiumPrice: '',
        discountedPrice: '',
        bus: '',
        recurrentDays: [],
        stops: [],
        times: [],
        totalTrips: '',
        markForFullPrice: false,
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRoute(null);
    setFormData({
      title: '',
      origin: '',
      destination: '',
      price: '',
      premiumPrice: '',
      discountedPrice: '',
      bus: '',
      recurrentDays: [],
      stops: [],
      times: [],
      totalTrips: '',
      markForFullPrice: false,
    });
    setFormErrors({});
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      recurrentDays: prev.recurrentDays.includes(day)
        ? prev.recurrentDays.filter(d => d !== day)
        : [...prev.recurrentDays, day]
    }));
  };

  const handleStopToggle = (stop: string) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.includes(stop)
        ? prev.stops.filter(s => s !== stop)
        : [...prev.stops, stop]
    }));
  };

  const handleTimeToggle = (time: string) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.includes(time)
        ? prev.times.filter(t => t !== time)
        : [...prev.times, time]
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.title) errors.title = 'Please enter title';
    if (!formData.origin) errors.origin = 'Please select route\'s origin';
    if (!formData.destination) errors.destination = 'Please select route\'s destination';
    if (!formData.price) errors.price = 'Please enter price';
    if (!formData.premiumPrice) errors.premiumPrice = 'Please enter premium price';
    if (!formData.discountedPrice) errors.discountedPrice = 'Please enter discounted price';
    if (!formData.bus) errors.bus = 'Please select bus';
    if (formData.recurrentDays.length === 0) errors.recurrentDays = 'Please select recurrent days';
    if (formData.times.length === 0) errors.times = 'Please select possible times';
    if (!formData.totalTrips) errors.totalTrips = 'Please enter total trips';
    
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
        title: formData.title,
        origin: formData.origin,
        destination: formData.destination,
        price: parseFloat(formData.price),
        premiumPrice: parseFloat(formData.premiumPrice),
        discountedPrice: parseFloat(formData.discountedPrice),
        bus: formData.bus,
        recurrentDays: formData.recurrentDays,
        stops: formData.stops,
        times: formData.times,
        totalTrips: parseInt(formData.totalTrips),
        markForFullPrice: formData.markForFullPrice,
      };

      const url = editingRoute 
        ? `/api/admin/routes/${editingRoute._id}`
        : '/api/admin/routes';
      const method = editingRoute ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save route');
      }

      toast({
        title: 'Success',
        description: editingRoute ? 'Route updated successfully' : 'Route created successfully',
      });

      handleCloseDialog();
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save route',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewStops = (route: Route) => {
    setSelectedRouteForStops(route);
    setViewStopsDialogOpen(true);
  };

  const handleDeleteClick = (routeId: string) => {
    setDeletingRouteId(routeId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRouteId) return;

    try {
      const response = await fetch(`/api/admin/routes/${deletingRouteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete route');
      }

      toast({
        title: 'Success',
        description: 'Route deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingRouteId(null);
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete route',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDeleteRoutes = async () => {
    if (selectedRecordIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select routes to delete',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Delete routes one by one
      const deletePromises = selectedRecordIds.map(id =>
        fetch(`/api/admin/routes/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      if (errorCount === 0) {
        toast({
          title: 'Success',
          description: `Successfully deleted ${successCount} route(s)`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: `Deleted ${successCount} route(s), ${errorCount} failed`,
          variant: 'destructive',
        });
      }

      setSelectedRecordIds([]);
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete routes',
        variant: 'destructive',
      });
    }
  };

  const columns: Column<Route>[] = [
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
    { 
      key: 'title', 
      header: 'Title',
      cell: (row) => row.title || 'N/A'
    },
    { 
      key: 'origin', 
      header: 'Origin',
      cell: (row) => row.origin || 'N/A'
    },
    { 
      key: 'destination', 
      header: 'Destination',
      cell: (row) => row.destination || 'N/A'
    },
    { 
      key: 'bus', 
      header: 'Bus',
      cell: (row) => {
        if (!row.bus) return 'N/A';
        if (typeof row.bus === 'string') return 'N/A';
        return row.bus.title || 'N/A';
      }
    },
    { 
      key: 'recurrentDays', 
      header: "Route's Days",
      cell: (row) => formatArray(row.recurrentDays)
    },
    { 
      key: 'times', 
      header: "Route's Times",
      cell: (row) => formatArray(row.times)
    },
    { 
      key: 'totalTrips', 
      header: 'Trips per day',
      cell: (row) => row.totalTrips || 'N/A'
    },
    { 
      key: 'createdAt', 
      header: 'Created on',
      cell: (row) => formatDate(row.createdAt)
    },
  ];

  const actions = (row: Route) => (
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
        <DropdownMenuItem onClick={() => handleViewStops(row)}>
          <MapPin className="mr-2 h-4 w-4" />
          View stops
        </DropdownMenuItem>
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
          <h1 className="text-3xl font-bold">Routes</h1>
          <p className="text-muted-foreground">
            All Routes: <span className="font-semibold">{pagination.total}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline"
            onClick={handleBulkDeleteRoutes}
            disabled={selectedRecordIds.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add new route
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters and Search Section */}
          <div className="mb-4 space-y-4 mt-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Origins</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location._id} value={location.title}>
                      {location.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={destinationFilter} 
                onValueChange={setDestinationFilter}
                disabled={originFilter === 'all'}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Destinations</SelectItem>
                  {locations
                    .filter(loc => originFilter === 'all' || loc.title !== originFilter)
                    .map((location) => (
                      <SelectItem key={location._id} value={location.title}>
                        {location.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={routes}
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

      {/* Add/Edit Route Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Edit' : 'Add'} Route</DialogTitle>
            <DialogDescription>
              {editingRoute ? 'Update route details' : 'Create a new route'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title"
              />
              {formErrors.title && (
                <p className="text-sm text-destructive">{formErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">Route's origin *</Label>
              <Select
                value={formData.origin}
                onValueChange={(value) => {
                  setFormData({ ...formData, origin: value, destination: '' });
                }}
              >
                <SelectTrigger id="origin">
                  <SelectValue placeholder="Select route's origin" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location._id} value={location.title}>
                      {location.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.origin && (
                <p className="text-sm text-destructive">{formErrors.origin}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Route's Destination *</Label>
              <Select
                value={formData.destination}
                onValueChange={(value) => setFormData({ ...formData, destination: value })}
                disabled={!formData.origin}
              >
                <SelectTrigger id="destination">
                  <SelectValue placeholder="Select route's destination" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocationsForDestination().map((location) => (
                    <SelectItem key={location._id} value={location.title}>
                      {location.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.destination && (
                <p className="text-sm text-destructive">{formErrors.destination}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Basic Price *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Route Basic Price"
                />
                {formErrors.price && (
                  <p className="text-sm text-destructive">{formErrors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="premiumPrice">Premium Price *</Label>
                <Input
                  id="premiumPrice"
                  type="number"
                  value={formData.premiumPrice}
                  onChange={(e) => setFormData({ ...formData, premiumPrice: e.target.value })}
                  placeholder="Route Premium Price"
                />
                {formErrors.premiumPrice && (
                  <p className="text-sm text-destructive">{formErrors.premiumPrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountedPrice">Discounted Price *</Label>
                <Input
                  id="discountedPrice"
                  type="number"
                  value={formData.discountedPrice}
                  onChange={(e) => setFormData({ ...formData, discountedPrice: e.target.value })}
                  placeholder="Route Discounted Price"
                />
                {formErrors.discountedPrice && (
                  <p className="text-sm text-destructive">{formErrors.discountedPrice}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus">Bus *</Label>
              <Select
                value={formData.bus}
                onValueChange={(value) => setFormData({ ...formData, bus: value })}
              >
                <SelectTrigger id="bus">
                  <SelectValue placeholder="Select a bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus._id} value={bus._id}>
                      {bus.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.bus && (
                <p className="text-sm text-destructive">{formErrors.bus}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Route's recurrent days of the week *</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={formData.recurrentDays.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <label
                      htmlFor={`day-${day.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
              {formErrors.recurrentDays && (
                <p className="text-sm text-destructive">{formErrors.recurrentDays}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Routes stops</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading locations...</p>
                ) : (
                  locations.map((location) => (
                    <div key={location._id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`stop-${location._id}`}
                        checked={formData.stops.includes(location.title)}
                        onCheckedChange={() => handleStopToggle(location.title)}
                      />
                      <label
                        htmlFor={`stop-${location._id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {location.title}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Routes trip times *</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {timeSlots.map((time) => (
                  <div key={time} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`time-${time}`}
                      checked={formData.times.includes(time)}
                      onCheckedChange={() => handleTimeToggle(time)}
                    />
                    <label
                      htmlFor={`time-${time}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {time}
                    </label>
                  </div>
                ))}
              </div>
              {formErrors.times && (
                <p className="text-sm text-destructive">{formErrors.times}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalTrips">Total Trips per day *</Label>
              <Input
                id="totalTrips"
                type="number"
                value={formData.totalTrips}
                onChange={(e) => setFormData({ ...formData, totalTrips: e.target.value })}
                placeholder="Total Trips per day"
              />
              {formErrors.totalTrips && (
                <p className="text-sm text-destructive">{formErrors.totalTrips}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="markForFullPrice"
                checked={formData.markForFullPrice}
                onCheckedChange={(checked) => setFormData({ ...formData, markForFullPrice: checked as boolean })}
              />
              <label
                htmlFor="markForFullPrice"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Mark for Full Price
              </label>
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

      {/* View Stops Dialog */}
      <Dialog 
        open={viewStopsDialogOpen} 
        onOpenChange={(open) => {
          setViewStopsDialogOpen(open);
          if (!open) {
            setSelectedRouteForStops(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stops for {selectedRouteForStops?.title || 'Route'}</DialogTitle>
            <DialogDescription>
              View and manage stops for this route
            </DialogDescription>
          </DialogHeader>
          {selectedRouteForStops?._id ? (
            <ViewStopsContent
              routeId={selectedRouteForStops._id}
              onClose={() => {
                setViewStopsDialogOpen(false);
                setSelectedRouteForStops(null);
              }}
            />
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No route selected
            </div>
          )}
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
    </div>
  );
}

