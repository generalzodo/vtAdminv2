'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';

interface AgentReport {
  agentId: string;
  agentName: string;
  totalBookings: number;
  totalRevenue: number;
  commission: number;
  paid: number;
  pending: number;
}

export function AgentReportsClient() {
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentId) params.append('agentId', agentId);
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const response = await fetch(`/api/admin/agent-reports?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setReports(Array.isArray(data.data) ? data.data : [data.data]);
      }
    } catch (error) {
      console.error('Error fetching agent reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchReports();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Reports</h1>
        <p className="text-muted-foreground">View agent financial reports</p>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="agentId">Agent ID</Label>
              <Input
                id="agentId"
                placeholder="Agent ID (optional)"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="from">From Date</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to">To Date</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} className="w-full">
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <p>No reports found. Try adjusting your filters.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{report.agentName || `Agent ${report.agentId}`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bookings</p>
                        <p className="text-2xl font-bold">{report.totalBookings || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">₦{(report.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Commission</p>
                        <p className="text-2xl font-bold">₦{(report.commission || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold">₦{(report.pending || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

