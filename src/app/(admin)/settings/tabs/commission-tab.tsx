'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Bus {
  _id: string;
  title?: string;
  type?: string;
}

interface Settings {
  busCommissionRates?: Record<string, number>;
}

export function CommissionTab() {
  const [settings, setSettings] = useState<Settings>({});
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load both settings and buses in parallel
      const [settingsRes, busesRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/buses?limit=1000')
      ]);

      const settingsData = await settingsRes.json();
      const busesData = await busesRes.json();

      // Get settings data
      let loadedRates: Record<string, number> = {};
      if (settingsData.success) {
        const settingsObj = settingsData.data || settingsData;
        setSettings(settingsObj);
        
        // Handle busCommissionRates - it might be a Map converted to object
        if (settingsObj.busCommissionRates) {
          // If it's already an object, use it directly
          if (typeof settingsObj.busCommissionRates === 'object' && !Array.isArray(settingsObj.busCommissionRates)) {
            loadedRates = { ...settingsObj.busCommissionRates };
          }
        }
      }

      // Get buses data
      if (busesData.success) {
        const allBuses = busesData.data || [];
        setBuses(allBuses);
        
        // Initialize commission rates for buses that don't have one
        // Use the loaded rates from settings, not state (which may be stale)
        const updatedRates = { ...loadedRates };
        allBuses.forEach((bus: Bus) => {
          const busId = bus._id;
          if (busId && updatedRates[busId] === undefined) {
            updatedRates[busId] = 0;
          }
        });
        setCommissionRates(updatedRates);
      } else {
        // If buses failed but settings succeeded, still set the rates
        if (settingsData.success && settingsData.data?.busCommissionRates) {
          setCommissionRates(loadedRates);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (busId: string, value: string) => {
    setCommissionRates({
      ...commissionRates,
      [busId]: parseFloat(value) || 0,
    });
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
          busCommissionRates: commissionRates,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Commission rates saved successfully!',
        });
        loadData(); // Reload to get updated data
      } else {
        throw new Error(data.error || 'Failed to save commission rates');
      }
    } catch (error) {
      console.error('Error saving commission rates:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save commission rates',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getBusDisplayName = (bus: Bus) => {
    return bus.title || bus.type || 'Unknown Bus';
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
        <h2 className="text-2xl font-bold mb-2">Agent Commission Rates</h2>
        <p className="text-muted-foreground">
          Set commission rates (flat rate in Naira) for each bus. Rates are stored by bus ID, so they remain stable even if bus names change. These rates apply to all approved agents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bus Commission Rates</CardTitle>
          <CardDescription>Set commission rates for each bus</CardDescription>
        </CardHeader>
        <CardContent>
          {buses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No buses found. Please add buses first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {buses.map((bus) => (
                <div key={bus._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{getBusDisplayName(bus)}</h4>
                    <p className="text-sm text-muted-foreground">Bus Type: {bus.type || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 font-medium">₦</span>
                    <Input
                      type="number"
                      value={commissionRates[bus._id] || 0}
                      onChange={(e) => handleRateChange(bus._id, e.target.value)}
                      min="0"
                      step="1"
                      placeholder="0"
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">How Commission Rates Work</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
            <li>Commission rates are set per bus (by ID) and apply to all approved agents</li>
            <li>The rate is a flat amount (in Naira) discount per passenger</li>
            <li>For example, ₦300 commission means agents get ₦300 off per passenger booking</li>
            <li>If booking multiple passengers, the discount is multiplied by the number of passengers</li>
            <li>Commission rates are configured here, not during agent approval</li>
          </ul>
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

