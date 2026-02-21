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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface BusType {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export function BusTypesClient() {
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBusType, setEditingBusType] = useState<BusType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBusTypeId, setDeletingBusTypeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  const fetchBusTypes = async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: currentLimit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/bus-types?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        let filteredTypes = data.data || [];
        if (searchTerm) {
          filteredTypes = filteredTypes.filter((type: BusType) =>
            type.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        setBusTypes(filteredTypes);
        const total = data.pagination?.total || 0;
        const pages = data.pagination?.pages || Math.ceil(total / currentLimit);
        setPagination({
          page: currentPage,
          limit: currentLimit,
          total: total,
          pages: pages,
        });
      }
    } catch (error) {
      console.error('Error fetching bus types:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch bus types',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusTypes(page, limit);
  }, [page, limit, statusFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variant = status === 'active' ? 'success' : 'destructive';
    return (
      <Badge variant={variant}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleOpenDialog = (busType?: BusType) => {
    if (busType) {
      setEditingBusType(busType);
      setFormData({
        name: busType.name || '',
        description: busType.description || '',
        imageUrl: busType.image || '',
        status: busType.status || 'active',
      });
      setImagePreview(busType.image || '');
      setImageFile(null);
    } else {
      setEditingBusType(null);
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        status: 'active',
      });
      setImagePreview('');
      setImageFile(null);
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBusType(null);
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      status: 'active',
    });
    setImageFile(null);
    setImagePreview('');
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name) errors.name = 'Bus type name is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('status', formData.status);

      // Add image file if selected, otherwise add imageUrl
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      } else if (formData.imageUrl) {
        formDataToSend.append('imageUrl', formData.imageUrl);
      }

      const url = editingBusType
        ? `/api/admin/bus-types/${editingBusType._id}`
        : '/api/admin/bus-types';
      const method = editingBusType ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formDataToSend,
      });

      const data = await response.json();
      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || `Failed to ${editingBusType ? 'update' : 'create'} bus type`,
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Bus type ${editingBusType ? 'updated' : 'created'} successfully`,
      });

      handleCloseDialog();
      fetchBusTypes(page, limit);
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBusTypeId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/bus-types/${deletingBusTypeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete bus type',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Bus type deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingBusTypeId(null);
      fetchBusTypes(page, limit);
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<BusType>[] = [
    {
      key: 'name',
      header: 'Name',
      accessor: 'name',
      cell: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      accessor: 'description',
      cell: (item) => (
        <span className="text-sm text-gray-600">
          {item.description || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      cell: (item) => getStatusBadge(item.status),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      cell: (item) => formatDate(item.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: '_id',
      cell: (item) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDialog(item)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeletingBusTypeId(item._id);
              setDeleteDialogOpen(true);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Bus Types</CardTitle>
            <CardDescription>Manage bus types for your fleet</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bus Type
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-col gap-2 md:flex-row md:gap-4">
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-64"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="md:w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={busTypes}
              loading={loading}
              pagination={pagination}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingBusType ? 'Edit Bus Type' : 'Add New Bus Type'}
            </DialogTitle>
            <DialogDescription>
              {editingBusType
                ? 'Update the bus type information below.'
                : 'Create a new bus type for your fleet.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bus Type Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Sienna, Hummer, JAC"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the bus type"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-file">Bus Type Image</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or GIF (Max 10MB)
              </p>
            </div>

            {imagePreview && (
              <div className="space-y-2">
                <Label>Image Preview</Label>
                <div className="relative w-full aspect-video rounded-lg border overflow-hidden bg-muted">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL (Optional)</Label>
              <Input
                id="image-url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                placeholder="https://example.com/image.jpg (used if no file uploaded)"
              />
            </div>



            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as 'active' | 'inactive',
                  })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bus type? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
