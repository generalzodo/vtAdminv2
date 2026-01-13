'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/admin/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  userCount?: number;
  createdAt: string;
}

interface Permission {
  _id: string;
  name: string;
  description: string;
  category: string;
}

export function RolesClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [page, limit, searchTerm]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/roles?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRoles(data.data || []);
        setPagination(data.pagination || pagination);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch roles',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      const data = await response.json();
      if (data.success) {
        setPermissions(data.data || []);
        setGroupedPermissions(data.grouped || {});
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: [],
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: [],
    });
    setFormErrors({});
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePermissionToggle = (permissionName: string) => {
    setFormData(prev => {
      const currentPermissions = prev.permissions || [];
      if (currentPermissions.includes(permissionName)) {
        return {
          ...prev,
          permissions: currentPermissions.filter(p => p !== permissionName),
        };
      } else {
        return {
          ...prev,
          permissions: [...currentPermissions, permissionName],
        };
      }
    });
  };

  const handleSelectAllCategory = (category: string, checked: boolean) => {
    const categoryPermissions = groupedPermissions[category] || [];
    const categoryPermissionNames = categoryPermissions.map(p => p.name);

    setFormData(prev => {
      const currentPermissions = prev.permissions || [];
      if (checked) {
        // Add all category permissions
        const newPermissions = [...new Set([...currentPermissions, ...categoryPermissionNames])];
        return { ...prev, permissions: newPermissions };
      } else {
        // Remove all category permissions
        const newPermissions = currentPermissions.filter(p => !categoryPermissionNames.includes(p));
        return { ...prev, permissions: newPermissions };
      }
    });
  };

  const handleSubmit = async () => {
    // Validation
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const url = editingRole
        ? `/api/admin/roles/${editingRole._id}`
        : '/api/admin/roles';
      const method = editingRole ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: editingRole ? 'Role updated successfully' : 'Role created successfully',
        });
        handleCloseDialog();
        fetchRoles();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to save role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: 'Error',
        description: 'Failed to save role',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (roleId: string) => {
    setDeletingRoleId(roleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRoleId) return;

    try {
      const response = await fetch(`/api/admin/roles/${deletingRoleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Role deleted successfully',
        });
        fetchRoles();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to delete role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingRoleId(null);
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.isSystemRole && (
            <Badge variant="secondary" className="text-xs">System</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.description}</span>,
    },
    {
      key: 'permissions',
      header: 'Permissions',
      cell: (row) => (
        <Badge variant="outline">{row.permissions?.length || 0}</Badge>
      ),
    },
    {
      key: 'userCount',
      header: 'Users',
      cell: (row) => (
        <Badge variant="outline">{row.userCount || 0}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {!row.isSystemRole && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDialog(row)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(row._id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-x-hidden max-w-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Manage roles and their permissions</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={roles}
            loading={loading}
            pagination={pagination}
            onPageChange={(newPage) => {
              setPage(newPage);
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

      {/* Add/Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update role details and permissions' : 'Create a new role with specific permissions'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Manager, Support"
                  disabled={editingRole?.isSystemRole}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the role's purpose and responsibilities"
                  rows={3}
                />
                {formErrors.description && (
                  <p className="text-sm text-destructive mt-1">{formErrors.description}</p>
                )}
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-4">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
                    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
                    const selectedInCategory = categoryPermissions.filter(p => 
                      formData.permissions.includes(p.name)
                    ).length;
                    const allSelected = selectedInCategory === categoryPermissions.length;

                    return (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{categoryName}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {selectedInCategory} / {categoryPermissions.length}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectAllCategory(category, !allSelected)}
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {categoryPermissions.map((permission) => (
                            <div key={permission._id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`perm-${permission._id}`}
                                checked={formData.permissions.includes(permission.name)}
                                onCheckedChange={() => handlePermissionToggle(permission.name)}
                              />
                              <label
                                htmlFor={`perm-${permission._id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                <div className="font-medium">{permission.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {permission.description}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
              Users with this role will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

