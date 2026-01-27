'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Plus, Edit, Trash2, Trash2 as TrashIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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

interface SubRoute {
  _id: string;
  title?: string;
  stop?: string;
  origin?: string;
  destination?: string;
  price?: number;
  premiumPrice?: number;
  discountedPrice?: number;
  times?: number | string;
  route?: string | string[] | { _id: string; title: string }[];
  createdAt: string;
}

interface Location {
  _id: string;
  title: string;
}

interface Route {
  _id: string;
  title: string;
}

export function SubRoutesClient() {
  const [subroutes, setSubroutes] = useState<SubRoute[]>([]);
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubroute, setEditingSubroute] = useState<SubRoute | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubrouteId, setDeletingSubrouteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [formData, setFormData] = useState({
    stop: '',
    price: '',
    premiumPrice: '',
    discountedPrice: '',
    route: [] as string[],
    times: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSubroutes(page, limit);
    fetchLocations();
    fetchRoutes();
  }, [page, limit, searchTerm]);

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

  useEffect(() => {
    if (subroutes.length > 0) {
      const allCurrentPageSelected = subroutes.every(subroute => selectedRecordIds.includes(subroute._id));
      setCheckAllStatus(allCurrentPageSelected);
    } else {
      setCheckAllStatus(false);
    }
  }, [selectedRecordIds, subroutes]);

  const fetchSubroutes = async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: currentLimit.toString(),
      });
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/admin/subroutes?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSubroutes(data.data || []);
        // Always use the current page from parameter, ignore API response page value
        const total = data.pagination?.total || data.data?.length || 0;
        const pages = data.pagination?.pages || Math.ceil(total / currentLimit);
        setPagination({
          page: currentPage, // Always use the requested page, never from API
          limit: currentLimit,
          total: total,
          pages: pages,
        });
      }
    } catch (error) {
      console.error('Error fetching subroutes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAll = (checked: boolean) => {
    setCheckAllStatus(checked);
    if (checked) {
      const allIds = subroutes.map(subroute => subroute._id);
      setSelectedRecordIds(allIds);
    } else {
      setSelectedRecordIds([]);
    }
  };

  const handleRecordSelection = (subrouteId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(prev => [...prev, subrouteId]);
    } else {
      setSelectedRecordIds(prev => prev.filter(id => id !== subrouteId));
      setCheckAllStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleOpenDialog = (subroute?: SubRoute) => {
    if (subroute) {
      setEditingSubroute(subroute);
      // Handle route field - could be string, array, or array of objects
      let routeIds: string[] = [];
      if (subroute.route) {
        if (Array.isArray(subroute.route)) {
          routeIds = subroute.route.map((r: any) => 
            typeof r === 'string' ? r : r._id || r
          );
        } else if (typeof subroute.route === 'string') {
          routeIds = [subroute.route];
        }
      }
      
      setFormData({
        stop: subroute.stop || '',
        price: subroute.price?.toString() || '',
        premiumPrice: subroute.premiumPrice?.toString() || '',
        discountedPrice: subroute.discountedPrice?.toString() || '',
        route: routeIds,
        times: subroute.times?.toString() || '',
      });
    } else {
      setEditingSubroute(null);
      setFormData({
        stop: '',
        price: '',
        premiumPrice: '',
        discountedPrice: '',
        route: [],
        times: '',
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSubroute(null);
    setFormData({
      stop: '',
      price: '',
      premiumPrice: '',
      discountedPrice: '',
      route: [],
      times: '',
    });
    setFormErrors({});
  };

  const handleRouteToggle = (routeId: string) => {
    setFormData(prev => ({
      ...prev,
      route: prev.route.includes(routeId)
        ? prev.route.filter(id => id !== routeId)
        : [...prev.route, routeId]
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.stop) errors.stop = 'Please select subroute\'s stop';
    if (!formData.price) errors.price = 'Please enter price';
    if (!formData.premiumPrice) errors.premiumPrice = 'Please enter premium price';
    if (!formData.discountedPrice) errors.discountedPrice = 'Please enter discounted price';
    if (formData.route.length === 0) errors.route = 'Please select route';
    if (!formData.times) errors.times = 'Please enter time difference';
    
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
        stop: formData.stop,
        price: parseFloat(formData.price),
        premiumPrice: parseFloat(formData.premiumPrice),
        discountedPrice: parseFloat(formData.discountedPrice),
        route: formData.route,
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
        throw new Error(data.error || 'Failed to save subroute');
      }

      toast({
        title: 'Success',
        description: editingSubroute ? 'Subroute updated successfully' : 'Subroute created successfully',
      });

      handleCloseDialog();
      fetchSubroutes(page, limit);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save subroute',
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
        throw new Error('Failed to delete subroute');
      }

      toast({
        title: 'Success',
        description: 'Subroute deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingSubrouteId(null);
      fetchSubroutes(page, limit);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete subroute',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDeleteSubroutes = async () => {
    if (selectedRecordIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select subroutes to delete',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Delete subroutes one by one
      const deletePromises = selectedRecordIds.map(id =>
        fetch(`/api/admin/subroutes/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      if (errorCount === 0) {
        toast({
          title: 'Success',
          description: `Successfully deleted ${successCount} subroute(s)`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: `Deleted ${successCount} subroute(s), ${errorCount} failed`,
          variant: 'destructive',
        });
      }

      setSelectedRecordIds([]);
      fetchSubroutes(page, limit);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete subroutes',
        variant: 'destructive',
      });
    }
  };

  const columns: Column<SubRoute>[] = [
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
    { 
      key: 'price', 
      header: 'Price', 
      cell: (row) => `N:${row.price || 0}, P: ${row.premiumPrice || 0}, D: ${row.discountedPrice || 0}`
    },
    { key: 'origin', header: 'Origin', cell: (row) => row.origin || 'N/A' },
    { key: 'destination', header: 'Destination', cell: (row) => row.destination || 'N/A' },
    { key: 'times', header: "SubRoute's Times", cell: (row) => row.times || 'N/A' },
    { key: 'createdAt', header: 'Created on', cell: (row) => formatDate(row.createdAt) },
  ];

  const actions = (row: SubRoute) => (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="ghost"
        onClick={() => handleOpenDialog(row)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="ghost"
        onClick={() => handleDeleteClick(row._id)}
        className="text-destructive"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sub Routes</h1>
          <p className="text-muted-foreground">
            All SubRoutes: <span className="font-semibold">{pagination.total}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/exports', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'subroutes',
                    params: {},
                    format: 'xlsx',
                  }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.message || data.error || 'Failed to start export');
                }
                toast({
                  title: 'Export started',
                  description: 'Your subroutes export is generating. Download it from the Exports icon when ready.',
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
            onClick={handleBulkDeleteSubroutes}
            disabled={selectedRecordIds.length === 0}
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add new subroute
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={subroutes}
            loading={loading}
            pagination={pagination}
            onPageChange={(newPage) => {
              if (newPage !== page) {
                setPage(newPage);
                setPagination(prev => ({ ...prev, page: newPage }));
              }
            }}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            searchable
            onSearch={(search) => {
              setSearchTerm(search);
              setPage(1); // Reset to first page when searching
            }}
            actions={actions}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Subroute Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubroute ? 'Edit' : 'Add'} SubRoute</DialogTitle>
            <DialogDescription>
              {editingSubroute ? 'Update subroute details' : 'Create a new subroute'}
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
              {formErrors.stop && (
                <p className="text-sm text-destructive">{formErrors.stop}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Basic Price *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="SubRoute Basic Price"
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
                placeholder="SubRoute Premium Price"
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
                placeholder="SubRoute Discounted Price"
              />
              {formErrors.discountedPrice && (
                <p className="text-sm text-destructive">{formErrors.discountedPrice}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Main Route *</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {routes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading routes...</p>
                ) : (
                  routes.map((route) => (
                    <div key={route._id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`route-${route._id}`}
                        checked={formData.route.includes(route._id)}
                        onCheckedChange={() => handleRouteToggle(route._id)}
                      />
                      <label
                        htmlFor={`route-${route._id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {route.title}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {formErrors.route && (
                <p className="text-sm text-destructive">{formErrors.route}</p>
              )}
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
              {formErrors.times && (
                <p className="text-sm text-destructive">{formErrors.times}</p>
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
    </div>
  );
}

