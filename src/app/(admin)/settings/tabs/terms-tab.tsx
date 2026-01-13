'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Settings {
  termsAndConditions?: string;
  ticketTerms?: string;
}

export function TermsTab() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('terms');
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data || {});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          termsAndConditions: settings.termsAndConditions,
          ticketTerms: settings.ticketTerms,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Settings saved successfully',
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

  const getPreviewContent = () => {
    const content = activeTab === 'terms' 
      ? settings.termsAndConditions 
      : settings.ticketTerms;
    
    if (!content) return '<p class="text-gray-500 italic">No content to preview</p>';
    
    return content;
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
        <h2 className="text-2xl font-bold mb-2">Terms & Conditions Management</h2>
        <p className="text-muted-foreground">Manage the terms and conditions that users see during the booking process.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="terms">Booking Terms & Conditions</TabsTrigger>
          <TabsTrigger value="ticket">Ticket Terms & Conditions</TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Terms & Conditions</CardTitle>
              <CardDescription>
                This content will be displayed to users when they agree to terms during booking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="terms">Terms and Conditions</Label>
                <Textarea
                  id="terms"
                  value={settings.termsAndConditions || ''}
                  onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                  rows={15}
                  placeholder="Enter terms and conditions..."
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ticket" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Terms & Conditions</CardTitle>
              <CardDescription>
                This content will be displayed on tickets and booking confirmations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ticketTerms">Ticket Terms</Label>
                <Textarea
                  id="ticketTerms"
                  value={settings.ticketTerms || ''}
                  onChange={(e) => setSettings({ ...settings, ticketTerms: e.target.value })}
                  rows={15}
                  placeholder="Enter ticket terms..."
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Preview of the current content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none p-4 bg-gray-50 rounded-lg min-h-[200px]">
            <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} className="text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

