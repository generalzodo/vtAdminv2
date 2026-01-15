'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Withdrawal {
  _id: string;
  amount: number;
  status: string;
  userId?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  bankName?: string;
  accountNumber?: string;
  createdAt: string;
}

export function WithdrawalsClient() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
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
  const [fromDateFilter, setFromDateFilter] = useState<string>('');
  const [toDateFilter, setToDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchWithdrawals = async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: currentLimit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (fromDateFilter) params.append('from', fromDateFilter);
      if (toDateFilter) params.append('to', toDateFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/withdrawals?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.data || []);
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
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals(page, limit);
  }, [page, limit, statusFilter, fromDateFilter, toDateFilter, searchTerm]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const columns: Column<Withdrawal>[] = [
    { 
      key: 'name', 
      header: 'Name', 
      cell: (row) => row.userId 
        ? `${row.userId.firstName || ''}, ${row.userId.lastName || ''}` 
        : 'N/A' 
    },
    { key: 'phone', header: 'Phone', cell: (row) => row.userId?.phone || 'N/A' },
    { key: 'amount', header: 'Amount', cell: (row) => `₦${row.amount?.toLocaleString() || '0'}` },
    { key: 'bankName', header: 'Bank Name', cell: (row) => row.bankName || 'N/A' },
    { key: 'accountNumber', header: 'Account Number', cell: (row) => row.accountNumber || 'N/A' },
    { 
      key: 'status', 
      header: 'Status', 
      cell: (row) => (
        <Badge variant={row.status === 'approved' ? 'success' : row.status === 'pending' ? 'secondary' : 'destructive'}>
          {row.status}
        </Badge>
      )
    },
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.createdAt) },
  ];

  const approveWithdrawal = async (withdrawalId: string) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await response.json();
      if (data.success) {
        fetchWithdrawals();
      } else {
        console.error('Failed to approve withdrawal:', data.error);
      }
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    }
  };

  const rejectWithdrawal = async (withdrawalId: string) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      const data = await response.json();
      if (data.success) {
        fetchWithdrawals();
      } else {
        console.error('Failed to reject withdrawal:', data.error);
      }
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    }
  };

  const actions = (row: Withdrawal) => (
    row.status === 'pending' ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => approveWithdrawal(row._id)}
          >
            Approve Withdrawal
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => rejectWithdrawal(row._id)}
            className="text-destructive"
          >
            Reject Withdrawal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Withdrawals</h1>
          <p className="text-muted-foreground">
            All Withdrawals: <span className="font-semibold">{pagination.total}</span>
          </p>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={fromDateFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromDateFilter(e.target.value)}
                className="w-[180px]"
                placeholder="From Date"
              />
              <Input
                type="date"
                value={toDateFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToDateFilter(e.target.value)}
                className="w-[180px]"
                placeholder="To Date"
              />
            </div>
          </div>
          <DataTable
            columns={columns}
            data={withdrawals}
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
    </div>
  );
}

