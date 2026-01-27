'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Palette, Building2, Mail, Phone, MapPin, Globe } from 'lucide-react';

interface BrandingSettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  logoAltUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
  };
}

const defaultBranding: BrandingSettings = {
  companyName: '',
  tagline: '',
  logoUrl: '',
  logoAltUrl: '',
  primaryColor: '#006400',
  supportEmail: '',
  supportPhone: '',
  address: '',
  socialLinks: {
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
  },
};

export function BrandingTab() {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success && data.data?.branding) {
        setBranding({
          companyName: data.data.branding.companyName || '',
          tagline: data.data.branding.tagline || '',
          logoUrl: data.data.branding.logoUrl || '',
          logoAltUrl: data.data.branding.logoAltUrl || '',
          primaryColor: data.data.branding.primaryColor || '#006400',
          supportEmail: data.data.branding.supportEmail || '',
          supportPhone: data.data.branding.supportPhone || '',
          address: data.data.branding.address || '',
          socialLinks: {
            facebook: data.data.branding.socialLinks?.facebook || '',
            twitter: data.data.branding.socialLinks?.twitter || '',
            instagram: data.data.branding.socialLinks?.instagram || '',
            linkedin: data.data.branding.socialLinks?.linkedin || '',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load branding settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!branding.companyName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Company name is required',
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
        body: JSON.stringify({ branding }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Branding settings saved successfully',
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

  const updateBranding = (field: keyof BrandingSettings, value: string) => {
    setBranding({ ...branding, [field]: value });
  };

  const updateSocialLink = (platform: keyof BrandingSettings['socialLinks'], value: string) => {
    setBranding({
      ...branding,
      socialLinks: { ...branding.socialLinks, [platform]: value },
    });
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
        <h2 className="text-2xl font-bold mb-2">Branding Settings</h2>
        <p className="text-muted-foreground">
          Customize your company's branding and contact information. These settings are used across the customer website and admin panel.
        </p>
      </div>

      {/* Company Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Identity
          </CardTitle>
          <CardDescription>
            Basic company information displayed throughout the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={branding.companyName}
                onChange={(e) => updateBranding('companyName', e.target.value)}
                placeholder="e.g., Victoria Travels"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={branding.tagline}
                onChange={(e) => updateBranding('tagline', e.target.value)}
                placeholder="e.g., The Safe and Comfortable way to travel"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo & Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Logo & Theme
          </CardTitle>
          <CardDescription>
            Visual branding elements for your platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL (Light Background)</Label>
              <Input
                id="logoUrl"
                value={branding.logoUrl}
                onChange={(e) => updateBranding('logoUrl', e.target.value)}
                placeholder="/logo.png or https://..."
              />
              <p className="text-xs text-muted-foreground">
                Used in header and light backgrounds
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoAltUrl">Logo URL (Dark Background)</Label>
              <Input
                id="logoAltUrl"
                value={branding.logoAltUrl}
                onChange={(e) => updateBranding('logoAltUrl', e.target.value)}
                placeholder="/logo-alt.png or https://..."
              />
              <p className="text-xs text-muted-foreground">
                Used in footer and dark backgrounds
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="primaryColor"
                type="color"
                value={branding.primaryColor}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                placeholder="#006400"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Main brand color used for buttons, links, and accents
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            How customers can reach your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="supportEmail"
                  type="email"
                  value={branding.supportEmail}
                  onChange={(e) => updateBranding('supportEmail', e.target.value)}
                  placeholder="support@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhone">Support Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="supportPhone"
                  type="tel"
                  value={branding.supportPhone}
                  onChange={(e) => updateBranding('supportPhone', e.target.value)}
                  placeholder="+234 XXX XXX XXXX"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Company Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="address"
                value={branding.address}
                onChange={(e) => updateBranding('address', e.target.value)}
                placeholder="Enter your company address"
                className="pl-10 min-h-[80px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Media Links
          </CardTitle>
          <CardDescription>
            Connect with customers on social platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={branding.socialLinks.facebook}
                onChange={(e) => updateSocialLink('facebook', e.target.value)}
                placeholder="https://facebook.com/yourcompany"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X</Label>
              <Input
                id="twitter"
                value={branding.socialLinks.twitter}
                onChange={(e) => updateSocialLink('twitter', e.target.value)}
                placeholder="https://twitter.com/yourcompany"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={branding.socialLinks.instagram}
                onChange={(e) => updateSocialLink('instagram', e.target.value)}
                placeholder="https://instagram.com/yourcompany"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={branding.socialLinks.linkedin}
                onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Branding Settings'}
        </Button>
      </div>
    </div>
  );
}
