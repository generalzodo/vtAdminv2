'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

// Nigerian states - simplified list (matching v1)
const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export function DriversClient() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    state: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
  }, [page, limit, statusFilter, stateFilter, searchTerm]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (stateFilter !== 'all') params.append('state', stateFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/drivers?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setDrivers(data.data || []);
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
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'active' || status === 'available' 
      ? 'success' 
      : status === 'on-trip' 
      ? 'secondary' 
      : 'destructive';
    
    return (
      <Badge variant={variant}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  interface Driver {
    _id: string;
    firstName: string;
    lastName: string;
    address?: string;
    phone: string;
    state?: string;
    status: string;
    createdAt: string;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleOpenDialog = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        firstName: driver.firstName || '',
        lastName: driver.lastName || '',
        phone: driver.phone || '',
        address: driver.address || '',
        state: driver.state || '',
      });
    } else {
      setEditingDriver(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        state: '',
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDriver(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      state: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName) errors.firstName = 'Please enter your first name';
    if (!formData.lastName) errors.lastName = 'Please enter your last name';
    if (!formData.phone) errors.phone = 'Please enter your phone';
    if (!formData.address) errors.address = 'Please enter address';
    if (!formData.state) errors.state = 'Please enter state';
    
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        state: formData.state,
      };

      const url = editingDriver 
        ? `/api/admin/drivers/${editingDriver._id}`
        : '/api/admin/drivers';
      const method = editingDriver ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save driver');
      }

      toast({
        title: 'Success',
        description: editingDriver ? 'Driver updated successfully' : 'Driver created successfully',
      });

      handleCloseDialog();
      fetchDrivers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save driver',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (driverId: string) => {
    setDeletingDriverId(driverId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDriverId) return;

    try {
      const response = await fetch(`/api/admin/drivers/${deletingDriverId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete driver');
      }

      toast({
        title: 'Success',
        description: 'Driver deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingDriverId(null);
      fetchDrivers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete driver',
        variant: 'destructive',
      });
    }
  };

  const columns: Column<Driver>[] = [
    { key: 'name', header: 'Name', cell: (row) => `${row.firstName}, ${row.lastName}` },
    { key: 'address', header: 'Address', cell: (row) => row.address || 'N/A' },
    { key: 'phone', header: 'Phone' },
    { key: 'state', header: 'State', cell: (row) => row.state || 'N/A' },
    { 
      key: 'status', 
      header: 'Status', 
      cell: (row) => getStatusBadge(row.status)
    },
    { key: 'createdAt', header: 'Created on', cell: (row) => formatDate(row.createdAt) },
  ];

  const actions = (row: Driver) => (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="default"
        onClick={() => handleOpenDialog(row)}
      >
        Edit
      </Button>
      <Button 
        size="sm" 
        variant="destructive"
        onClick={() => handleDeleteClick(row._id)}
      >
        Delete
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transport Officers</h1>
          <p className="text-muted-foreground">
            All Drivers: <span className="font-semibold">{pagination.total}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add new driver
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters and Search Section */}
          <div className="mb-4 space-y-4 mt-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on-trip">On Trip</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={drivers}
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

      {/* Add/Edit Driver Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Edit' : 'Add'} Driver</DialogTitle>
            <DialogDescription>
              {editingDriver ? 'Update driver details' : 'Create a new driver'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First Name"
              />
              {formErrors.firstName && (
                <p className="text-sm text-destructive">{formErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last Name"
              />
              {formErrors.lastName && (
                <p className="text-sm text-destructive">{formErrors.lastName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
              {formErrors.phone && (
                <p className="text-sm text-destructive">{formErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Address"
              />
              {formErrors.address && (
                <p className="text-sm text-destructive">{formErrors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.state && (
                <p className="text-sm text-destructive">{formErrors.state}</p>
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

