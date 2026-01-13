'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';

interface Price {
  _id: string;
  origin: string;
  destination: string;
  price: number;
  premiumPrice: number;
  discountedPrice: number;
  bus?: {
    _id: string;
    title?: string;
    type?: string;
  };
  createdAt: string;
}

export function PricesTab() {
  const [prices, setPrices] = useState<Price[]>([]);
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
  const [editingPrice, setEditingPrice] = useState<Price | null>(null);
  const [formData, setFormData] = useState({ price: '', premiumPrice: '', discountedPrice: '' });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allPrices, setAllPrices] = useState<Price[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrices();
  }, []);

  useEffect(() => {
    // Reset to first page when search changes
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    // Filter and paginate prices when page, limit, or search changes
    filterAndPaginatePrices();
  }, [page, limit, searchTerm, allPrices]);

  const filterAndPaginatePrices = () => {
    let filteredPrices = [...allPrices];
    
    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredPrices = filteredPrices.filter((price: any) => {
        const origin = (price.origin || '').toLowerCase();
        const destination = (price.destination || '').toLowerCase();
        const route = `${origin} - ${destination}`.toLowerCase();
        const busType = (price.bus?.title || price.bus?.type || '').toLowerCase();
        
        return origin.includes(searchLower) ||
               destination.includes(searchLower) ||
               route.includes(searchLower) ||
               busType.includes(searchLower);
      });
    }
    
    // Apply pagination
    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPrices = filteredPrices.slice(startIndex, endIndex);
    
    setPrices(paginatedPrices);
    setPagination({
      page: pageNum,
      limit: limitNum,
      total: filteredPrices.length,
      pages: Math.ceil(filteredPrices.length / limitNum),
    });
  };

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/prices');
      const data = await response.json();
      if (data.success) {
        setAllPrices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load prices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (price: Price) => {
    setEditingPrice(price);
    setFormData({
      price: price.price?.toString() || '0',
      premiumPrice: price.premiumPrice?.toString() || '0',
      discountedPrice: price.discountedPrice?.toString() || '0',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPrice(null);
    setFormData({ price: '', premiumPrice: '', discountedPrice: '' });
  };

  const handleSubmit = async () => {
    if (!formData.price || !formData.premiumPrice || !formData.discountedPrice) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all price fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!editingPrice) return;

      const response = await fetch(`/api/admin/prices/${editingPrice._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: parseFloat(formData.price),
          premiumPrice: parseFloat(formData.premiumPrice),
          discountedPrice: parseFloat(formData.discountedPrice),
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Price updated successfully',
        });
        handleCloseDialog();
        fetchPrices();
      } else {
        throw new Error(data.error || 'Failed to update price');
      }
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update price',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Price>[] = [
    { key: 'origin', header: 'Origin' },
    { key: 'destination', header: 'Destination' },
    { key: 'price', header: 'Price', cell: (row) => `₦${row.price?.toLocaleString() || '0'}` },
    { key: 'premiumPrice', header: 'Premium Price', cell: (row) => `₦${row.premiumPrice?.toLocaleString() || '0'}` },
    { key: 'discountedPrice', header: 'Discounted Value', cell: (row) => `₦${row.discountedPrice?.toLocaleString() || '0'}` },
    { key: 'bus', header: 'Bus', cell: (row) => row.bus?.title || row.bus?.type || 'N/A' },
  ];

  const actions = (row: Price) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleOpenDialog(row)}
    >
      <Edit className="h-4 w-4 mr-1" />
      Change Price
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Price Management</h2>
          <p className="text-muted-foreground">Manage prices for routes</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={prices}
        loading={loading}
        pagination={pagination}
        onPageChange={(newPage) => {
          setPage(newPage);
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

      {/* Edit Price Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Price</DialogTitle>
            <DialogDescription>
              Update price for {editingPrice?.origin} → {editingPrice?.destination}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                min="0"
                step="1"
              />
            </div>
            <div>
              <Label htmlFor="premiumPrice">Premium Price (₦)</Label>
              <Input
                id="premiumPrice"
                type="number"
                value={formData.premiumPrice}
                onChange={(e) => setFormData({ ...formData, premiumPrice: e.target.value })}
                placeholder="0"
                min="0"
                step="1"
              />
            </div>
            <div>
              <Label htmlFor="discountedPrice">Discounted Price (₦)</Label>
              <Input
                id="discountedPrice"
                type="number"
                value={formData.discountedPrice}
                onChange={(e) => setFormData({ ...formData, discountedPrice: e.target.value })}
                placeholder="0"
                min="0"
                step="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

