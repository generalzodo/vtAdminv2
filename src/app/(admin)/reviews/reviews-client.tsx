'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  status?: string;
  userId?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  bookingId?: {
    bookingId?: string;
    tripDate?: string;
    from?: string;
    to?: string;
  };
  createdAt: string;
}

export function ReviewsClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
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
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  const fetchReviews = async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: currentLimit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (ratingFilter !== 'all') params.append('rating', ratingFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setReviews(data.data || []);
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
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(page, limit);
  }, [page, limit, statusFilter, ratingFilter, fromDate, toDate, searchTerm]);

  const updateReviewStatus = async (reviewId: string, status: string) => {
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchReviews(page, limit);
      } else {
        console.error('Failed to update review status:', data.error);
      }
    } catch (error) {
      console.error('Error updating review status:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating);
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'approved' ? 'success' : status === 'pending' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const columns: Column<Review>[] = [
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.createdAt) },
    { 
      key: 'passenger', 
      header: 'Passenger',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.userId?.firstName} {row.userId?.lastName}</p>
          <p className="text-sm text-muted-foreground">{row.userId?.email}</p>
          {row.userId?.phone && (
            <p className="text-sm text-muted-foreground">{row.userId.phone}</p>
          )}
        </div>
      )
    },
    { 
      key: 'booking', 
      header: 'Booking',
      cell: (row) => (
        <div>
          <p className="text-sm font-mono">{row.bookingId?.bookingId || 'N/A'}</p>
          {row.bookingId?.tripDate && (
            <p className="text-xs text-muted-foreground">{row.bookingId.tripDate}</p>
          )}
        </div>
      )
    },
    { 
      key: 'route', 
      header: 'Route',
      cell: (row) => row.bookingId?.from && row.bookingId?.to 
        ? `${row.bookingId.from} → ${row.bookingId.to}`
        : 'N/A'
    },
    { 
      key: 'rating', 
      header: 'Rating',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <span>{renderStars(row.rating)}</span>
          <span className="text-sm text-muted-foreground">({row.rating})</span>
        </div>
      )
    },
    { 
      key: 'comment', 
      header: 'Comment',
      cell: (row) => (
        <p className="text-sm line-clamp-3 italic text-muted-foreground">
          {row.comment || 'No comment'}
        </p>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      cell: (row) => getStatusBadge(row.status || 'pending')
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => row.status === 'pending' ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            disabled={processingId === row._id}
            onClick={() => updateReviewStatus(row._id, 'approved')}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={processingId === row._id}
            onClick={() => updateReviewStatus(row._id, 'rejected')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Passenger Reviews</h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const res = await fetch('/api/admin/exports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'reviews',
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
                description: 'Your reviews export is generating. Download it from the Exports icon when ready.',
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={fromDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newFromDate = e.target.value;
                  setFromDate(newFromDate);
                  // Clear toDate if it's before the new fromDate
                  if (toDate && newFromDate && toDate < newFromDate) {
                    setToDate('');
                  }
                }}
                max={toDate || undefined}
                className="w-[180px]"
                placeholder="From Date"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToDate(e.target.value)}
                min={fromDate || undefined}
                className="w-[180px]"
                placeholder="To Date"
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={reviews}
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
            searchable={true}
            onSearch={(search) => {
              setSearchTerm(search);
              setPage(1); // Reset to first page when searching
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

