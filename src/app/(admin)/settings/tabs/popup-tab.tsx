'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

interface PopupSettings {
  imageUrl?: string | null;
  duration?: number | null;
  startDate?: string | null;
  enabled?: boolean;
}

export function PopupTab() {
  const [popup, setPopup] = useState<PopupSettings>({
    imageUrl: null,
    duration: null,
    startDate: null,
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success && data.data?.popup) {
        setPopup({
          imageUrl: data.data.popup.imageUrl || null,
          duration: data.data.popup.duration || null,
          startDate: data.data.popup.startDate 
            ? new Date(data.data.popup.startDate).toISOString().split('T')[0]
            : null,
          enabled: data.data.popup.enabled || false,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load popup settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 for now (you can implement proper file upload to server later)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPopup({ ...popup, imageUrl: base64String });
        setUploading(false);
        toast({
          title: 'Success',
          description: 'Image uploaded successfully',
        });
      };
      reader.onerror = () => {
        setUploading(false);
        toast({
          title: 'Error',
          description: 'Failed to read image file',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(false);
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveImage = () => {
    setPopup({ ...popup, imageUrl: null });
  };

  const handleSave = async () => {
    if (!popup.enabled) {
      // If disabled, save with empty values
      setSaving(true);
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            popup: {
              enabled: false,
              imageUrl: null,
              duration: null,
              startDate: null,
            },
          }),
        });

        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Success',
            description: 'Popup disabled successfully',
          });
        } else {
          throw new Error(data.error || 'Failed to update settings');
        }
      } catch (error) {
        console.error('Error updating settings:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update settings',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validate required fields when enabled
    if (!popup.imageUrl) {
      toast({
        title: 'Validation Error',
        description: 'Please upload an image',
        variant: 'destructive',
      });
      return;
    }

    if (!popup.duration || popup.duration <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid duration (in days)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          popup: {
            enabled: popup.enabled,
            imageUrl: popup.imageUrl,
            duration: popup.duration,
            startDate: popup.startDate || new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Popup settings saved successfully',
        });
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Popup Management</h2>
        <p className="text-muted-foreground">
          Configure a popup that will be displayed to users on the website. Set the image and duration to control when and how long it appears.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Popup Settings</CardTitle>
          <CardDescription>
            Configure the popup image and display duration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enabled"
              checked={popup.enabled || false}
              onCheckedChange={(checked) =>
                setPopup({ ...popup, enabled: checked as boolean })
              }
            />
            <Label htmlFor="enabled" className="cursor-pointer">
              Enable Popup
            </Label>
          </div>

          {popup.enabled && (
            <>
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image">Popup Image</Label>
                {!popup.imageUrl ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Image
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Recommended: PNG or JPG, max 5MB
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img
                        src={popup.imageUrl}
                        alt="Popup preview"
                        className="max-w-full h-auto max-h-64 mx-auto rounded"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="mt-2"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove Image
                    </Button>
                  </div>
                )}
                {uploading && (
                  <p className="text-sm text-gray-500">Uploading...</p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={popup.duration || ''}
                  onChange={(e) =>
                    setPopup({
                      ...popup,
                      duration: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Enter number of days"
                />
                <p className="text-sm text-gray-500">
                  How many days should the popup be displayed? (e.g., 7 for one week)
                </p>
              </div>

              {/* Start Date (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={popup.startDate || ''}
                  onChange={(e) =>
                    setPopup({
                      ...popup,
                      startDate: e.target.value || null,
                    })
                  }
                />
                <p className="text-sm text-gray-500">
                  When should the popup start showing? Leave empty to start immediately.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
