'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHasPermission, useIsSuperAdmin } from '@/hooks/use-permissions';
import { useIsCSO } from '@/hooks/use-role';
import { API_BASE_URL } from '@/lib/config';
import { Calendar, DollarSign, Users, FileText } from 'lucide-react';

export function CSODashboardClient() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    todayBookings: 0,
    todayRevenue: 0
  });
  
  const isSuperAdmin = useIsSuperAdmin();
  const isCSO = useIsCSO();
  const canViewAll = useHasPermission('bookings.view_all');

  useEffect(() => {
    if (!isCSO && !isSuperAdmin) {
      return;
    }
    
    fetchCSOData();
  }, [isCSO]);

  const fetchCSOData = async () => {
    try {
      setLoading(true);
      
      // Fetch bookings (filtered by CSO via backend)
      const bookingsRes = await fetch(`/api/admin/bookings?page=1&limit=50`, {
        credentials: 'include'
      });
      
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.data || []);
        
        // Calculate stats
        const totalRevenue = bookingsData.data?.reduce((sum: number, b: any) => sum + (b.amount || 0), 0) || 0;
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = bookingsData.data?.filter((b: any) => 
          new Date(b.createdAt).toISOString().split('T')[0] === today
        ) || [];
        const todayRevenue = todayBookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
        
        setStats({
          totalBookings: bookingsData.data?.length || 0,
          totalRevenue,
          todayBookings: todayBookings.length,
          todayRevenue
        });
      }
      
      // Fetch transaction history from audit logs
      // This would be a custom endpoint that queries audit logs for CSO actions
      // For now, we'll use bookings as transaction history
      
    } catch (error) {
      console.error('Error fetching CSO data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isCSO && !isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must have CSO role or be a Super Admin to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CSO Dashboard</h1>
        <p className="text-muted-foreground">
          Customer Service Officer - Manage bookings and track transactions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayBookings} today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ₦{stats.todayRevenue.toLocaleString()} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                {canViewAll ? 'All bookings in the system' : 'Bookings created by you'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings found
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.slice(0, 10).map((booking: any) => (
                    <div key={booking._id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{booking.bookingId}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.firstName} {booking.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.from} → {booking.to}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₦{booking.amount?.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All actions logged with date, user ID, transaction type, and amount
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Transaction history will be displayed here (from audit logs)
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
