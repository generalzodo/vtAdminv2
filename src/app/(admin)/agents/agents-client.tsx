'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Download, MoreHorizontal, Eye, Edit, Trash2, BarChart3, Check, X, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Agent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  agentStatus?: string;
  createdAt: string;
  address?: string;
  state?: string;
  idCardType?: string;
  idCardFile?: string;
}

interface AgentReport {
  agentId: string;
  agentName: string;
  totalBookings: number;
  totalRevenue: number;
  commission: number;
  paid: number;
  pending: number;
}

export function AgentsClient() {
  const [activeTab, setActiveTab] = useState('pending');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingAgents, setPendingAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [idCardDialogOpen, setIdCardDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Reset to first page when tab changes
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingAgents();
    } else {
      fetchAgents(page, limit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, activeTab, searchTerm]);

  const fetchPendingAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/agents?status=pending`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pending agents');
      }
      const data = await response.json();
      if (data.success) {
        setPendingAgents(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch pending agents');
      }
    } catch (error) {
      console.error('Error fetching pending agents:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch pending agents',
        variant: 'destructive',
      });
      setPendingAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    try {
      let url = `/api/admin/agents?page=${currentPage}&limit=${currentLimit}`;
      
      // Add status filter based on active tab
      if (activeTab === 'active') {
        url += '&status=approved';
      }
      
      // Add search parameter
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAgents(data.data || []);
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
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReportsModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setReportsModalOpen(true);
    fetchAgentReports(agent._id);
  };

  const fetchAgentReports = async (agentId: string) => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('agentId', agentId);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const response = await fetch(`/api/admin/agent-reports?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setReports(Array.isArray(data.data) ? data.data : [data.data]);
      }
    } catch (error) {
      console.error('Error fetching agent reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleFilterReports = () => {
    if (selectedAgent) {
      fetchAgentReports(selectedAgent._id);
    }
  };

  const showApprovalDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setApprovalDialogOpen(true);
  };

  const showRejectionDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setRejectionReason('');
    setRejectionDialogOpen(true);
  };

  const showIdCardDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setIdCardDialogOpen(true);
  };

  const approveAgent = async () => {
    if (!selectedAgent) return;
    
    setProcessingId(selectedAgent._id);
    try {
      const response = await fetch(`/api/admin/agents/${selectedAgent._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Agent approved successfully',
        });
        setApprovalDialogOpen(false);
        setSelectedAgent(null);
        fetchPendingAgents();
        if (activeTab !== 'pending') {
          fetchAgents(page, limit);
        }
      } else {
        throw new Error(data.error || 'Failed to approve agent');
      }
    } catch (error) {
      console.error('Error approving agent:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve agent',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectAgent = async () => {
    if (!selectedAgent) return;
    
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(selectedAgent._id);
    try {
      const response = await fetch(`/api/admin/agents/${selectedAgent._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejectionReason: rejectionReason.trim()
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Agent rejected successfully. Rejection email sent.',
        });
        setRejectionDialogOpen(false);
        setSelectedAgent(null);
        setRejectionReason('');
        fetchPendingAgents();
        if (activeTab !== 'pending') {
          fetchAgents(page, limit);
        }
      } else {
        throw new Error(data.error || 'Failed to reject agent');
      }
    } catch (error) {
      console.error('Error rejecting agent:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject agent',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatIdCardType = (type?: string) => {
    if (!type) return 'N/A';
    const types: Record<string, string> = {
      'voters_card': "Voter's Card",
      'nin': 'NIN',
      'drivers_licence': "Driver's Licence",
      'international_passport': 'International Passport'
    };
    return types[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewAgent = (agent: Agent) => {
    // For now, just show agent details in a toast or could open a dialog
    toast({
      title: 'Agent Details',
      description: `${agent.firstName} ${agent.lastName} - ${agent.email} - ${agent.phone}`,
    });
  };

  const handleEditAgent = (agent: Agent) => {
    // For now, just show a message - edit functionality can be added later
    toast({
      title: 'Edit Agent',
      description: 'Edit functionality coming soon',
    });
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      toast({
        title: 'Success',
        description: 'Agent deleted successfully',
      });

      if (activeTab === 'pending') {
        fetchPendingAgents();
      } else {
        fetchAgents(page, limit);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete agent',
        variant: 'destructive',
      });
    }
  };

  const hasIdCardFile = (agent: Agent): boolean => {
    return !!(agent?.idCardFile && agent.idCardFile.trim().length > 0);
  };

  const isImageFile = (fileData: string): boolean => {
    if (!fileData) return false;
    return fileData.startsWith('data:image/') || 
           (fileData.startsWith('http') && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileData));
  };

  const isPdfFile = (fileData: string): boolean => {
    if (!fileData) return false;
    return fileData.startsWith('data:application/pdf') || 
           (fileData.startsWith('http') && /\.pdf$/i.test(fileData));
  };

  const getStatusBadge = (status: string, agentStatus?: string) => {
    const displayStatus = agentStatus || status;
    const variant = displayStatus === 'approved' || displayStatus === 'active' 
      ? 'success' 
      : displayStatus === 'pending' 
      ? 'secondary' 
      : 'destructive';
    
    return (
      <Badge variant={variant}>
        {displayStatus?.charAt(0).toUpperCase() + displayStatus?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  const columns: Column<Agent>[] = [
    { key: 'firstName', header: 'Name', cell: (row) => `${row.firstName} ${row.lastName}` },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'status', 
      header: 'Status', 
      cell: (row) => getStatusBadge(row.status, row.agentStatus)
    },
    { key: 'createdAt', header: 'Created', cell: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  const actions = (row: Agent) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openReportsModal(row)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View Reports
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleViewAgent(row)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEditAgent(row)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDeleteAgent(row._id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground">Manage all agents</p>
        </div>
        <Button
          onClick={async () => {
            try {
              const res = await fetch('/api/admin/exports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'agents',
                  params: { tab: activeTab },
                  format: 'xlsx',
                }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || data.error || 'Failed to start export');
              }
              toast({
                title: 'Export started',
                description: 'Your agents export is generating. Download it from the Exports icon when ready.',
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending Approval ({pendingAgents.length})</TabsTrigger>
              <TabsTrigger value="all">All Agents</TabsTrigger>
              <TabsTrigger value="active">Active Agents</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p>Loading...</p>
                </div>
              ) : pendingAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No pending agent applications</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingAgents.map((agent) => (
                    <Card key={agent._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{agent.firstName} {agent.lastName}</h3>
                            <p className="text-sm text-muted-foreground">{agent.email}</p>
                            {agent.status !== 'active' && (
                              <p className="text-xs text-orange-600 mt-1">
                                ⚠️ Email not verified yet
                              </p>
                            )}
                          </div>
                          {getStatusBadge(agent.status, agent.agentStatus)}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{agent.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">ID Card Type</p>
                            <p className="font-medium">{formatIdCardType(agent.idCardType)}</p>
                          </div>
                          {agent.address && (
                            <div>
                              <p className="text-sm text-muted-foreground">Address</p>
                              <p className="font-medium">{agent.address}</p>
                            </div>
                          )}
                          {agent.state && (
                            <div>
                              <p className="text-sm text-muted-foreground">State</p>
                              <p className="font-medium">{agent.state}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">Registered</p>
                            <p className="font-medium">{formatDate(agent.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">ID Card File</p>
                            <p className="font-medium">
                              {hasIdCardFile(agent) ? (
                                <span className="text-green-600">✓ Uploaded</span>
                              ) : (
                                <span className="text-red-600">✗ Not uploaded</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {hasIdCardFile(agent) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showIdCardDialog(agent)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View ID Card
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                            >
                              No ID Card Available
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => showApprovalDialog(agent)}
                            disabled={processingId === agent._id}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => showRejectionDialog(agent)}
                            disabled={processingId === agent._id}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <DataTable
                columns={columns}
                data={agents}
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
                searchable
                onSearch={(search) => {
                  setSearchTerm(search);
                  setPage(1); // Reset to first page when searching
                }}
                actions={actions}
              />
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <DataTable
                columns={columns}
                data={agents}
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
                searchable
                onSearch={(search) => {
                  setSearchTerm(search);
                  setPage(1); // Reset to first page when searching
                }}
                actions={actions}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={reportsModalOpen} onOpenChange={setReportsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Agent Reports - {selectedAgent ? `${selectedAgent.firstName} ${selectedAgent.lastName}` : ''}
            </DialogTitle>
            <DialogDescription>
              View financial reports for this agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Filter Reports</CardTitle>
                <CardDescription>Filter by date range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="fromDate">From Date</Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toDate">To Date</Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleFilterReports} className="w-full">
                      Filter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>Agent financial performance</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
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
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Agent</DialogTitle>
            <DialogDescription>
              Approve <strong>{selectedAgent?.firstName} {selectedAgent?.lastName}</strong> as an agent?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Commission rates are configured in Settings per bus type.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={approveAgent}
              disabled={processingId === selectedAgent?._id}
            >
              Approve Agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agent</DialogTitle>
            <DialogDescription>
              Reject <strong>{selectedAgent?.firstName} {selectedAgent?.lastName}</strong>'s agent application?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection. This will be sent to the agent via email."
                rows={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be included in the rejection email sent to the agent.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionDialogOpen(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={rejectAgent}
                disabled={!rejectionReason || rejectionReason.trim().length === 0 || processingId === selectedAgent?._id}
              >
                Reject Agent
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ID Card Preview Dialog */}
      <Dialog open={idCardDialogOpen} onOpenChange={setIdCardDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
            <DialogDescription>
              {selectedAgent?.firstName} {selectedAgent?.lastName} - {formatIdCardType(selectedAgent?.idCardType)}
            </DialogDescription>
          </DialogHeader>
          {selectedAgent?.idCardFile ? (
            <div className="border rounded-lg p-2 bg-gray-50">
              {isImageFile(selectedAgent.idCardFile) ? (
                <img
                  src={selectedAgent.idCardFile}
                  alt="ID Card"
                  className="w-full h-auto border rounded max-h-[600px] object-contain"
                />
              ) : isPdfFile(selectedAgent.idCardFile) ? (
                <iframe
                  src={selectedAgent.idCardFile}
                  className="w-full h-[600px] border rounded"
                  title="ID Card PDF"
                />
              ) : (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground mb-2">Unable to preview this file type</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedAgent.idCardFile!;
                      link.download = `${selectedAgent.firstName}_${selectedAgent.lastName}_ID_Card`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <p>No ID card file available for this agent.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

