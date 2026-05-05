'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useIsSuperAdmin, useHasPermission } from '@/hooks/use-permissions';
import { Loader2, DollarSign, RefreshCw, Calculator, Calendar, Download } from 'lucide-react';

interface BookingRecord {
	_id: string;
	bookingId: string;
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	amount: number;
	tripAmount: number;
	returnAmount: number;
	from: string;
	to: string;
	mode: string;
	paymentStatus: string;
	createdAt: string;
	agentCommission: number | null;
}

interface RescheduledRecord extends BookingRecord {
	rescheduleFee: number;
	fareDifference: number;
	rescheduledAt: string;
}

interface Summary {
	totalBookingAmount: number;
	totalBookingCount: number;
	totalReschedulingFees: number;
	totalReschedulingFareDiff: number;
	totalReschedulingAmount: number;
	totalReschedulingCount: number;
	totalManifestAmount?: number;
	totalManifestCount?: number;
	grandTotal: number;
}

interface ManifestPaymentRecord {
	_id: string;
	tripDate?: string;
	lineKind: string;
	passengerLabel?: string;
	kgs?: number;
	amount: number;
	mode: string;
	paymentMethod?: string;
	recordedAt?: string;
	routeTitle?: string;
	vehicleNo?: string;
	tripTime?: string;
}

interface FinancialsData {
	success: boolean;
	month: number | null;
	year: number | null;
	summary: Summary;
	bookings: BookingRecord[];
	rescheduledBookings: RescheduledRecord[];
	manifestPayments?: ManifestPaymentRecord[];
}

const MONTHS = [
	{ value: '1', label: 'January' },
	{ value: '2', label: 'February' },
	{ value: '3', label: 'March' },
	{ value: '4', label: 'April' },
	{ value: '5', label: 'May' },
	{ value: '6', label: 'June' },
	{ value: '7', label: 'July' },
	{ value: '8', label: 'August' },
	{ value: '9', label: 'September' },
	{ value: '10', label: 'October' },
	{ value: '11', label: 'November' },
	{ value: '12', label: 'December' },
];

const PAYMENT_TYPES = [
	{ value: 'all', label: 'All Payment Types' },
	{ value: 'paystack', label: 'Paystack' },
	{ value: 'quickteller', label: 'Quickteller' },
	{ value: 'flutterwave', label: 'Flutterwave' },
	{ value: 'monnify', label: 'Monnify' },
	{ value: 'wallet', label: 'Wallet' },
	{ value: 'admin', label: 'Admin' },
];

const PAYMENT_STATUSES = [
	{ value: 'all', label: 'All Statuses' },
	{ value: 'success', label: 'Success' },
	{ value: 'admin paid', label: 'Admin Paid' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'failed', label: 'Failed' },
	{ value: 'cancelled', label: 'Cancelled' },
];

const RECORD_TYPES = [
	{ value: 'all', label: 'All Records' },
	{ value: 'bookings', label: 'Bookings Only' },
	{ value: 'rescheduled', label: 'Rescheduling Only' },
	{ value: 'manifest', label: 'Manifest (luggage & waybills)' },
];

function formatCurrency(amount: number) {
	return new Intl.NumberFormat('en-NG', {
		style: 'currency',
		currency: 'NGN',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);
}

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString('en-NG', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

export function FinancialsClient() {
	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
	const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
	const [paymentType, setPaymentType] = useState('all');
	const [paymentStatus, setPaymentStatus] = useState('all');
	const [recordType, setRecordType] = useState('all');
	const [search, setSearch] = useState('');
	const [fromLocation, setFromLocation] = useState('');
	const [toLocation, setToLocation] = useState('');
	const [percentage, setPercentage] = useState('');
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [data, setData] = useState<FinancialsData | null>(null);
	const [error, setError] = useState('');

	const isSuperAdmin = useIsSuperAdmin();
	const canViewFinancials = useHasPermission('financials.view');
	const canViewReports = useHasPermission('reports.view');
	const canExportFinancials = useHasPermission('financials.export');
	const canExportReports = useHasPermission('reports.export');

	const hasAccess = isSuperAdmin || canViewFinancials || canViewReports;
	const canExport = isSuperAdmin || canExportFinancials || canExportReports || hasAccess;

	const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

	const buildQueryParams = useCallback(() => {
		const params = new URLSearchParams({
			month: selectedMonth,
			year: selectedYear,
			paymentType,
			paymentStatus,
			recordType,
		});

		if (search.trim()) params.set('search', search.trim());
		if (fromLocation.trim()) params.set('fromLocation', fromLocation.trim());
		if (toLocation.trim()) params.set('toLocation', toLocation.trim());

		return params;
	}, [selectedMonth, selectedYear, paymentType, paymentStatus, recordType, search, fromLocation, toLocation]);

	const fetchFinancials = useCallback(async () => {
		try {
			setLoading(true);
			setError('');
			const params = buildQueryParams();
			const res = await fetch(`/api/admin/payments?${params.toString()}`, {
				credentials: 'include',
			});
			const result = await res.json();
			if (!res.ok) {
				setError(result.error || 'Failed to fetch financials');
				return;
			}
			setData(result);
		} catch (err) {
			console.error('Error fetching financials:', err);
			setError('Failed to fetch financials data');
		} finally {
			setLoading(false);
		}
	}, [buildQueryParams]);

	const handleExport = useCallback(async () => {
		try {
			setExporting(true);
			setError('');
			const params = buildQueryParams();
			const res = await fetch(`/api/admin/payments/export?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to export financials' }));
				setError(err.error || 'Failed to export financials');
				return;
			}

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `financials-summary-${selectedMonth}-${selectedYear}.xlsx`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Error exporting financials:', err);
			setError('Failed to export financials');
		} finally {
			setExporting(false);
		}
	}, [buildQueryParams, selectedMonth, selectedYear]);

	useEffect(() => {
		if (hasAccess) {
			fetchFinancials();
		}
	}, [hasAccess, fetchFinancials]);

	if (!hasAccess) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">You do not have permission to view this page.</p>
			</div>
		);
	}

	const pct = parseFloat(percentage) || 0;
	const bookingCalc = data ? (data.summary.totalBookingAmount * pct) / 100 : 0;
	const reschedulingCalc = data ? (data.summary.totalReschedulingAmount * pct) / 100 : 0;
	const manifestCalc = data ? ((data.summary.totalManifestAmount ?? 0) * pct) / 100 : 0;
	const grandTotalCalc = data ? (data.summary.grandTotal * pct) / 100 : 0;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Financials</h1>
					<p className="text-muted-foreground">Financial summary with filters and export</p>
				</div>
				<Button onClick={handleExport} disabled={loading || exporting || !canExport}>
					{exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
					{exporting ? 'Exporting...' : 'Download Excel'}
				</Button>
			</div>

			<Card>
				<CardContent className="pt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label>Month</Label>
							<Select value={selectedMonth} onValueChange={setSelectedMonth}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MONTHS.map((m) => (
										<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Year</Label>
							<Select value={selectedYear} onValueChange={setSelectedYear}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map((y) => (
										<SelectItem key={y} value={y}>{y}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Payment Type</Label>
							<Select value={paymentType} onValueChange={setPaymentType}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAYMENT_TYPES.map((p) => (
										<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Payment Status</Label>
							<Select value={paymentStatus} onValueChange={setPaymentStatus}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAYMENT_STATUSES.map((p) => (
										<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Record Type</Label>
							<Select value={recordType} onValueChange={setRecordType}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{RECORD_TYPES.map((r) => (
										<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>From (Route Stop)</Label>
							<Input placeholder="e.g. Lagos" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} />
						</div>

						<div className="space-y-2">
							<Label>To (Route Stop)</Label>
							<Input placeholder="e.g. Abuja" value={toLocation} onChange={(e) => setToLocation(e.target.value)} />
						</div>

						<div className="space-y-2">
							<Label>Search</Label>
							<Input placeholder="Booking ID, name, phone, email" value={search} onChange={(e) => setSearch(e.target.value)} />
						</div>

						<div className="space-y-2">
							<Label>Percentage (%)</Label>
							<Input
								type="number"
								min="0"
								max="100"
								step="0.01"
								placeholder="e.g. 10"
								value={percentage}
								onChange={(e) => setPercentage(e.target.value)}
							/>
						</div>
					</div>

					<div className="mt-4 flex gap-2">
						<Button onClick={fetchFinancials} disabled={loading}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
							Apply Filters
						</Button>
					</div>
				</CardContent>
			</Card>

			{error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}

			{loading && (
				<div className="flex items-center justify-center h-32">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{data && !loading && (
				<>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
								<DollarSign className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{formatCurrency(data.summary.totalBookingAmount)}</div>
								<p className="text-xs text-muted-foreground">{data.summary.totalBookingCount} bookings</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Rescheduling Payments</CardTitle>
								<RefreshCw className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{formatCurrency(data.summary.totalReschedulingAmount)}</div>
								<p className="text-xs text-muted-foreground">
									{data.summary.totalReschedulingCount} records · Fees: {formatCurrency(data.summary.totalReschedulingFees)}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Manifest (luggage &amp; waybills)</CardTitle>
								<DollarSign className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{formatCurrency(data.summary.totalManifestAmount ?? 0)}</div>
								<p className="text-xs text-muted-foreground">{data.summary.totalManifestCount ?? 0} cash/transfer lines</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Grand Total</CardTitle>
								<Calendar className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{formatCurrency(data.summary.grandTotal)}</div>
								<p className="text-xs text-muted-foreground">
									{data.month && data.year ? `${MONTHS[data.month - 1]?.label} ${data.year}` : 'Filtered range'}
								</p>
							</CardContent>
						</Card>

						<Card className="border-primary/30 bg-primary/5">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Calculated ({pct || 0}%)</CardTitle>
								<Calculator className="h-4 w-4 text-primary" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-primary">{formatCurrency(grandTotalCalc)}</div>
								<p className="text-xs text-muted-foreground">
									Bookings: {formatCurrency(bookingCalc)} · Resch: {formatCurrency(reschedulingCalc)} · Manifest: {formatCurrency(manifestCalc)}
								</p>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Financial Records</CardTitle>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="bookings">
								<TabsList>
									<TabsTrigger value="bookings">Bookings ({data.summary.totalBookingCount})</TabsTrigger>
									<TabsTrigger value="rescheduling">Rescheduling ({data.summary.totalReschedulingCount})</TabsTrigger>
									<TabsTrigger value="manifest">
										Manifest ({data.summary.totalManifestCount ?? (data.manifestPayments?.length ?? 0)})
									</TabsTrigger>
								</TabsList>

								<TabsContent value="bookings">
									<div className="rounded-md border overflow-auto max-h-[500px]">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Booking ID</TableHead>
													<TableHead>Passenger</TableHead>
													<TableHead>Route</TableHead>
													<TableHead>Type</TableHead>
													<TableHead>Status</TableHead>
													<TableHead className="text-right">Amount</TableHead>
													<TableHead className="text-right">{pct ? `${pct}%` : '%'}</TableHead>
													<TableHead>Date</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data.bookings.length === 0 ? (
													<TableRow>
														<TableCell colSpan={8} className="text-center text-muted-foreground py-8">No bookings found for filters</TableCell>
													</TableRow>
												) : (
													data.bookings.map((b) => (
														<TableRow key={b._id}>
															<TableCell className="font-mono text-xs">{b.bookingId}</TableCell>
															<TableCell>{b.firstName} {b.lastName}</TableCell>
															<TableCell className="text-xs">{b.from} → {b.to}</TableCell>
															<TableCell className="text-xs">{b.mode}</TableCell>
															<TableCell className="text-xs">{b.paymentStatus}</TableCell>
															<TableCell className="text-right font-medium">{formatCurrency(b.amount)}</TableCell>
															<TableCell className="text-right text-muted-foreground">{pct ? formatCurrency((b.amount * pct) / 100) : '—'}</TableCell>
															<TableCell className="text-xs">{formatDate(b.createdAt)}</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</TabsContent>

								<TabsContent value="manifest">
									<div className="rounded-md border overflow-auto max-h-[500px]">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Trip date</TableHead>
													<TableHead>Route</TableHead>
													<TableHead>Kind</TableHead>
													<TableHead>Passenger / label</TableHead>
													<TableHead className="text-right">Kg</TableHead>
													<TableHead>Pay</TableHead>
													<TableHead className="text-right">Amount</TableHead>
													<TableHead className="text-right">{pct ? `${pct}%` : '%'}</TableHead>
													<TableHead>Recorded</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{(data.manifestPayments ?? []).length === 0 ? (
													<TableRow>
														<TableCell colSpan={9} className="text-center text-muted-foreground py-8">
															No manifest luggage or waybill payments for filters (use Payment Type “All” to include manifest lines).
														</TableCell>
													</TableRow>
												) : (
													(data.manifestPayments ?? []).map((m) => (
														<TableRow key={m._id}>
															<TableCell className="text-xs whitespace-nowrap">{m.tripDate || '—'}</TableCell>
															<TableCell className="text-xs max-w-[160px] truncate">{m.routeTitle || '—'}</TableCell>
															<TableCell className="text-xs">{m.lineKind}</TableCell>
															<TableCell className="text-xs">{m.passengerLabel}</TableCell>
															<TableCell className="text-right">{m.kgs ?? '—'}</TableCell>
															<TableCell className="text-xs">{m.paymentMethod}</TableCell>
															<TableCell className="text-right font-medium">{formatCurrency(m.amount)}</TableCell>
															<TableCell className="text-right text-muted-foreground">
																{pct ? formatCurrency((m.amount * pct) / 100) : '—'}
															</TableCell>
															<TableCell className="text-xs">{formatDate(m.recordedAt || '')}</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</TabsContent>

								<TabsContent value="rescheduling">
									<div className="rounded-md border overflow-auto max-h-[500px]">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Booking ID</TableHead>
													<TableHead>Passenger</TableHead>
													<TableHead>Route</TableHead>
													<TableHead>Type</TableHead>
													<TableHead>Status</TableHead>
													<TableHead className="text-right">Resch. Fee</TableHead>
													<TableHead className="text-right">Fare Diff</TableHead>
													<TableHead className="text-right">Amount</TableHead>
													<TableHead className="text-right">{pct ? `${pct}%` : '%'}</TableHead>
													<TableHead>Date</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data.rescheduledBookings.length === 0 ? (
													<TableRow>
														<TableCell colSpan={10} className="text-center text-muted-foreground py-8">No rescheduled records found for filters</TableCell>
													</TableRow>
												) : (
													data.rescheduledBookings.map((b) => (
														<TableRow key={b._id}>
															<TableCell className="font-mono text-xs">{b.bookingId}</TableCell>
															<TableCell>{b.firstName} {b.lastName}</TableCell>
															<TableCell className="text-xs">{b.from} → {b.to}</TableCell>
															<TableCell className="text-xs">{b.mode}</TableCell>
															<TableCell className="text-xs">{b.paymentStatus}</TableCell>
															<TableCell className="text-right">{formatCurrency(b.rescheduleFee || 0)}</TableCell>
															<TableCell className="text-right">{formatCurrency(b.fareDifference || 0)}</TableCell>
															<TableCell className="text-right font-medium">{formatCurrency(b.amount)}</TableCell>
															<TableCell className="text-right text-muted-foreground">{pct ? formatCurrency((b.amount * pct) / 100) : '—'}</TableCell>
															<TableCell className="text-xs">{formatDate(b.rescheduledAt || b.createdAt)}</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}

export const PaymentsClient = FinancialsClient;