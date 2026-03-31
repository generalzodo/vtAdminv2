'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useHasPermission, useIsSuperAdmin } from '@/hooks/use-permissions';
import { useIsFinance, useIsACO, useIsSO, useIsITO } from '@/hooks/use-role';
import { Download } from 'lucide-react';

export function ReportsClient() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('financial');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  
  const isSuperAdmin = useIsSuperAdmin();
  const isFinance = useIsFinance();
  const isACO = useIsACO();
  const isSO = useIsSO();
  const isITO = useIsITO();
  const canViewReports = useHasPermission('reports.view');

  const hasAccess = isSuperAdmin || isFinance || isACO || isSO || isITO || canViewReports;

  const fetchReport = async (reportType: string, filters: any = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: reportType });
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
      
      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReportExport = async () => {
    try {
      setExporting(true);
      setExportMessage('');

      const typeByTab: Record<string, string> = {
        financial: 'financialReports',
        agent: 'agentReports',
        passenger: 'passengerReports',
        'bus-performance': 'busPerformanceReports'
      };

      const exportType = typeByTab[activeTab];
      if (!exportType) {
        setExportMessage('Unsupported report type');
        return;
      }

      const res = await fetch('/api/admin/exports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          format: 'xlsx',
          params: {}
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExportMessage(data?.message || data?.error || 'Failed to queue export job');
        return;
      }

      setExportMessage('Excel export queued. Use the export bell icon to download when ready.');
    } catch (error) {
      console.error('Error creating report export:', error);
      setExportMessage('Failed to queue export job');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (hasAccess && activeTab) {
      fetchReport(activeTab);
    }
  }, [hasAccess, activeTab]);

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You must have appropriate role or be a Super Admin to access reports.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and view various reports based on your role
          </p>
          {exportMessage ? (
            <p className="mt-2 text-sm text-muted-foreground">{exportMessage}</p>
          ) : null}
        </div>
        <Button onClick={createReportExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Queueing...' : 'Download Excel'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {(isFinance || isACO) && <TabsTrigger value="financial">Financial Reports</TabsTrigger>}
          {(isFinance || isACO) && <TabsTrigger value="agent">Agent Reports</TabsTrigger>}
          {(isITO || isACO || isSO) && <TabsTrigger value="passenger">Passenger Reports</TabsTrigger>}
          {(isSO || isFinance) && <TabsTrigger value="bus-performance">Bus Performance</TabsTrigger>}
        </TabsList>
        
        {(isFinance || isACO) && (
          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  View payment channels, wallet transactions, and commission calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : reportData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">₦{reportData.summary?.totalRevenue?.toLocaleString() || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Bookings</p>
                        <p className="text-2xl font-bold">{reportData.summary?.totalBookings || 0}</p>
                      </div>
                    </div>
                    <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">
                      {JSON.stringify(reportData, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available. Select date range and click "Generate Report".
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {(isFinance || isACO) && (
          <TabsContent value="agent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance Reports</CardTitle>
                <CardDescription>
                  View agent bookings, commissions, and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : reportData ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {reportData.agents?.length || 0} agents found
                    </div>
                    <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">
                      {JSON.stringify(reportData, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {(isITO || isACO || isSO) && (
          <TabsContent value="passenger" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Passenger Movement Reports</CardTitle>
                <CardDescription>
                  View passenger bookings, travel patterns, and statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : reportData ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {reportData.summary?.totalPassengers || 0} passengers found
                    </div>
                    <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">
                      {JSON.stringify(reportData, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {(isSO || isFinance) && (
          <TabsContent value="bus-performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bus Performance Reports</CardTitle>
                <CardDescription>
                  View bus scheduling, occupancy rates, and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : reportData ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {reportData.summary?.totalTrips || 0} trips found
                    </div>
                    <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">
                      {JSON.stringify(reportData, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
