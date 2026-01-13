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

export function BusesClient() {
  const [buses, setBuses] = useState<Bus[]>([]);
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
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    seats: '',
    photo: '',
  });
  const [seatLayout, setSeatLayout] = useState<string[]>(['STEERING']);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  const busTypes = [
    { title: 'Toyota Hiace Bus' },
    { title: 'Toyota Sienna' },
    { title: 'JAC' },
    { title: 'Cargo 1' }
  ];

  useEffect(() => {
    fetchBuses();
  }, [page, limit, statusFilter, typeFilter]);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/admin/buses?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setBuses(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'active' || status === 'available' 
      ? 'success' 
      : status === 'maintenance' 
      ? 'secondary' 
      : 'destructive';
    
    return (
      <Badge variant={variant}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

interface Bus {
  _id: string;
  title?: string;
  plateNumber?: string;
  model?: string;
  type?: string;
  seats?: number;
  capacity?: number;
  photo?: string;
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

  const handleOpenDialog = (bus?: Bus) => {
    if (bus) {
      setEditingBus(bus);
      setFormData({
        title: bus.title || '',
        type: bus.type || '',
        seats: bus.seats?.toString() || '',
        photo: bus.photo || '',
      });
      setSeatLayout((bus as any).seatLayout ? [...(bus as any).seatLayout] : ['STEERING']);
    } else {
      setEditingBus(null);
      setFormData({
        title: '',
        type: '',
        seats: '',
        photo: '',
      });
      setSeatLayout(['STEERING']);
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBus(null);
    setFormData({
      title: '',
      type: '',
      seats: '',
      photo: '',
    });
    setSeatLayout(['STEERING']);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.title) errors.title = 'Please enter your title';
    if (!formData.seats) errors.seats = 'Please enter no of seats';
    if (!formData.type) errors.type = 'Please select bus type';
    
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
        type: formData.type,
        seats: parseInt(formData.seats),
        photo: formData.photo,
        seatLayout: seatLayout,
      };

      const url = editingBus 
        ? `/api/admin/buses/${editingBus._id}`
        : '/api/admin/buses';
      const method = editingBus ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save bus');
      }

      toast({
        title: 'Success',
        description: editingBus ? 'Bus updated successfully' : 'Bus created successfully',
      });

      handleCloseDialog();
      fetchBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save bus',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Seat layout functions
  const addSeat = (label: string) => {
    if (label === 'STEERING') {
      if (!seatLayout.includes('STEERING')) {
        const newLayout = ['STEERING', ...seatLayout.filter(s => s !== 'STEERING')];
        setSeatLayout(newLayout);
        setLastAddedIndex(0);
        setTimeout(() => setLastAddedIndex(null), 1000);
      }
      return;
    }
    if (!seatLayout.includes(label)) {
      const newLayout = [...seatLayout, label];
      setSeatLayout(newLayout);
      setLastAddedIndex(newLayout.length - 1);
      setTimeout(() => setLastAddedIndex(null), 1000);
    }
  };

  const addSpace = () => {
    const newLayout = [...seatLayout, 'SPACE'];
    setSeatLayout(newLayout);
    setLastAddedIndex(newLayout.length - 1);
    setTimeout(() => setLastAddedIndex(null), 1000);
  };

  const addRow = () => {
    if (seatLayout.length === 0 || seatLayout[seatLayout.length - 1] === 'ROW') {
      return;
    }
    const newLayout = [...seatLayout, 'ROW'];
    setSeatLayout(newLayout);
    setLastAddedIndex(newLayout.length - 1);
    setTimeout(() => setLastAddedIndex(null), 1000);
  };

  const removeSeat = (index: number) => {
    if (seatLayout[index] === 'STEERING' && seatLayout.length === 1) {
      return;
    }
    const newLayout = seatLayout.filter((_, i) => i !== index);
    setSeatLayout(newLayout);
  };

  const clearAllSeats = () => {
    setSeatLayout(['STEERING']);
  };

  const getRowsWithIndices = () => {
    const rows: Array<Array<{ value: string; index: number }>> = [];
    let currentRow: Array<{ value: string; index: number }> = [];
    let globalIndex = 0;

    seatLayout.forEach((seat, idx) => {
      if (seat === 'ROW') {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
      } else {
        currentRow.push({ value: seat, index: idx });
      }
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows.length > 0 ? rows : [];
  };

  const handleDeleteClick = (busId: string) => {
    setDeletingBusId(busId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBusId) return;

    try {
      const response = await fetch(`/api/admin/buses/${deletingBusId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bus');
      }

      toast({
        title: 'Success',
        description: 'Bus deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingBusId(null);
      fetchBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bus',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Buses</h1>
          <p className="text-muted-foreground">
            All Buses: <span className="font-semibold">{pagination.total}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add new bus
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
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Bus Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {busTypes.map((type) => (
                    <SelectItem key={type.title} value={type.title}>
                      {type.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'title', header: 'Title', cell: (row) => row.title || 'N/A' },
              { key: 'type', header: 'Type', cell: (row) => row.type || 'N/A' },
              { 
                key: 'photo', 
                header: 'Image', 
                cell: (row: any) => row.photo ? (
                  <img src={row.photo} alt={row.title} className="h-10 w-10 object-cover rounded" />
                ) : 'N/A'
              },
              { key: 'seats', header: 'Seats', cell: (row) => row.seats || 'N/A' },
              { 
                key: 'status', 
                header: 'Status', 
                cell: (row) => getStatusBadge(row.status)
              },
              { key: 'createdAt', header: 'Created on', cell: (row) => formatDate(row.createdAt) },
            ]}
            data={buses}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={setLimit}
            searchable={true}
            actions={(row) => (
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
            )}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Bus Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBus ? 'Edit' : 'Add'} Bus</DialogTitle>
            <DialogDescription>
              {editingBus ? 'Update bus details' : 'Create a new bus'}
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
              <Label htmlFor="seats">No. of Seats *</Label>
              <Input
                id="seats"
                type="number"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                placeholder="No of Seats"
              />
              {formErrors.seats && (
                <p className="text-sm text-destructive">{formErrors.seats}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Bus Image</Label>
              <Input
                id="photo"
                value={formData.photo}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                placeholder="Img url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select bus type" />
                </SelectTrigger>
                <SelectContent>
                  {busTypes.map((type) => (
                    <SelectItem key={type.title} value={type.title}>
                      {type.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.type && (
                <p className="text-sm text-destructive">{formErrors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Seat Arrangement (Click to add)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => {
                  const label = num.toString();
                  const isIncluded = seatLayout.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => addSeat(label)}
                      disabled={isIncluded}
                      className={`px-2 py-1 border rounded ${
                        isIncluded
                          ? 'bg-green-200 text-green-700 cursor-not-allowed opacity-60'
                          : 'bg-gray-100 hover:bg-primary-100 text-black'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addSeat('STEERING')}
                  disabled={seatLayout.includes('STEERING')}
                  className={`px-2 py-1 border rounded flex items-center gap-1 ${
                    seatLayout.includes('STEERING')
                      ? 'bg-green-200 text-green-700 cursor-not-allowed opacity-60'
                      : 'bg-gray-100 hover:bg-primary-100 text-black'
                  }`}
                >
                  <span>🛞</span> Steering
                </button>
                <button
                  type="button"
                  onClick={addSpace}
                  className="px-2 py-1 border rounded bg-yellow-100 hover:bg-yellow-200"
                >
                  + Space
                </button>
                <button
                  type="button"
                  onClick={addRow}
                  className="px-2 py-1 border rounded bg-blue-100 hover:bg-blue-200"
                >
                  + New Row
                </button>
                <button
                  type="button"
                  onClick={clearAllSeats}
                  className="px-2 py-1 border rounded bg-red-100 hover:bg-red-200 text-red-700"
                >
                  Clear All
                </button>
              </div>

              <div className="mt-4">
                {seatLayout.length === 0 ? (
                  <div className="text-gray-400 italic">No seats added yet.</div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-3 bg-white">
                    {getRowsWithIndices().map((row, rowIdx) => (
                      <div key={rowIdx} className="flex flex-wrap gap-2 my-3">
                        {row.map((seat) => (
                          <span
                            key={`${seat.index}-${seat.value}`}
                            className={`inline-flex items-center px-2 py-1 w-12 rounded ${
                              seat.value === 'SPACE'
                                ? 'bg-gray-300 text-gray-400 italic justify-end'
                                : seat.value === 'STEERING'
                                ? 'bg-gray-200 text-black font-bold'
                                : lastAddedIndex === seat.index
                                ? 'bg-green-400'
                                : 'bg-primary-200'
                            } ${lastAddedIndex === seat.index ? 'ring-2 ring-green-400' : ''}`}
                          >
                            {seat.value === 'STEERING' ? '🛞' : seat.value === 'SPACE' ? '' : seat.value}
                            <button
                              type="button"
                              onClick={() => removeSeat(seat.index)}
                              className="ml-1 text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <small className="text-gray-500 block mt-1">
                Click seat labels to add, &quot;+ Space&quot; to add a space, &quot;+ New Row&quot; to start a new row, click × to remove. Order = arrangement.
              </small>
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

