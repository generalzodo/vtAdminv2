'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ScopeMode = 'station' | 'stationAndRoute' | 'stationRouteBusType';
type TimeMode = 'fixedIncrements' | 'autoBalance';
type PublishMode = 'immediate' | 'draft';
type StationSource = 'routeOrigin' | 'routeDestination';

interface AutoAllocationSettings {
  enabled: boolean;
  dryRun: boolean;
  monitorIntervalMinutes: number;
  lookAheadDays: number;
  trigger: {
    remainingSeatsThreshold: number;
    currentOccupancyPercentThreshold: number;
    nextTripOccupancyPercentThreshold: number;
    requireNeighborPressure: boolean;
  };
  timePolicy: {
    mode: TimeMode;
    incrementsMinutes: number[];
    minGapMinutes: number;
  };
  standbyScope: {
    mode: ScopeMode;
    stationSource: StationSource;
  };
  publishPolicy: {
    mode: PublishMode;
  };
  creationLimits: {
    maxAutoTripsPerRoutePerDay: number;
    duplicateWindowMinutes: number;
  };
}

const defaultSettings: AutoAllocationSettings = {
  enabled: false,
  dryRun: false,
  monitorIntervalMinutes: 1,
  lookAheadDays: 7,
  trigger: {
    remainingSeatsThreshold: 1,
    currentOccupancyPercentThreshold: 90,
    nextTripOccupancyPercentThreshold: 90,
    requireNeighborPressure: true,
  },
  timePolicy: {
    mode: 'fixedIncrements',
    incrementsMinutes: [30, 45],
    minGapMinutes: 15,
  },
  standbyScope: {
    mode: 'stationRouteBusType',
    stationSource: 'routeOrigin',
  },
  publishPolicy: {
    mode: 'immediate',
  },
  creationLimits: {
    maxAutoTripsPerRoutePerDay: 2,
    duplicateWindowMinutes: 10,
  },
};

export function AutoAllocationTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoAllocationSettings>(defaultSettings);
  const [incrementsText, setIncrementsText] = useState('30,45');
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success) {
        const existing = data.data?.autoBusAllocation || {};
        const merged: AutoAllocationSettings = {
          ...defaultSettings,
          ...existing,
          trigger: {
            ...defaultSettings.trigger,
            ...(existing.trigger || {}),
          },
          timePolicy: {
            ...defaultSettings.timePolicy,
            ...(existing.timePolicy || {}),
          },
          standbyScope: {
            ...defaultSettings.standbyScope,
            ...(existing.standbyScope || {}),
          },
          publishPolicy: {
            ...defaultSettings.publishPolicy,
            ...(existing.publishPolicy || {}),
          },
          creationLimits: {
            ...defaultSettings.creationLimits,
            ...(existing.creationLimits || {}),
          },
        };

        setSettings(merged);
        setIncrementsText((merged.timePolicy.incrementsMinutes || []).join(','));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load auto allocation settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const parseIncrements = () => {
    const parsed = incrementsText
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value) && value > 0);

    if (parsed.length === 0) return [30, 45];
    return [...new Set(parsed)];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        autoBusAllocation: {
          ...settings,
          timePolicy: {
            ...settings.timePolicy,
            incrementsMinutes: parseIncrements(),
          },
        },
      };

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }

      toast({
        title: 'Success',
        description: 'Auto allocation settings saved successfully',
      });

      await fetchSettings();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const setNumber = (path: string, value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;

    setSettings((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let ref: any = next;
      for (let i = 0; i < keys.length - 1; i += 1) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = num;
      return next;
    });
  };

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading auto allocation settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Automatic Bus Allocation</h2>
        <p className="text-muted-foreground">
          Configure demand monitoring and automatic trip creation from standby pool capacity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engine Control</CardTitle>
          <CardDescription>Master controls for monitor and creation behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable auto allocation</Label>
            <Checkbox
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled: checked === true }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dryRun">Dry run (log only, no trip creation)</Label>
            <Checkbox
              id="dryRun"
              checked={settings.dryRun}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, dryRun: checked === true }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monitor interval (minutes)</Label>
              <Input type="number" min={1} max={60} value={settings.monitorIntervalMinutes} onChange={(e) => setNumber('monitorIntervalMinutes', e.target.value)} />
            </div>
            <div>
              <Label>Look-ahead days</Label>
              <Input type="number" min={1} max={30} value={settings.lookAheadDays} onChange={(e) => setNumber('lookAheadDays', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demand Trigger Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Remaining seats threshold</Label>
              <Input type="number" min={0} value={settings.trigger.remainingSeatsThreshold} onChange={(e) => setNumber('trigger.remainingSeatsThreshold', e.target.value)} />
            </div>
            <div>
              <Label>Current trip occupancy % threshold</Label>
              <Input type="number" min={1} max={100} value={settings.trigger.currentOccupancyPercentThreshold} onChange={(e) => setNumber('trigger.currentOccupancyPercentThreshold', e.target.value)} />
            </div>
            <div>
              <Label>Neighbor trip occupancy % threshold</Label>
              <Input type="number" min={1} max={100} value={settings.trigger.nextTripOccupancyPercentThreshold} onChange={(e) => setNumber('trigger.nextTripOccupancyPercentThreshold', e.target.value)} />
            </div>
            <div className="flex items-end justify-between border rounded-md px-3 py-2">
              <Label htmlFor="neighborPressure">Require neighbor pressure</Label>
              <Checkbox
                id="neighborPressure"
                checked={settings.trigger.requireNeighborPressure}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, trigger: { ...prev.trigger, requireNeighborPressure: checked === true } }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time and Scope Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time policy mode</Label>
              <Select value={settings.timePolicy.mode} onValueChange={(value: TimeMode) => setSettings((prev) => ({ ...prev, timePolicy: { ...prev.timePolicy, mode: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixedIncrements">Fixed increments</SelectItem>
                  <SelectItem value="autoBalance">Auto-balance between trips</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Increment list (minutes, comma-separated)</Label>
              <Input value={incrementsText} onChange={(e) => setIncrementsText(e.target.value)} placeholder="30,45" />
            </div>
            <div>
              <Label>Minimum gap between trips (minutes)</Label>
              <Input type="number" min={5} max={120} value={settings.timePolicy.minGapMinutes} onChange={(e) => setNumber('timePolicy.minGapMinutes', e.target.value)} />
            </div>
            <div>
              <Label>Standby scope mode</Label>
              <Select value={settings.standbyScope.mode} onValueChange={(value: ScopeMode) => setSettings((prev) => ({ ...prev, standbyScope: { ...prev.standbyScope, mode: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="station">Station only</SelectItem>
                  <SelectItem value="stationAndRoute">Station and route</SelectItem>
                  <SelectItem value="stationRouteBusType">Station, route and bus type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Station source</Label>
              <Select value={settings.standbyScope.stationSource} onValueChange={(value: StationSource) => setSettings((prev) => ({ ...prev, standbyScope: { ...prev.standbyScope, stationSource: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routeOrigin">Use route origin</SelectItem>
                  <SelectItem value="routeDestination">Use route destination</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Publish policy</Label>
              <Select value={settings.publishPolicy.mode} onValueChange={(value: PublishMode) => setSettings((prev) => ({ ...prev, publishPolicy: { mode: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Publish immediately</SelectItem>
                  <SelectItem value="draft">Create as draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creation Limits</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Max auto trips per route/day</Label>
            <Input type="number" min={1} max={20} value={settings.creationLimits.maxAutoTripsPerRoutePerDay} onChange={(e) => setNumber('creationLimits.maxAutoTripsPerRoutePerDay', e.target.value)} />
          </div>
          <div>
            <Label>Duplicate protection window (minutes)</Label>
            <Input type="number" min={1} max={60} value={settings.creationLimits.duplicateWindowMinutes} onChange={(e) => setNumber('creationLimits.duplicateWindowMinutes', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Auto Allocation Settings'}
        </Button>
      </div>
    </div>
  );
}
