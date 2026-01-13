'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, TrendingUp, Users, ShoppingCart, Activity, Route, UserCheck, CheckCircle2, Clock, XCircle, AlertCircle, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  totalBookings: number;
  successfulBookings: number;
  totalRevenue: number;
  avgBookingValue: number;
  conversionRate: number;
  totalUsers: number;
  totalAgents: number;
  activeAgents: number;
  totalTrips: number;
  bookingsByStatus: Record<string, number>;
  bookingsByPaymentStatus: Record<string, number>;
  tripsByStatus: Record<string, number>;
  revenueByDate: Record<string, number>;
  bookingsByDate: Record<string, number>;
  revenueByMonth: Record<string, number>;
  bookingsByMonth: Record<string, number>;
  revenueByQuarter: Record<string, number>;
  bookingsByQuarter: Record<string, number>;
  revenueByYear: Record<string, number>;
  bookingsByYear: Record<string, number>;
  topRoutes: Array<{ route: string; bookings: number; revenue: number }>;
  topBusTypes: Array<{ busType: string; bookings: number; revenue: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [viewPeriod, setViewPeriod] = useState<'yearly' | 'quarterly' | 'monthly'>('monthly');

  useEffect(() => {
    fetchStats();
  }, [dateRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    if (dateRange === 'all') {
      return { from: null, to: null };
    }
    
    if (dateRange === 'custom') {
      if (customStartDate && customEndDate) {
        // Format dates as YYYY-MM-DDTHH:mm:ss (without timezone to avoid conversion issues)
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        return {
          from: `${formatDate(customStartDate)}T00:00:00`,
          to: `${formatDate(customEndDate)}T23:59:59`,
        };
      }
      return { from: null, to: null };
    }

    const today = new Date();
    const fromDate = new Date();
    
    switch (dateRange) {
      case '7d':
        fromDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        fromDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        fromDate.setDate(today.getDate() - 90);
        break;
      case '1y':
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    fromDate.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);
    
    // Format dates as YYYY-MM-DDTHH:mm:ss
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };
    
    return {
      from: formatDate(fromDate),
      to: formatDate(today),
    };
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const response = await fetch(`/api/admin/dashboard?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data based on selected view period
  const getRevenueData = () => {
    let data: Record<string, number> = {};
    let formatKey: (key: string) => string;

    switch (viewPeriod) {
      case 'yearly':
        data = stats?.revenueByYear || {};
        formatKey = (key) => key; // Just the year
        break;
      case 'quarterly':
        data = stats?.revenueByQuarter || {};
        formatKey = (key) => key.replace('-Q', ' Q'); // "2024 Q1"
        break;
      case 'monthly':
        data = stats?.revenueByMonth || {};
        formatKey = (key) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return format(date, 'MMM yyyy'); // "Nov 2024"
        };
        break;
      default:
        data = stats?.revenueByMonth || {};
        formatKey = (key) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return format(date, 'MMM yyyy');
        };
    }

    return Object.entries(data)
      .map(([key, revenue]) => ({ key, date: formatKey(key), revenue }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, ...rest }) => rest);
  };

  const getBookingsData = () => {
    let data: Record<string, number> = {};
    let formatKey: (key: string) => string;

    switch (viewPeriod) {
      case 'yearly':
        data = stats?.bookingsByYear || {};
        formatKey = (key) => key;
        break;
      case 'quarterly':
        data = stats?.bookingsByQuarter || {};
        formatKey = (key) => key.replace('-Q', ' Q');
        break;
      case 'monthly':
        data = stats?.bookingsByMonth || {};
        formatKey = (key) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return format(date, 'MMM yyyy');
        };
        break;
      default:
        data = stats?.bookingsByMonth || {};
        formatKey = (key) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return format(date, 'MMM yyyy');
        };
    }

    return Object.entries(data)
      .map(([key, count]) => ({ key, date: formatKey(key), bookings: count }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, ...rest }) => rest);
  };

  const revenueChartData = getRevenueData();
  const bookingsChartData = getBookingsData();

  const bookingsStatusData = stats?.bookingsByStatus
    ? Object.entries(stats.bookingsByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const paymentStatusData = stats?.bookingsByPaymentStatus
    ? Object.entries(stats.bookingsByPaymentStatus).map(([name, value]) => ({ name, value }))
    : [];

  const tripsStatusData = stats?.tripsByStatus
    ? Object.entries(stats.tripsByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const topRoutesData = stats?.topRoutes || [];
  const topBusTypesData = stats?.topBusTypes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business metrics</p>
        </div>
        
        {/* Date Range and View Period Selectors */}
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !customStartDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, 'PPP') : <span>Start Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !customEndDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, 'PPP') : <span>End Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    disabled={(date) => customStartDate ? date < customStartDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-lg font-semibold text-muted-foreground">₦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : `₦${(stats?.totalRevenue || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.successfulBookings || 0} successful bookings
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : (stats?.totalBookings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.conversionRate ? `${stats.conversionRate.toFixed(1)}%` : '0%'} conversion rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : (stats?.totalUsers || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeAgents || 0} active agents
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : (stats?.totalTrips || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Active trips scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : `₦${(stats?.avgBookingValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </div>
            <p className="text-xs text-muted-foreground">Per successful booking</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : (stats?.activeAgents || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalAgents || 0} total agents
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : `${(stats?.conversionRate || 0).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Successful bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings by Status</CardTitle>
          <CardDescription>Breakdown of bookings by their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">Loading...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {Object.entries(stats?.bookingsByStatus || {}).map(([status, count]) => {
                const statusCount = count as number;
                const getStatusConfig = (status: string) => {
                  const lowerStatus = status.toLowerCase();
                  if (lowerStatus.includes('completed') || lowerStatus === 'completed') {
                    return {
                      icon: CheckCircle2,
                      color: 'text-green-600',
                      bgColor: 'bg-green-50',
                      borderColor: 'border-green-200',
                    };
                  } else if (lowerStatus.includes('pending') || lowerStatus === 'pending') {
                    return {
                      icon: Clock,
                      color: 'text-yellow-600',
                      bgColor: 'bg-yellow-50',
                      borderColor: 'border-yellow-200',
                    };
                  } else if (lowerStatus.includes('cancelled') || lowerStatus.includes('canceled') || lowerStatus === 'cancelled' || lowerStatus === 'canceled') {
                    return {
                      icon: XCircle,
                      color: 'text-red-600',
                      bgColor: 'bg-red-50',
                      borderColor: 'border-red-200',
                    };
                  } else if (lowerStatus.includes('confirmed') || lowerStatus === 'confirmed') {
                    return {
                      icon: CheckCircle2,
                      color: 'text-blue-600',
                      bgColor: 'bg-blue-50',
                      borderColor: 'border-blue-200',
                    };
                  } else if (lowerStatus.includes('review') || lowerStatus.includes('needs review')) {
                    return {
                      icon: AlertCircle,
                      color: 'text-orange-600',
                      bgColor: 'bg-orange-50',
                      borderColor: 'border-orange-200',
                    };
                  } else {
                    return {
                      icon: Activity,
                      color: 'text-gray-600',
                      bgColor: 'bg-gray-50',
                      borderColor: 'border-gray-200',
                    };
                  }
                };
                
                const config = getStatusConfig(status);
                const Icon = config.icon;
                const percentage = stats?.totalBookings ? ((statusCount / stats.totalBookings) * 100).toFixed(1) : '0';
                
                return (
                  <div
                    key={status}
                    className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="text-xs text-muted-foreground">{percentage}%</span>
                    </div>
                    <div className={`text-2xl font-bold ${config.color}`}>
                      {statusCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {status.replace(/_/g, ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trips Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Trips by Status</CardTitle>
          <CardDescription>Breakdown of trips by their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">Loading...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {Object.entries(stats?.tripsByStatus || {}).map(([status, count]) => {
                const statusCount = count as number;
                const getStatusConfig = (status: string) => {
                  const lowerStatus = status.toLowerCase();
                  if (lowerStatus.includes('completed') || lowerStatus === 'completed') {
                    return {
                      icon: CheckCircle2,
                      color: 'text-green-600',
                      bgColor: 'bg-green-50',
                      borderColor: 'border-green-200',
                    };
                  } else if (lowerStatus.includes('pending') || lowerStatus === 'pending') {
                    return {
                      icon: Clock,
                      color: 'text-yellow-600',
                      bgColor: 'bg-yellow-50',
                      borderColor: 'border-yellow-200',
                    };
                  } else if (lowerStatus.includes('cancelled') || lowerStatus.includes('canceled') || lowerStatus === 'cancelled' || lowerStatus === 'canceled') {
                    return {
                      icon: XCircle,
                      color: 'text-red-600',
                      bgColor: 'bg-red-50',
                      borderColor: 'border-red-200',
                    };
                  } else if (lowerStatus.includes('active') || lowerStatus === 'active') {
                    return {
                      icon: Activity,
                      color: 'text-blue-600',
                      bgColor: 'bg-blue-50',
                      borderColor: 'border-blue-200',
                    };
                  } else if (lowerStatus.includes('available') || lowerStatus === 'available') {
                    return {
                      icon: CheckCircle2,
                      color: 'text-green-600',
                      bgColor: 'bg-green-50',
                      borderColor: 'border-green-200',
                    };
                  } else {
                    return {
                      icon: Activity,
                      color: 'text-gray-600',
                      bgColor: 'bg-gray-50',
                      borderColor: 'border-gray-200',
                    };
                  }
                };
                
                const config = getStatusConfig(status);
                const Icon = config.icon;
                const percentage = stats?.totalTrips ? ((statusCount / stats.totalTrips) * 100).toFixed(1) : '0';
                
                return (
                  <div
                    key={status}
                    className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="text-xs text-muted-foreground">{percentage}%</span>
                    </div>
                    <div className={`text-2xl font-bold ${config.color}`}>
                      {statusCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {status.replace(/_/g, ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Time Series Analytics</h2>
            <p className="text-sm text-muted-foreground">View revenue and bookings trends over time</p>
          </div>
          <Select value={viewPeriod} onValueChange={(value: any) => setViewPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>
                {viewPeriod === 'yearly' ? 'Yearly revenue trend' : 
                 viewPeriod === 'quarterly' ? 'Quarterly revenue trend' : 
                 'Monthly revenue trend'}
              </CardDescription>
            </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookings Over Time</CardTitle>
              <CardDescription>
                {viewPeriod === 'yearly' ? 'Yearly booking count' : 
                 viewPeriod === 'quarterly' ? 'Quarterly booking count' : 
                 'Monthly booking count'}
              </CardDescription>
            </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : bookingsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={bookingsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bookings" stroke="#00C49F" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
            <CardDescription>Distribution of booking statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : bookingsStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingsStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 13, fill: '#666' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 13, fill: '#666' }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Count']}
                    contentStyle={{ fontSize: '14px', padding: '10px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                  <Bar 
                    dataKey="value" 
                    fill="#8884d8" 
                    name="Bookings"
                    radius={[4, 4, 0, 0]}
                  >
                    {bookingsStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Distribution of payment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : paymentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trips by Status</CardTitle>
            <CardDescription>Distribution of trip statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : tripsStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tripsStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 - Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Routes</CardTitle>
            <CardDescription>Top 5 routes by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : topRoutesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={topRoutesData}
                  layout="vertical"
                  margin={{ top: 10, right: 40, left: 140, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 13, fill: '#666' }}
                    label={{ value: 'Revenue (₦)', position: 'insideBottom', offset: -5, style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <YAxis 
                    dataKey="route" 
                    type="category" 
                    width={130}
                    tick={{ fontSize: 14, fill: '#333', fontWeight: 500 }}
                    angle={0}
                    textAnchor="end"
                    height={60}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'Revenue') {
                        return [`₦${value.toLocaleString()}`, 'Revenue'];
                      }
                      return [value, 'Bookings'];
                    }}
                    labelFormatter={(label) => `Route: ${label}`}
                    contentStyle={{ fontSize: '14px', padding: '10px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
                  />
                  <Bar dataKey="revenue" fill="#0088FE" name="Revenue" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="bookings" fill="#00C49F" name="Bookings" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bus Type Performance</CardTitle>
            <CardDescription>Top 10 bus types by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : topBusTypesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={topBusTypesData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="busType" 
                    type="category" 
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => `₦${value.toLocaleString()}`}
                    labelFormatter={(label) => `Bus Type: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#FF8042" name="Revenue" />
                  <Bar dataKey="bookings" fill="#FFBB28" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
