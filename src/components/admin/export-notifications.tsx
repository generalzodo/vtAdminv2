'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

type ExportJob = {
  _id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'expired';
  progress?: { processed?: number; total?: number | null };
  file?: { name?: string | null };
  error?: { message?: string | null };
  createdAt?: string;
  expiresAt?: string;
};

const isObjectIdString = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);

const normalizeJobId = (job: any): string => {
  const raw = job?._id ?? job?.id;
  if (isObjectIdString(raw)) return raw;
  if (typeof raw === 'string') {
    // Handle strings like: ObjectId("...") or new ObjectId("...")
    const m = raw.match(/([a-fA-F0-9]{24})/);
    if (m && isObjectIdString(m[1])) return m[1];
  }
  if (raw && typeof raw === 'object') {
    // Sometimes ObjectIds serialize as { "$oid": "..." } depending on tooling.
    if (isObjectIdString((raw as any).$oid)) return (raw as any).$oid;
    if (typeof (raw as any).toString === 'function') {
      const s = (raw as any).toString();
      if (isObjectIdString(s)) return s;
    }
  }
  return '';
};

const statusLabel = (s: ExportJob['status']) => {
  if (s === 'queued') return 'Queued';
  if (s === 'running') return 'Generating';
  if (s === 'completed') return 'Ready';
  if (s === 'failed') return 'Failed';
  return 'Expired';
};

// Play completion sound
const playCompletionSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play a pleasant double beep
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
    
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    oscillator.start(audioContext.currentTime + 0.15);
    oscillator.stop(audioContext.currentTime + 0.25);
  } catch (e) {
    // Silently fail if audio context is not available
  }
};

export function ExportNotifications() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const completedJobsRef = useRef<Set<string>>(new Set());

  const pendingCount = useMemo(
    () => jobs.filter((j) => j.status === 'queued' || j.status === 'running').length,
    [jobs]
  );

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/exports?limit=20', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      // Filter out jobs without valid IDs and normalize the rest
      const validJobs = (data.jobs || [])
        .map((j: any) => {
          const id = normalizeJobId(j);
          return id ? { ...j, _id: id } : null;
        })
        .filter((j: any): j is ExportJob => j !== null);
      
      // Check for newly completed jobs
      validJobs.forEach((job) => {
        if (job.status === 'completed' && !completedJobsRef.current.has(job._id)) {
          completedJobsRef.current.add(job._id);
          playCompletionSound();
        }
      });
      
      setJobs(validJobs);
    } catch (e) {
      // silent (notifier should never block UX)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Poll every 60 seconds to reduce bandwidth usage
    const intervalId = setInterval(() => {
      fetchJobs();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleDownload = async (jobId: string | undefined) => {
    if (!jobId || !isObjectIdString(jobId)) {
      console.error('Invalid job ID for download:', jobId);
      return;
    }
    // Use normal navigation so browser handles download prompt correctly.
    window.open(`/api/admin/exports/${jobId}/download`, '_blank');
  };

  const handleRemove = async (jobId: string) => {
    try {
      setRemovingId(jobId);
      if (!isObjectIdString(jobId)) return;
      const res = await fetch(`/api/admin/exports/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j._id !== jobId));
        completedJobsRef.current.delete(jobId);
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground animate-pulse">
              {pendingCount}
            </span>
          )}
          <span className="sr-only">Exports</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Exports</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {jobs.length === 0 ? (
          <DropdownMenuItem disabled>No exports yet</DropdownMenuItem>
        ) : (
          jobs.slice(0, 20).map((j) => (
            <DropdownMenuItem key={j._id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{j.type}</span>
                  <Badge variant={j.status === 'completed' ? 'default' : j.status === 'failed' ? 'destructive' : 'secondary'}>
                    {statusLabel(j.status)}
                  </Badge>
                </div>
                {j.status === 'failed' && j.error?.message ? (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{j.error.message}</div>
                ) : j.status === 'running' && j.progress?.processed ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Processed: {j.progress.processed}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {j.file?.name || ' '}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {j.status === 'completed' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (j._id && isObjectIdString(j._id)) {
                          handleDownload(j._id);
                        } else {
                          console.error('Download clicked with invalid ID:', j._id, j);
                        }
                      }}
                      disabled={!j._id || !isObjectIdString(j._id)}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (j._id && isObjectIdString(j._id)) {
                          handleRemove(j._id);
                        }
                      }}
                      disabled={removingId === j._id || !j._id || !isObjectIdString(j._id)}
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : j.status === 'queued' || j.status === 'running' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (j._id && isObjectIdString(j._id)) {
                        handleRemove(j._id);
                      }
                    }}
                    disabled={removingId === j._id || !j._id || !isObjectIdString(j._id)}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

  const handleDownload = async (jobId: string | undefined) => {
    if (!jobId || !isObjectIdString(jobId)) {
      console.error('Invalid job ID for download:', jobId);
      return;
    }
    // Use normal navigation so browser handles download prompt correctly.
    window.open(`/api/admin/exports/${jobId}/download`, '_blank');
  };

  const handleRemove = async (jobId: string) => {
    try {
      setRemovingId(jobId);
      if (!isObjectIdString(jobId)) return;
      const res = await fetch(`/api/admin/exports/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j._id !== jobId));
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
              {pendingCount}
            </span>
          )}
          <span className="sr-only">Exports</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Exports</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {jobs.length === 0 ? (
          <DropdownMenuItem disabled>No exports yet</DropdownMenuItem>
        ) : (
          jobs.slice(0, 20).map((j) => (
            <DropdownMenuItem key={j._id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{j.type}</span>
                  <Badge variant={j.status === 'completed' ? 'default' : j.status === 'failed' ? 'destructive' : 'secondary'}>
                    {statusLabel(j.status)}
                  </Badge>
                </div>
                {j.status === 'failed' && j.error?.message ? (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{j.error.message}</div>
                ) : j.status === 'running' && j.progress?.processed ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Processed: {j.progress.processed}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {j.file?.name || ' '}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {j.status === 'completed' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (j._id && isObjectIdString(j._id)) {
                          handleDownload(j._id);
                        } else {
                          console.error('Download clicked with invalid ID:', j._id, j);
                        }
                      }}
                      disabled={!j._id || !isObjectIdString(j._id)}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (j._id && isObjectIdString(j._id)) {
                          handleRemove(j._id);
                        }
                      }}
                      disabled={removingId === j._id || !j._id || !isObjectIdString(j._id)}
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : j.status === 'queued' || j.status === 'running' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (j._id && isObjectIdString(j._id)) {
                        handleRemove(j._id);
                      }
                    }}
                    disabled={removingId === j._id || !j._id || !isObjectIdString(j._id)}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

