'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHasPermission, useIsSuperAdmin } from '@/hooks/use-permissions';
import { useIsACO } from '@/hooks/use-role';
import { FileText, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AuditLogsClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    role: '',
    action: '',
    entityType: '',
    from: '',
    to: ''
  });
  
  const isSuperAdmin = useIsSuperAdmin();
  const isACO = useIsACO();
  const canViewAudit = useHasPermission('audit.view');
  const canExport = useHasPermission('audit.export');
  const { toast } = useToast();

  const hasAccess = isSuperAdmin || isACO || canViewAudit;

  useEffect(() => {
    if (!hasAccess) {
      return;
    }
    
    fetchAuditLogs();
  }, [hasAccess]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.role) params.append('role', filters.role);
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      
      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.role) params.append('role', filters.role);
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const res = await fetch('/api/admin/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'auditLogs',
          params: Object.fromEntries(params.entries()),
          format: 'csv',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Failed to start export');
      }

      toast({
        title: 'Export started',
        description: 'Your audit logs export is generating. You can continue working and download it from the Exports icon.',
      });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: 'Export failed to start',
        description: (error as any)?.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You must have Audit & Compliance Officer role, audit.view permission, or be a Super Admin to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            View all administrative actions with full audit trail
          </p>
        </div>
        {canExport && (
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="User ID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            />
            <Input
              placeholder="Role"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            />
            <Input
              placeholder="Action"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            />
            <Input
              placeholder="Entity Type"
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            />
            <Input
              type="date"
              placeholder="From Date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <Input
              type="date"
              placeholder="To Date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
          <Button onClick={fetchAuditLogs} className="mt-4">
            <Search className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            All administrative actions logged with date, user ID, action type, and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log._id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{log.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.userEmail} ({log.role || 'N/A'})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.entityType}: {log.entityId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.ipAddress && (
                        <p className="text-xs text-muted-foreground">
                          IP: {log.ipAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
