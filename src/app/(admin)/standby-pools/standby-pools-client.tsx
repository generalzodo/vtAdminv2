'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useToast } from '@/hooks/use-toast';
import { Edit, Plus, RefreshCw, Upload } from 'lucide-react';

type StandbyStatus = 'inactive' | 'available' | 'reserved' | 'allocated';

interface RefItem {
  _id: string;
  title?: string;
  origin?: string;
  destination?: string;
  state?: string;
}

interface BusRef {
  _id: string;
  title: string;
  type?: string;
  busType?: string;
  seats?: number;
}

interface StandbyPool {
  _id: string;
  bus?: BusRef | null;
  station?: RefItem | null;
  operationalDate: string;
  status: StandbyStatus;
  active: boolean;
  routeScopes?: RefItem[];
  busTypeScopes?: string[];
  allocationMeta?: {
    allocatedTrip?: {
      _id: string;
      title?: string;
      tripDate?: string;
      time?: string;
      status?: string;
    } | null;
    allocatedAt?: string | null;
    reason?: string | null;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PagedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

interface FormState {
  bus: string;
  station: string;
  operationalDate: string;
  routeScopes: string[];
  busTypeScopes: string;
  notes: string;
  active: boolean;
}

const statusBadgeVariant: Record<StandbyStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  inactive: 'outline',
  available: 'default',
  reserved: 'secondary',
  allocated: 'destructive',
};

const defaultFormData: FormState = {
  bus: '',
  station: '',
  operationalDate: '',
  routeScopes: [],
  busTypeScopes: '',
  notes: '',
  active: true,
};

function toDdMmYyyy(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function toIsoFromDdMmYyyy(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function parseBusTypeScopes(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function StandbyPoolsClient() {
  const [standbyPools, setStandbyPools] = useState<StandbyPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [buses, setBuses] = useState<BusRef[]>([]);
  const [stations, setStations] = useState<RefItem[]>([]);
  const [routes, setRoutes] = useState<RefItem[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StandbyPool | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormState>(defaultFormData);

  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<StandbyPool | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [bulkDefaultDate, setBulkDefaultDate] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);

  const { toast } = useToast();

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return standbyPools;
    const query = searchTerm.toLowerCase().trim();
    return standbyPools.filter((row) => {
      const bus = row.bus?.title?.toLowerCase() || '';
      const station = row.station?.title?.toLowerCase() || '';
      const notes = (row.notes || '').toLowerCase();
      const date = (row.operationalDate || '').toLowerCase();
      return bus.includes(query) || station.includes(query) || notes.includes(query) || date.includes(query);
    });
  }, [standbyPools, searchTerm]);

  const fetchReferenceData = async () => {
    try {
      const [busesRes, stationsRes, routesRes] = await Promise.all([
        fetch('/api/admin/buses?page=1&limit=1000'),
        fetch('/api/admin/locations'),
        fetch('/api/admin/routes?page=1&limit=1000'),
      ]);

      const [busesData, stationsData, routesData] = await Promise.all([
        busesRes.json(),
        stationsRes.json(),
        routesRes.json(),
      ]);

      if (busesData.success) setBuses(busesData.data || []);
      if (stationsData.success) setStations(stationsData.data || []);
      if (routesData.success) setRoutes(routesData.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load buses, stations, or routes',
        variant: 'destructive',
      });
    }
  };

  const fetchStandbyPools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (activeFilter !== 'all') params.append('active', activeFilter);
      if (dateFilter) params.append('operationalDate', toDdMmYyyy(dateFilter));

      const response = await fetch(`/api/admin/standby-pools?${params.toString()}`);
      const data: PagedResponse<StandbyPool> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch standby pools');
      }

      setStandbyPools(data.data || []);
      setPagination({
        page,
        limit,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 1,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch standby pools',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchStandbyPools();
  }, [page, limit, statusFilter, activeFilter, dateFilter]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (record: StandbyPool) => {
    setEditingRecord(record);
    setFormData({
      bus: record.bus?._id || '',
      station: record.station?._id || '',
      operationalDate: toIsoFromDdMmYyyy(record.operationalDate),
      routeScopes: (record.routeScopes || []).map((item) => item._id),
      busTypeScopes: (record.busTypeScopes || []).join(', '),
      notes: record.notes || '',
      active: record.active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData(defaultFormData);
  };

  const validateForm = (): string | null => {
    if (!formData.bus) return 'Bus is required';
    if (!formData.station) return 'Station is required';
    if (!formData.operationalDate) return 'Operational date is required';
    return null;
  };

  const submitForm = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({ title: 'Validation Error', description: validationError, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bus: formData.bus,
        station: formData.station,
        operationalDate: toDdMmYyyy(formData.operationalDate),
        routeScopes: formData.routeScopes,
        busTypeScopes: parseBusTypeScopes(formData.busTypeScopes),
        notes: formData.notes,
        active: formData.active,
      };

      const url = editingRecord
        ? `/api/admin/standby-pools/${editingRecord._id}`
        : '/api/admin/standby-pools';
      const method = editingRecord ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save standby pool entry');
      }

      toast({
        title: 'Success',
        description: editingRecord ? 'Standby pool entry updated' : 'Standby pool entry created',
      });

      setDialogOpen(false);
      resetForm();
      fetchStandbyPools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save standby pool entry',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openToggleDialog = (record: StandbyPool) => {
    setToggleTarget(record);
    setToggleDialogOpen(true);
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;

    setTogglingStatus(true);
    try {
      const action = toggleTarget.active ? 'deactivate' : 'activate';
      const response = await fetch(`/api/admin/standby-pools/${toggleTarget._id}/${action}`, {
        method: 'PATCH',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to ${action} standby pool entry`);
      }

      toast({
        title: 'Success',
        description: `Standby pool entry ${action}d successfully`,
      });

      fetchStandbyPools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update standby pool status',
        variant: 'destructive',
      });
    } finally {
      setTogglingStatus(false);
      setToggleDialogOpen(false);
      setToggleTarget(null);
    }
  };

  const submitBulkUpload = async () => {
    if (!bulkUploadFile) {
      toast({ title: 'Validation Error', description: 'Please select a file first', variant: 'destructive' });
      return;
    }

    setBulkSubmitting(true);
    try {
      const fileBase64 = await fileToBase64(bulkUploadFile);

      const response = await fetch('/api/admin/standby-pools/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: fileBase64,
          defaultOperationalDate: bulkDefaultDate ? toDdMmYyyy(bulkDefaultDate) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to bulk upload standby pool entries');
      }

      const summary = data.data || {};
      toast({
        title: 'Bulk Upload Completed',
        description: `Updated: ${summary.insertedOrUpdated || 0}, Failed: ${summary.failed || 0}`,
      });

      fetchStandbyPools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk upload standby pool entries',
        variant: 'destructive',
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const columns: Column<StandbyPool>[] = [
    {
      key: 'bus',
      header: 'Bus',
      cell: (row) => row.bus?.title || 'N/A',
    },
    {
      key: 'station',
      header: 'Station',
      cell: (row) => row.station?.title || 'N/A',
    },
    {
      key: 'operationalDate',
      header: 'Operational Date',
      cell: (row) => row.operationalDate,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <Badge variant={statusBadgeVariant[row.status]}>{row.status}</Badge>,
    },
    {
      key: 'active',
      header: 'Active',
      cell: (row) => <Badge variant={row.active ? 'default' : 'outline'}>{row.active ? 'Yes' : 'No'}</Badge>,
    },
    {
      key: 'routeScopes',
      header: 'Route Scopes',
      cell: (row) => {
        const scopes = row.routeScopes || [];
        if (!scopes.length) return 'All';
        return scopes.slice(0, 2).map((item) => item.title || `${item.origin || ''}-${item.destination || ''}`).join(', ');
      },
    },
    {
      key: 'allocatedTrip',
      header: 'Allocated Trip',
      cell: (row) => {
        const trip = row.allocationMeta?.allocatedTrip;
        if (!trip) return 'N/A';
        return `${trip.title || 'Trip'} (${trip.tripDate || ''} ${trip.time || ''})`;
      },
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      cell: (row) => new Date(row.updatedAt).toLocaleString(),
    },
  ];

  const actions = (row: StandbyPool) => (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => openEditDialog(row)}>
        <Edit className="mr-1 h-4 w-4" />
        Edit
      </Button>
      <Button
        size="sm"
        variant={row.active ? 'destructive' : 'default'}
        onClick={() => openToggleDialog(row)}
      >
        {row.active ? 'Deactivate' : 'Activate'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Standby Pool</h1>
          <p className="text-muted-foreground">Manage standby buses by station and operational date</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchStandbyPools()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Standby Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-md border p-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="allocated">Allocated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Active</Label>
          <Select value={activeFilter} onValueChange={(value) => { setActiveFilter(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Operational Date</Label>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Quick Search (current page)</Label>
          <Input
            placeholder="Bus, station, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div>
          <h2 className="text-lg font-semibold">Bulk Operations</h2>
          <p className="text-sm text-muted-foreground">
            Upload an XLSX/CSV file for bulk ingest.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default Operational Date (optional)</Label>
            <Input
              type="date"
              value={bulkDefaultDate}
              onChange={(e) => setBulkDefaultDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Bulk Upload File (XLSX/CSV)</Label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
            />
            <Button type="button" variant="outline" onClick={submitBulkUpload} disabled={bulkSubmitting}>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
          </div>
        </div>

      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        pagination={pagination}
        onPageChange={(newPage) => {
          if (newPage !== page) setPage(newPage);
        }}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        actions={actions}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Standby Entry' : 'Create Standby Entry'}</DialogTitle>
            <DialogDescription>
              Define standby bus availability for station/date allocation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bus</Label>
              <Select
                value={formData.bus}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, bus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus._id} value={bus._id}>
                      {bus.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Station</Label>
              <Select
                value={formData.station}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, station: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station._id} value={station._id}>
                      {station.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Operational Date</Label>
              <Input
                type="date"
                value={formData.operationalDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, operationalDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Bus Type Scopes (comma separated)</Label>
              <Input
                value={formData.busTypeScopes}
                onChange={(e) => setFormData((prev) => ({ ...prev, busTypeScopes: e.target.value }))}
                placeholder="e.g. mini, executive"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Route Scopes (optional)</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {routes.map((route) => {
                const checked = formData.routeScopes.includes(route._id);
                return (
                  <div key={route._id} className="flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setFormData((prev) => {
                          const next = new Set(prev.routeScopes);
                          if (value) next.add(route._id);
                          else next.delete(route._id);
                          return { ...prev, routeScopes: Array.from(next) };
                        });
                      }}
                    />
                    <span className="text-sm">{route.title || `${route.origin || ''} - ${route.destination || ''}`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={formData.active}
              onCheckedChange={(value) => setFormData((prev) => ({ ...prev, active: Boolean(value) }))}
            />
            <Label>Active (sets status to available)</Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={submitting}>
              {editingRecord ? 'Update Entry' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.active ? 'Deactivate standby entry?' : 'Activate standby entry?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.active
                ? 'This will mark the standby entry as inactive and remove it from allocation eligibility.'
                : 'This will mark the standby entry as available for allocation.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={togglingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} disabled={togglingStatus}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}