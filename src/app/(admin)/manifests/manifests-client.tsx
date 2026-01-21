'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/hooks/use-permissions';
import { useIsSM, useIsBO, useIsSO } from '@/hooks/use-role';
import { ClipboardList, CheckCircle, XCircle, Lock } from 'lucide-react';

export function ManifestsClient() {
  const [manifests, setManifests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [manifestData, setManifestData] = useState<any>(null);
  
  const isSM = useIsSM();
  const isBO = useIsBO();
  const isSO = useIsSO();
  const canEdit = useHasPermission('manifests.edit');
  const canClose = useHasPermission('manifests.close');
  const canSubmit = useHasPermission('manifests.submit');

  const hasAccess = isSM || isBO || isSO;

  useEffect(() => {
    if (!hasAccess) {
      return;
    }
    
    fetchTrips();
  }, [hasAccess]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/trips?page=1&limit=50', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setManifests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManifest = async (tripId: string) => {
    try {
      const res = await fetch(`/api/admin/manifests/${tripId}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setManifestData(data);
        setSelectedTrip(tripId);
      }
    } catch (error) {
      console.error('Error fetching manifest:', error);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You must have Station Manager, Booking Officer, or Scheduling Officer role to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manifests</h1>
        <p className="text-muted-foreground">
          {isSM && 'Manage passenger check-in and submit finalized manifests'}
          {isBO && 'View manifests and passenger lists'}
          {isSO && 'View manifests for scheduling purposes'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Trip List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Trips</CardTitle>
            <CardDescription>Select a trip to view its manifest</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : manifests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No trips found
              </div>
            ) : (
              <div className="space-y-2">
                {manifests.map((trip: any) => (
                  <Button
                    key={trip._id}
                    variant={selectedTrip === trip._id ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => fetchManifest(trip._id)}
                  >
                    <div className="text-left">
                      <p className="font-semibold">{trip.title || 'Trip'}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.tripDate} {trip.time}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manifest Details */}
        <Card>
          <CardHeader>
            <CardTitle>Manifest Details</CardTitle>
            <CardDescription>
              {selectedTrip ? 'Passenger list and check-in status' : 'Select a trip to view manifest'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTrip ? (
              <div className="text-center py-8 text-muted-foreground">
                Select a trip to view its manifest
              </div>
            ) : manifestData ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="font-semibold">Trip Information</p>
                  <p className="text-sm">Date: {manifestData.trip?.tripDate}</p>
                  <p className="text-sm">Time: {manifestData.trip?.time}</p>
                  <p className="text-sm">Vehicle: {manifestData.trip?.vehicleNo || 'N/A'}</p>
                  <p className="text-sm">Transport Officer: {manifestData.trip?.transportOfficerName || 'N/A'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold">Passengers ({manifestData.bookings?.length || 0})</p>
                  {manifestData.bookings?.map((booking: any) => (
                    <div key={booking._id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{booking.firstName} {booking.lastName}</p>
                        <p className="text-sm text-muted-foreground">
                          Seat: {booking.tripSeat || 'N/A'} | {booking.from} → {booking.to}
                        </p>
                      </div>
                      {isSM && canEdit && (
                        <Button
                          size="sm"
                          variant={booking.onBoarded ? 'default' : 'outline'}
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/admin/manifests/${tripId}`, {
                                method: 'PATCH',
                                credentials: 'include',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  bookings: [{
                                    bookingId: booking._id,
                                    onBoarded: !booking.onBoarded
                                  }]
                                })
                              });
                              if (res.ok) {
                                fetchManifest(tripId);
                              }
                            } catch (error) {
                              console.error('Error updating onboard status:', error);
                            }
                          }}
                        >
                          {booking.onBoarded ? 'Onboarded' : 'Check In'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                {isSM && (
                  <div className="flex gap-2 pt-4">
                    {canClose && !manifestData.trip?.isLocked && (
                      <Button variant="outline" onClick={async () => {
                        try {
                          const res = await fetch(`/api/admin/manifests/${tripId}/close`, {
                            method: 'POST',
                            credentials: 'include'
                          });
                          if (res.ok) {
                            fetchManifest(tripId);
                            alert('Manifest closed successfully');
                          }
                        } catch (error) {
                          console.error('Error closing manifest:', error);
                          alert('Failed to close manifest');
                        }
                      }}>
                        Close Manifest
                      </Button>
                    )}
                    {canSubmit && !manifestData.trip?.isLocked && (
                      <Button onClick={async () => {
                        if (confirm('Are you sure you want to submit this manifest to QuickBooks? This will lock the manifest and prevent further edits.')) {
                          try {
                            const res = await fetch(`/api/admin/manifests/${tripId}/submit`, {
                              method: 'POST',
                              credentials: 'include'
                            });
                            if (res.ok) {
                              const data = await res.json();
                              fetchManifest(tripId);
                              alert(`Manifest submitted successfully! Total Revenue: ₦${data.financialData?.totalRevenue?.toLocaleString() || 0}`);
                            }
                          } catch (error) {
                            console.error('Error submitting manifest:', error);
                            alert('Failed to submit manifest');
                          }
                        }
                      }}>
                        Submit to QuickBooks
                      </Button>
                    )}
                    {manifestData.trip?.isLocked && (
                      <div className="text-sm text-muted-foreground p-2 bg-yellow-50 border border-yellow-200 rounded">
                        Manifest is locked and cannot be edited
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">Loading manifest...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
