'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, RefreshCw, Wallet as WalletIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Wallet-side classification of transaction types written by the backend
// (see wallet.controller.js — Deposit, Refund, Payment, Withdraw, Transfer).
// "Transfer" can be either direction; we infer from `transferUserId` later.
const CREDIT_TYPES = ['Deposit', 'Refund'];
const DEBIT_TYPES = ['Payment', 'Withdraw'];

const formatNaira = (n: number | undefined | null) =>
  `₦${(Number(n) || 0).toLocaleString('en-NG')}`;

const formatDate = (s: string | Date | undefined | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const PAGE_SIZE = 20;

type Tab = 'all' | 'credits' | 'debits';

interface TxItem {
  _id: string;
  type?: string;
  amount?: number;
  status?: string;
  trans_ref?: string;
  paystackReference?: string;
  flutterwaveReference?: string;
  medium?: string;
  transferUserId?: { firstName?: string; lastName?: string; email?: string } | string;
  transferUserName?: string;
  createdAt?: string;
}

interface SummaryData {
  counts?: {
    deposits?: number;
    withdrawals?: number;
    payments?: number;
    refunds?: number;
  };
  totals?: {
    deposits?: number;
    withdrawals?: number;
    payments?: number;
    refunds?: number;
  };
  recentTransactions?: TxItem[];
}

interface UserWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
}

export function UserWalletModal({ open, onOpenChange, user }: UserWalletModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('all');
  const [balance, setBalance] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);

  const userId = user?._id;
  const userName = useMemo(
    () => `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—',
    [user]
  );

  const totalCredited = useMemo(() => {
    const t = summary?.totals;
    return (t?.deposits || 0) + (t?.refunds || 0);
  }, [summary]);

  const totalDebited = useMemo(() => {
    const t = summary?.totals;
    return (t?.payments || 0) + (t?.withdrawals || 0);
  }, [summary]);

  const fetchHeader = useCallback(async () => {
    if (!userId) return;
    setLoadingHeader(true);
    try {
      const [balRes, sumRes] = await Promise.all([
        fetch(`/api/admin/wallets/${userId}/balance`),
        fetch(`/api/admin/wallets/${userId}/summary`),
      ]);
      if (balRes.ok) {
        const j = await balRes.json();
        setBalance(typeof j.balance === 'number' ? j.balance : 0);
      } else {
        setBalance(null);
      }
      if (sumRes.ok) {
        const j = await sumRes.json();
        setSummary(j?.data || null);
      } else {
        setSummary(null);
      }
    } catch (e: any) {
      toast({
        title: 'Wallet header failed',
        description: e?.message || 'Could not load wallet summary.',
        variant: 'destructive',
      });
    } finally {
      setLoadingHeader(false);
    }
  }, [userId, toast]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    setLoadingTx(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      // Tab filter — translated to type= so the server-side count is accurate.
      if (tab === 'credits') params.set('typeIn', CREDIT_TYPES.join(','));
      else if (tab === 'debits') params.set('typeIn', DEBIT_TYPES.join(','));
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/admin/wallets/${userId}/transactions?${params.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);

      // The backend currently filters on `type` exact-match (single value). For
      // the credits/debits tabs we have multiple types, so when the backend
      // doesn't honor `typeIn`, fall back to client-side filtering of the page.
      let items: TxItem[] = Array.isArray(j?.data) ? j.data : [];
      if (tab === 'credits') {
        items = items.filter((tx) => CREDIT_TYPES.includes(tx.type || ''));
      } else if (tab === 'debits') {
        items = items.filter((tx) => DEBIT_TYPES.includes(tx.type || ''));
      }
      setTransactions(items);
      setTotal(j?.pagination?.total ?? items.length);
      setTotalPages(j?.pagination?.pages ?? 1);
    } catch (e: any) {
      toast({
        title: 'Wallet transactions failed',
        description: e?.message || 'Could not load wallet transactions.',
        variant: 'destructive',
      });
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  }, [userId, page, tab, from, to, toast]);

  useEffect(() => {
    if (open && userId) {
      setPage(1);
      setTab('all');
      setFrom('');
      setTo('');
      fetchHeader();
    }
    // Reset state on close so reopening a different user starts clean.
    if (!open) {
      setBalance(null);
      setSummary(null);
      setTransactions([]);
      setTotal(0);
      setTotalPages(1);
    }
  }, [open, userId, fetchHeader]);

  useEffect(() => {
    if (open && userId) {
      fetchTransactions();
    }
  }, [open, userId, page, tab, from, to, fetchTransactions]);

  const downloadCsv = () => {
    if (!transactions.length) {
      toast({ title: 'Nothing to export', description: 'No transactions in view.' });
      return;
    }
    // Audit-friendly CSV — what the admin currently sees, including filters.
    const header = [
      'Date',
      'Type',
      'Direction',
      'Amount (₦)',
      'Status',
      'Mode',
      'Reference',
      'Counterparty',
    ];
    const rows = transactions.map((tx) => {
      const direction = CREDIT_TYPES.includes(tx.type || '')
        ? 'credit'
        : DEBIT_TYPES.includes(tx.type || '')
        ? 'debit'
        : 'transfer';
      const counterparty =
        typeof tx.transferUserId === 'object' && tx.transferUserId
          ? `${tx.transferUserId.firstName || ''} ${tx.transferUserId.lastName || ''}`.trim() ||
            tx.transferUserId.email ||
            ''
          : tx.transferUserName || '';
      const reference =
        tx.paystackReference || tx.flutterwaveReference || tx.trans_ref || '';
      return [
        formatDate(tx.createdAt),
        tx.type || '',
        direction,
        Number(tx.amount) || 0,
        tx.status || '',
        tx.medium || '',
        reference,
        counterparty,
      ];
    });
    const escape = (v: any) => {
      const s = (v ?? '').toString();
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...rows]
      .map((r) => r.map(escape).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet_${userId}_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5" /> Wallet · {userName}
          </DialogTitle>
          <DialogDescription>
            {user?.email || user?.phone || 'User wallet'} — current balance,
            credit / debit history and full audit trail.
          </DialogDescription>
        </DialogHeader>

        {/* Header KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <div className="rounded border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Current balance
            </div>
            {loadingHeader ? (
              <Skeleton className="h-7 w-32 mt-1" />
            ) : (
              <div className="text-2xl font-semibold mt-1">{formatNaira(balance)}</div>
            )}
          </div>
          <div className="rounded border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Total credited
            </div>
            {loadingHeader ? (
              <Skeleton className="h-7 w-32 mt-1" />
            ) : (
              <div className="text-2xl font-semibold mt-1 text-emerald-600">
                {formatNaira(totalCredited)}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.counts?.deposits ?? 0} top-ups · {summary?.counts?.refunds ?? 0} refunds
            </div>
          </div>
          <div className="rounded border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Total debited
            </div>
            {loadingHeader ? (
              <Skeleton className="h-7 w-32 mt-1" />
            ) : (
              <div className="text-2xl font-semibold mt-1 text-rose-600">
                {formatNaira(totalDebited)}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.counts?.payments ?? 0} bookings · {summary?.counts?.withdrawals ?? 0} withdrawals
            </div>
          </div>
        </div>

        {/* Filters + actions */}
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchHeader();
                fetchTransactions();
              }}
              disabled={loadingHeader || loadingTx}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCsv}
              disabled={!transactions.length}
            >
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as Tab);
            setPage(1);
          }}
          className="mt-4"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="debits">Debits</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <TransactionsTable
              transactions={transactions}
              loading={loadingTx}
            />
            <div className="flex items-center justify-between mt-3 text-sm">
              <div className="text-muted-foreground">
                {total > 0 ? (
                  <>
                    Page <span className="font-medium">{page}</span> of{' '}
                    <span className="font-medium">{totalPages}</span> ·{' '}
                    <span className="font-medium">{total}</span> total
                  </>
                ) : (
                  '0 transactions'
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loadingTx}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loadingTx}
                >
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function TransactionsTable({
  transactions,
  loading,
}: {
  transactions: TxItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="rounded border bg-muted/20 py-10 text-center text-sm text-muted-foreground">
        No transactions in this view.
      </div>
    );
  }

  return (
    <div className="rounded border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Counterparty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isCredit = CREDIT_TYPES.includes(tx.type || '');
            const isDebit = DEBIT_TYPES.includes(tx.type || '');
            const counterparty =
              typeof tx.transferUserId === 'object' && tx.transferUserId
                ? `${tx.transferUserId.firstName || ''} ${tx.transferUserId.lastName || ''}`.trim() ||
                  tx.transferUserId.email ||
                  '—'
                : tx.transferUserName || '—';
            const reference =
              tx.paystackReference || tx.flutterwaveReference || tx.trans_ref || '—';
            return (
              <TableRow key={tx._id}>
                <TableCell className="whitespace-nowrap">{formatDate(tx.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={isCredit ? 'default' : isDebit ? 'destructive' : 'secondary'}>
                    {tx.type || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    isCredit ? 'text-emerald-600' : isDebit ? 'text-rose-600' : ''
                  }`}
                >
                  {isDebit ? '−' : isCredit ? '+' : ''}
                  {formatNaira(tx.amount)}
                </TableCell>
                <TableCell>{tx.status || '—'}</TableCell>
                <TableCell>{tx.medium || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{reference}</TableCell>
                <TableCell>{counterparty}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
