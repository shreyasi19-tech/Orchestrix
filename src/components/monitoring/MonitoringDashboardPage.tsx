import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { jobsStore } from '../../services/jobsStore';
import { DLQRecord, InfraJob, WorkerInstance } from '../../types/orchestration';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { MonitoringPageSkeleton } from '../common/Skeletons';

type TimeRangeKey = '1H' | '24H' | '7D' | '30D';
type ChartSeriesKey = 'throughput' | 'latency' | 'cpu' | 'dlq';
type DistributionGroupKey = 'status' | 'type' | 'priority';
type ActivityFilterKey = 'all' | 'completed' | 'failures' | 'active';

interface MetricPoint {
  timestamp: number;
  throughput: number;
  completedCount?: number;
  failedCount?: number;
  queueWaitTimeMs: number;
  p95WaitTimeMs?: number;
  activeLeases: number;
  cpuAvg: number;
  memoryAvg?: number;
  worker1Cpu?: number;
  worker2Cpu?: number;
  worker3Cpu?: number;
  worker4Cpu?: number;
  dlqCount?: number;
}

interface MonitoringSummary {
  totalWorkers: number;
  activeWorkers: number;
  running: number;
  queued: number;
  dlqCount: number;
  throughputPerMin: number;
  avgWaitTimeSec: number;
  slaPercentage: number;
}

interface ActivityEvent {
  id: string;
  timestamp: number;
  kind: 'Completed' | 'Running' | 'Queued' | 'Retry' | 'Failed / DLQ' | 'Paused';
  jobId: string;
  jobName: string;
  worker: string;
  detail: string;
}

const TIME_RANGE_MS: Record<TimeRangeKey, number> = {
  '1H': 60 * 60 * 1000,
  '24H': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  '30D': 30 * 24 * 60 * 60 * 1000,
};

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatTimeShort(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getJobActivityTimestamp(job: InfraJob): number {
  const anyJob = job as InfraJob & { completedTimestamp?: number };
  return Math.max(
    anyJob.completedTimestamp || 0,
    job.startedTimestamp || 0,
    job.enqueuedAt || 0
  );
}

export const MonitoringDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary>({
    totalWorkers: 0,
    activeWorkers: 0,
    running: 0,
    queued: 0,
    dlqCount: 0,
    throughputPerMin: 0,
    avgWaitTimeSec: 0,
    slaPercentage: 100,
  });
  const [weights, setWeights] = useState<Record<string, number>>({
    specialization: 45,
    workerLoad: 30,
    historicalPerformance: 25,
    errorRatePenalty: 20,
    agingRatePerSec: 1.5,
  });
  const [jobs, setJobs] = useState<InfraJob[]>(jobsStore.getJobs());
  const [workers, setWorkers] = useState<WorkerInstance[]>(jobsStore.getWorkers());
  const [dlqRecords, setDlqRecords] = useState<DLQRecord[]>(jobsStore.getDLQ());

  const [timeRange, setTimeRange] = useState<TimeRangeKey>('1H');
  const [activeSeries, setActiveSeries] = useState<ChartSeriesKey>('throughput');
  const [distributionGroup, setDistributionGroup] = useState<DistributionGroupKey>('status');
  const [activityFilter, setActivityFilter] = useState<ActivityFilterKey>('all');

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await api.monitoring.getData();
      if (res) {
        if (Array.isArray(res.metricsHistory)) {
          setMetrics(res.metricsHistory);
        }
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.weights) {
          setWeights(res.weights);
        }
      }
      setFetchError(null);
      setLastUpdatedAt(Date.now());
    } catch (err: any) {
      setFetchError(err?.message || 'Unable to load monitoring telemetry.');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncStore = () => {
      setJobs(jobsStore.getJobs());
      setWorkers(jobsStore.getWorkers());
      setDlqRecords(jobsStore.getDLQ());
    };
    syncStore();
    const unsub = jobsStore.subscribe(syncStore);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    void fetchTelemetry();
    if (!isLiveStreaming) return;
    const timer = setInterval(() => {
      void fetchTelemetry();
    }, 1500);
    return () => clearInterval(timer);
  }, [fetchTelemetry, isLiveStreaming]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchTelemetry(), jobsStore.refresh()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const rangeCutoff = useMemo(() => {
    const latestMetricTs =
      metrics.length > 0 ? metrics[metrics.length - 1].timestamp : Date.now();
    const anchor = Math.max(Date.now(), latestMetricTs);
    return anchor - TIME_RANGE_MS[timeRange];
  }, [metrics, timeRange]);

  const displayedMetrics = useMemo(() => {
    return metrics.filter((point) => point.timestamp >= rangeCutoff);
  }, [metrics, rangeCutoff]);

  const jobsInRange = useMemo(() => {
    return jobs.filter((job) => {
      const ts = getJobActivityTimestamp(job);
      return ts === 0 || ts >= rangeCutoff;
    });
  }, [jobs, rangeCutoff]);

  // Real KPI derivations strictly from backend data
  const kpis = useMemo(() => {
    const completedJobs = jobsInRange.filter((j) => j.status === 'Completed');
    const failedJobs = jobsInRange.filter((j) => j.status === 'Failed');
    const runningJobs = jobsInRange.filter((j) => j.status === 'Running');

    const processedFromJobs = completedJobs.length + failedJobs.length;
    const workerTotalCompleted = workers.reduce((sum, w) => sum + (w.jobsCompleted || 0), 0);
    const workerTotalFailed = workers.reduce((sum, w) => sum + (w.jobsFailed || 0), 0);

    // Total Workloads Processed: exact job records processed in selected window (with lifetime node total as sub-label)
    const totalProcessed = processedFromJobs;
    const lifetimeProcessed = workerTotalCompleted + workerTotalFailed;

    const successRate =
      processedFromJobs > 0
        ? (completedJobs.length / processedFromJobs) * 100
        : summary.slaPercentage;

    // Average Execution Latency: real completed/running durationSeconds from backend jobs,
    // or weighted average across worker telemetry if no completed job durations exist in window
    const durationSamplesMs = jobsInRange
      .filter((j) => (j.status === 'Completed' || j.status === 'Running') && (j.durationSeconds || 0) > 0)
      .map((j) => (j.durationSeconds || 0) * 1000);

    let avgExecutionMs = 0;
    let execSampleCount = durationSamplesMs.length;
    if (durationSamplesMs.length > 0) {
      avgExecutionMs =
        durationSamplesMs.reduce((acc, val) => acc + val, 0) / durationSamplesMs.length;
    } else if (workerTotalCompleted > 0) {
      const weightedTotal = workers.reduce(
        (sum, w) => sum + (w.avgExecutionTimeMs || 0) * (w.jobsCompleted || 0),
        0
      );
      avgExecutionMs = weightedTotal / workerTotalCompleted;
      execSampleCount = workerTotalCompleted;
    }

    // Queue Wait Time: real backend telemetry latest point or average over range points
    const latestPoint = displayedMetrics[displayedMetrics.length - 1];
    const avgWaitMs = latestPoint
      ? latestPoint.queueWaitTimeMs
      : Math.round((summary.avgWaitTimeSec || 0) * 1000);
    const p95WaitMs = latestPoint?.p95WaitTimeMs ?? avgWaitMs;

    return {
      totalProcessed,
      lifetimeProcessed,
      completedCount: completedJobs.length,
      failedCount: failedJobs.length,
      runningCount: runningJobs.length,
      successRate,
      avgExecutionMs,
      execSampleCount,
      avgWaitMs,
      p95WaitMs,
    };
  }, [jobsInRange, workers, displayedMetrics, summary]);

  // SVG Chart Geometry
  const chartConfig = useMemo(() => {
    const width = 880;
    const height = 260;
    const padding = { top: 18, right: 20, bottom: 28, left: 48 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const data = displayedMetrics;
    const len = data.length;

    let maxValue = 10;
    if (activeSeries === 'throughput') {
      const maxT = data.reduce((m, d) => Math.max(m, d.throughput || 0, d.completedCount || 0), 0);
      maxValue = Math.max(10, Math.ceil(maxT * 1.25));
    } else if (activeSeries === 'latency') {
      const maxL = data.reduce(
        (m, d) => Math.max(m, d.p95WaitTimeMs || 0, d.queueWaitTimeMs || 0),
        0
      );
      maxValue = Math.max(1000, Math.ceil(maxL * 1.2));
    } else if (activeSeries === 'cpu') {
      maxValue = 100;
    } else if (activeSeries === 'dlq') {
      const maxD = data.reduce(
        (m, d) => Math.max(m, d.dlqCount || 0, d.failedCount || 0),
        0
      );
      maxValue = Math.max(4, maxD + 1);
    }

    const getX = (idx: number) =>
      len <= 1
        ? padding.left + innerWidth / 2
        : padding.left + (idx / (len - 1)) * innerWidth;

    const getY = (val: number) =>
      padding.top +
      innerHeight -
      (Math.min(maxValue, Math.max(0, val)) / maxValue) * innerHeight;

    const makeLinePath = (values: number[]) => {
      if (values.length === 0) return '';
      if (values.length === 1) {
        const y = getY(values[0]);
        return `M ${padding.left} ${y} L ${padding.left + innerWidth} ${y}`;
      }
      return values
        .map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(val).toFixed(1)}`)
        .join(' ');
    };

    const makeAreaPath = (values: number[]) => {
      if (values.length === 0) return '';
      const lineD = makeLinePath(values);
      const startX = values.length === 1 ? padding.left : getX(0);
      const endX = values.length === 1 ? padding.left + innerWidth : getX(values.length - 1);
      const bottomY = padding.top + innerHeight;
      return `${lineD} L ${endX.toFixed(1)} ${bottomY} L ${startX.toFixed(1)} ${bottomY} Z`;
    };

    return {
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      maxValue,
      getX,
      getY,
      makeLinePath,
      makeAreaPath,
    };
  }, [displayedMetrics, activeSeries]);

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || displayedMetrics.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * chartConfig.width;
    const clampedX = Math.max(
      chartConfig.padding.left,
      Math.min(chartConfig.width - chartConfig.padding.right, relX)
    );
    const fraction = (clampedX - chartConfig.padding.left) / chartConfig.innerWidth;
    const idx = Math.round(fraction * Math.max(0, displayedMetrics.length - 1));
    setHoverIndex(Math.max(0, Math.min(displayedMetrics.length - 1, idx)));
  };

  const activeSample =
    hoverIndex !== null && displayedMetrics[hoverIndex]
      ? displayedMetrics[hoverIndex]
      : displayedMetrics[displayedMetrics.length - 1];

  // Execution Distribution computed strictly from real jobsInRange
  const distributionRows = useMemo(() => {
    const total = jobsInRange.length;
    if (distributionGroup === 'status') {
      const specs: Array<{ label: string; count: number; color: string }> = [
        {
          label: 'Completed',
          count: jobsInRange.filter((j) => j.status === 'Completed').length,
          color: '#059669',
        },
        {
          label: 'Running',
          count: jobsInRange.filter((j) => j.status === 'Running').length,
          color: '#0284C7',
        },
        {
          label: 'Queued',
          count: jobsInRange.filter((j) => j.status === 'Queued').length,
          color: '#D97706',
        },
        {
          label: 'Paused',
          count: jobsInRange.filter((j) => j.status === 'Paused').length,
          color: '#6B5D51',
        },
        {
          label: 'Failed / DLQ',
          count: jobsInRange.filter((j) => j.status === 'Failed' || j.status === 'Cancelled').length,
          color: '#E11D48',
        },
      ];
      return specs.map((item) => ({
        ...item,
        pct: total > 0 ? (item.count / total) * 100 : 0,
      }));
    }

    if (distributionGroup === 'priority') {
      const tiers: Array<{ label: InfraJob['priority']; color: string }> = [
        { label: 'Critical', color: '#E11D48' },
        { label: 'High', color: '#874924' },
        { label: 'Medium', color: '#0284C7' },
        { label: 'Low', color: '#6B5D51' },
      ];
      return tiers.map((tier) => {
        const count = jobsInRange.filter((j) => j.priority === tier.label).length;
        return {
          label: tier.label,
          count,
          color: tier.color,
          pct: total > 0 ? (count / total) * 100 : 0,
        };
      });
    }

    const typePalette = ['#0284C7', '#874924', '#059669', '#D97706', '#7C3AED', '#5D5044'];
    const countsByType = new Map<string, number>();
    for (const job of jobsInRange) {
      countsByType.set(job.type, (countsByType.get(job.type) || 0) + 1);
    }
    return Array.from(countsByType.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], idx) => ({
        label,
        count,
        color: typePalette[idx % typePalette.length],
        pct: total > 0 ? (count / total) * 100 : 0,
      }));
  }, [jobsInRange, distributionGroup]);

  // Recent Activity feed strictly derived from backend jobs + DLQ records
  const recentActivity = useMemo(() => {
    const events: ActivityEvent[] = [];

    for (const job of jobsInRange) {
      const ts = getJobActivityTimestamp(job);
      const latestLog = job.logs && job.logs.length > 0 ? job.logs[job.logs.length - 1] : null;
      const lastRetry =
        job.retries && job.retries.length > 0 ? job.retries[job.retries.length - 1] : null;

      if (job.status === 'Failed' || job.inDLQ) {
        events.push({
          id: `act-fail-${job.id}`,
          timestamp: ts,
          kind: 'Failed / DLQ',
          jobId: job.id,
          jobName: job.name,
          worker: job.worker || '—',
          detail: job.dlqReason || latestLog?.message || 'Quarantined in Dead Letter Queue',
        });
      } else if (job.status === 'Queued' && lastRetry) {
        events.push({
          id: `act-retry-${job.id}`,
          timestamp: ts,
          kind: 'Retry',
          jobId: job.id,
          jobName: job.name,
          worker: lastRetry.workerName || lastRetry.workerId,
          detail: `Re-queued after attempt #${lastRetry.attemptNumber || 1} (${lastRetry.backoffDuration || 'backoff'})`,
        });
      } else if (job.status === 'Completed') {
        events.push({
          id: `act-done-${job.id}`,
          timestamp: ts,
          kind: 'Completed',
          jobId: job.id,
          jobName: job.name,
          worker: job.worker || '—',
          detail: `Duration ${job.duration || formatDurationMs((job.durationSeconds || 0) * 1000)}`,
        });
      } else if (job.status === 'Running') {
        events.push({
          id: `act-run-${job.id}`,
          timestamp: ts,
          kind: 'Running',
          jobId: job.id,
          jobName: job.name,
          worker: job.worker || '—',
          detail: latestLog?.message || `Executing (${job.priority} priority)`,
        });
      } else if (job.status === 'Paused') {
        events.push({
          id: `act-pause-${job.id}`,
          timestamp: ts,
          kind: 'Paused',
          jobId: job.id,
          jobName: job.name,
          worker: job.worker || '—',
          detail: 'Execution paused by operator',
        });
      } else {
        events.push({
          id: `act-queue-${job.id}`,
          timestamp: ts,
          kind: 'Queued',
          jobId: job.id,
          jobName: job.name,
          worker: 'Scheduler Queue',
          detail: `${job.priority} priority · Effective score ${job.effectivePriority ?? job.basePriority ?? 50}`,
        });
      }
    }

    // Include DLQ records whose original job may no longer be in active filter
    for (const rec of dlqRecords) {
      const exists = events.some((e) => e.jobId === rec.originalJob?.id && e.kind === 'Failed / DLQ');
      if (!exists && rec.failedAt >= rangeCutoff) {
        events.push({
          id: `act-dlq-${rec.id}`,
          timestamp: rec.failedAt,
          kind: 'Failed / DLQ',
          jobId: rec.originalJob?.id || rec.id,
          jobName: rec.originalJob?.title || (rec.originalJob as any)?.name || rec.id,
          worker: 'Watchdog',
          detail: rec.failureReason,
        });
      }
    }

    const sorted = events.sort((a, b) => b.timestamp - a.timestamp);
    if (activityFilter === 'completed') {
      return sorted.filter((e) => e.kind === 'Completed').slice(0, 12);
    }
    if (activityFilter === 'failures') {
      return sorted.filter((e) => e.kind === 'Failed / DLQ' || e.kind === 'Retry').slice(0, 12);
    }
    if (activityFilter === 'active') {
      return sorted.filter((e) => e.kind === 'Running' || e.kind === 'Queued').slice(0, 12);
    }
    return sorted.slice(0, 12);
  }, [jobsInRange, dlqRecords, rangeCutoff, activityFilter]);

  const crashedWorkersCount = workers.filter((w) => w.status === 'crashed').length;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      {/* Compact Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EAE1D4]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#241812] font-sans">
              Monitoring
            </h1>
            <span className="text-xs font-mono text-[#5D5044] tabular-nums">
              {summary.activeWorkers}/{summary.totalWorkers} nodes active
              <span className="mx-1.5" aria-hidden="true">·</span>
              {crashedWorkersCount > 0 ? (
                <span className="text-[#BE123C] font-semibold">
                  {crashedWorkersCount} crashed
                </span>
              ) : (
                <span>SLA {summary.slaPercentage}%</span>
              )}
              {lastUpdatedAt && (
                <>
                  <span className="mx-1.5 hidden sm:inline" aria-hidden="true">·</span>
                  <span className="hidden sm:inline">Updated {formatTimeShort(lastUpdatedAt)}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Right Controls: Time Range (1H, 24H, 7D, 30D), Refresh, Live Status */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Time-Range Selector */}
          <div
            role="group"
            aria-label="Select telemetry time range"
            className="inline-flex items-center p-0.5 rounded-lg bg-[#F4ECE1] border border-[#EAE1D4]"
          >
            {(['1H', '24H', '7D', '30D'] as TimeRangeKey[]).map((range) => (
              <button
                key={range}
                type="button"
                aria-pressed={timeRange === range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeRange === range
                    ? 'bg-white text-[#241812] font-semibold border border-[#EAE1D4]'
                    : 'text-[#5D5044] hover:text-[#241812] border border-transparent'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            aria-label="Refresh telemetry"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF6F0] border border-[#EAE1D4] text-xs font-medium text-[#241812] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5D5044] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Live Status Indicator & Toggle */}
          <button
            type="button"
            aria-pressed={isLiveStreaming}
            onClick={() => setIsLiveStreaming((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isLiveStreaming
                ? 'bg-white border-[#EAE1D4] text-[#047857]'
                : 'bg-[#FAF6F0] border-[#EAE1D4] text-[#5D5044]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isLiveStreaming ? 'bg-[#10B981] animate-pulse' : 'bg-[#9CA3AF]'
              }`}
              aria-hidden="true"
            />
            <span>{isLiveStreaming ? 'Live' : 'Paused'}</span>
            {isLiveStreaming ? (
              <Pause className="w-3 h-3 text-[#5D5044]" />
            ) : (
              <Play className="w-3 h-3 text-[#5D5044]" />
            )}
          </button>
        </div>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] flex flex-wrap items-center justify-between gap-3 text-xs text-[#BE123C]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3 py-1 rounded-md bg-white border border-[#FECDD3] text-[#BE123C] font-medium hover:bg-[#FFF5F6] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {isInitialLoading ? (
        <MonitoringPageSkeleton />
      ) : (
        <>
          {/* Four Minimal KPI Cards */}
          <section aria-label="Key telemetry metrics" className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#EAE1D4] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-[#5D5044] font-medium mb-2">
                <span>Total Workloads Processed</span>
                <Activity className="w-3.5 h-3.5 text-[#5D5044]" aria-hidden="true" />
              </div>
              <div className="text-2xl font-semibold font-mono text-[#241812] tabular-nums">
                <AnimatedCounter value={kpis.totalProcessed} showDelta={false} />
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-[#5D5044] tabular-nums">
                {kpis.completedCount} completed · {kpis.failedCount} failed · {kpis.lifetimeProcessed.toLocaleString()} node total
              </div>
            </div>

            <div className="bg-white border border-[#EAE1D4] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-[#5D5044] font-medium mb-2">
                <span>Success Rate</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" aria-hidden="true" />
              </div>
              <div className="text-2xl font-semibold font-mono text-[#241812] tabular-nums">
                {kpis.successRate.toFixed(1)}%
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-[#5D5044] tabular-nums flex items-center gap-1.5">
                <span className={summary.dlqCount > 0 ? 'text-[#BE123C] font-medium' : ''}>
                  <AnimatedCounter value={summary.dlqCount} suffix=" in DLQ" showDelta={true} />
                </span>
                <span aria-hidden="true">·</span>
                <span>{kpis.runningCount} running</span>
              </div>
            </div>

            <div className="bg-white border border-[#EAE1D4] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-[#5D5044] font-medium mb-2">
                <span>Average Execution Latency</span>
                <Cpu className="w-3.5 h-3.5 text-[#874924]" aria-hidden="true" />
              </div>
              <div className="text-2xl font-semibold font-mono text-[#241812] tabular-nums">
                {formatDurationMs(kpis.avgExecutionMs)}
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-[#5D5044] tabular-nums">
                {kpis.execSampleCount > 0
                  ? `Across ${kpis.execSampleCount} workload samples`
                  : 'Awaiting completed runs'}
              </div>
            </div>

            <div className="bg-white border border-[#EAE1D4] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-[#5D5044] font-medium mb-2">
                <span>Queue Wait Time</span>
                <Clock className="w-3.5 h-3.5 text-[#0369A1]" aria-hidden="true" />
              </div>
              <div className="text-2xl font-semibold font-mono text-[#241812] tabular-nums">
                {formatDurationMs(kpis.avgWaitMs)}
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-[#5D5044] tabular-nums">
                P95 {formatDurationMs(kpis.p95WaitMs)} · {summary.queued} queued
              </div>
            </div>
          </section>

          {/* Large Workload Throughput Line Chart */}
          <section
            aria-label="Workload throughput chart"
            className="bg-white border border-[#EAE1D4] rounded-xl p-4 sm:p-5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#EAE1D4]">
              <div>
                <h2 className="text-sm font-semibold text-[#241812] font-sans">
                  {activeSeries === 'throughput'
                    ? 'Workload Throughput'
                    : activeSeries === 'latency'
                    ? 'Queue Wait Latency'
                    : activeSeries === 'cpu'
                    ? 'Worker CPU Utilization'
                    : 'Dead Letter Queue Volume'}
                </h2>
                <div className="mt-0.5 text-xs font-mono text-[#5D5044] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-1">
                  {activeSample ? (
                    <>
                      <span>{formatTimeShort(activeSample.timestamp)}</span>
                      <span aria-hidden="true">·</span>
                      {activeSeries === 'throughput' && (
                        <>
                          <span className="text-[#0369A1] font-semibold">
                            {activeSample.throughput} jobs/min
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#047857]">
                            {activeSample.completedCount ?? 0} completed
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{activeSample.activeLeases} active leases</span>
                        </>
                      )}
                      {activeSeries === 'latency' && (
                        <>
                          <span className="text-[#874924] font-semibold">
                            Mean {formatDurationMs(activeSample.queueWaitTimeMs)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#BE123C]">
                            P95 {formatDurationMs(activeSample.p95WaitTimeMs ?? activeSample.queueWaitTimeMs)}
                          </span>
                        </>
                      )}
                      {activeSeries === 'cpu' && (
                        <>
                          <span className="text-[#241812] font-semibold">
                            Cluster avg {activeSample.cpuAvg}%
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>RAM avg {activeSample.memoryAvg ?? 0}%</span>
                        </>
                      )}
                      {activeSeries === 'dlq' && (
                        <>
                          <span className="text-[#BE123C] font-semibold">
                            {activeSample.dlqCount ?? summary.dlqCount} quarantined
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{activeSample.failedCount ?? 0} failed/min</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span>Waiting for backend telemetry samples</span>
                  )}
                </div>
              </div>

              {/* Clean Segmented Metric Selector */}
              <div
                role="tablist"
                aria-label="Chart metric series"
                className="inline-flex flex-wrap items-center p-0.5 rounded-lg bg-[#FAF6F0] border border-[#EAE1D4] self-start md:self-auto"
              >
                {(
                  [
                    { key: 'throughput', label: 'Throughput' },
                    { key: 'latency', label: 'Wait Time' },
                    { key: 'cpu', label: 'Node CPU' },
                    { key: 'dlq', label: 'DLQ' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeSeries === tab.key}
                    onClick={() => setActiveSeries(tab.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSeries === tab.key
                        ? 'bg-white text-[#241812] font-semibold border border-[#EAE1D4]'
                        : 'text-[#5D5044] hover:text-[#241812] border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {displayedMetrics.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm font-medium text-[#241812]">
                  No telemetry samples in the {timeRange} window yet
                </p>
                <p className="text-xs text-[#5D5044] mt-1 max-w-md">
                  The backend scheduler records telemetry samples every 5 seconds. Refresh or switch to a wider time window.
                </p>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="mt-3 px-3 py-1.5 rounded-lg border border-[#EAE1D4] bg-[#FAF6F0] hover:bg-white text-xs font-medium text-[#241812] cursor-pointer"
                >
                  Refresh Now
                </button>
              </div>
            ) : (
              <div className="pt-4">
                <svg
                  ref={svgRef}
                  role="img"
                  aria-label="Backend workload telemetry line chart"
                  viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                  className="w-full h-64 sm:h-72 cursor-crosshair overflow-visible"
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {/* Hairline Horizontal Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = chartConfig.padding.top + chartConfig.innerHeight * ratio;
                    const rawVal = Math.round(chartConfig.maxValue * (1 - ratio));
                    const label =
                      activeSeries === 'latency'
                        ? rawVal >= 1000
                          ? `${(rawVal / 1000).toFixed(1)}s`
                          : `${rawVal}ms`
                        : activeSeries === 'cpu'
                        ? `${rawVal}%`
                        : `${rawVal}`;
                    return (
                      <g key={idx}>
                        <line
                          x1={chartConfig.padding.left}
                          y1={y}
                          x2={chartConfig.width - chartConfig.padding.right}
                          y2={y}
                          stroke="#EFE8DD"
                          strokeWidth="1"
                        />
                        <text
                          x={chartConfig.padding.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill="#5D5044"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Series 1: Workload Throughput */}
                  {activeSeries === 'throughput' && (
                    <>
                      <path
                        d={chartConfig.makeAreaPath(displayedMetrics.map((d) => d.throughput))}
                        fill="#0284C7"
                        fillOpacity="0.05"
                      />
                      <path
                        d={chartConfig.makeLinePath(displayedMetrics.map((d) => d.throughput))}
                        fill="none"
                        stroke="#0284C7"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <path
                        d={chartConfig.makeLinePath(
                          displayedMetrics.map((d) => d.completedCount ?? d.throughput)
                        )}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                    </>
                  )}

                  {/* Series 2: Queue Wait Latency */}
                  {activeSeries === 'latency' && (
                    <>
                      <path
                        d={chartConfig.makeAreaPath(displayedMetrics.map((d) => d.queueWaitTimeMs))}
                        fill="#874924"
                        fillOpacity="0.05"
                      />
                      <path
                        d={chartConfig.makeLinePath(displayedMetrics.map((d) => d.queueWaitTimeMs))}
                        fill="none"
                        stroke="#874924"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d={chartConfig.makeLinePath(
                          displayedMetrics.map((d) => d.p95WaitTimeMs ?? d.queueWaitTimeMs)
                        )}
                        fill="none"
                        stroke="#BE123C"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                    </>
                  )}

                  {/* Series 3: Worker CPU Saturation */}
                  {activeSeries === 'cpu' && (
                    <>
                      <path
                        d={chartConfig.makeAreaPath(displayedMetrics.map((d) => d.cpuAvg))}
                        fill="#241812"
                        fillOpacity="0.04"
                      />
                      <path
                        d={chartConfig.makeLinePath(displayedMetrics.map((d) => d.worker1Cpu ?? 0))}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="1.75"
                      />
                      <path
                        d={chartConfig.makeLinePath(displayedMetrics.map((d) => d.worker2Cpu ?? 0))}
                        fill="none"
                        stroke="#D97706"
                        strokeWidth="1.75"
                      />
                      <path
                        d={chartConfig.makeLinePath(displayedMetrics.map((d) => d.worker3Cpu ?? 0))}
                        fill="none"
                        stroke="#0284C7"
                        strokeWidth="1.75"
                      />
                      <path
                        d={chartConfig.makeLinePath(displayedMetrics.map((d) => d.worker4Cpu ?? 0))}
                        fill="none"
                        stroke="#874924"
                        strokeWidth="1.75"
                      />
                    </>
                  )}

                  {/* Series 4: DLQ Volume */}
                  {activeSeries === 'dlq' && (
                    <>
                      <path
                        d={chartConfig.makeAreaPath(displayedMetrics.map((d) => d.dlqCount ?? 0))}
                        fill="#BE123C"
                        fillOpacity="0.06"
                      />
                      <path
                        d={chartConfig.makeLinePath(displayedMetrics.map((d) => d.dlqCount ?? 0))}
                        fill="none"
                        stroke="#BE123C"
                        strokeWidth="2"
                      />
                      {displayedMetrics.map((d, idx) => (
                        <circle
                          key={idx}
                          cx={chartConfig.getX(idx)}
                          cy={chartConfig.getY(d.dlqCount ?? 0)}
                          r="3"
                          fill="#BE123C"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      ))}
                    </>
                  )}

                  {/* Hover Crosshair */}
                  {hoverIndex !== null && displayedMetrics[hoverIndex] && (
                    <g>
                      <line
                        x1={chartConfig.getX(hoverIndex)}
                        y1={chartConfig.padding.top}
                        x2={chartConfig.getX(hoverIndex)}
                        y2={chartConfig.padding.top + chartConfig.innerHeight}
                        stroke="#5D5044"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={chartConfig.getX(hoverIndex)}
                        cy={chartConfig.getY(
                          activeSeries === 'throughput'
                            ? displayedMetrics[hoverIndex].throughput
                            : activeSeries === 'latency'
                            ? displayedMetrics[hoverIndex].queueWaitTimeMs
                            : activeSeries === 'cpu'
                            ? displayedMetrics[hoverIndex].cpuAvg
                            : displayedMetrics[hoverIndex].dlqCount ?? 0
                        )}
                        r="4.5"
                        fill="#FFFFFF"
                        stroke={
                          activeSeries === 'throughput'
                            ? '#0284C7'
                            : activeSeries === 'latency'
                            ? '#874924'
                            : activeSeries === 'cpu'
                            ? '#241812'
                            : '#BE123C'
                        }
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Baseline Axis */}
                  <line
                    x1={chartConfig.padding.left}
                    y1={chartConfig.padding.top + chartConfig.innerHeight}
                    x2={chartConfig.width - chartConfig.padding.right}
                    y2={chartConfig.padding.top + chartConfig.innerHeight}
                    stroke="#EAE1D4"
                    strokeWidth="1"
                  />
                </svg>

                {/* Chart Footer Axis & Legend */}
                <div className="mt-3 pt-3 border-t border-[#EAE1D4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-[#5D5044]">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {activeSeries === 'throughput' && (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[#241812]">
                          <span className="w-2.5 h-0.5 bg-[#0284C7]" aria-hidden="true" />
                          <span>Throughput (jobs/min)</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[#5D5044]">
                          <span className="w-2.5 h-0.5 bg-[#059669]" aria-hidden="true" />
                          <span>Completed rate</span>
                        </span>
                      </>
                    )}
                    {activeSeries === 'latency' && (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[#241812]">
                          <span className="w-2.5 h-0.5 bg-[#874924]" aria-hidden="true" />
                          <span>Mean queue wait</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[#5D5044]">
                          <span className="w-2.5 h-0.5 bg-[#BE123C]" aria-hidden="true" />
                          <span>P95 wait</span>
                        </span>
                      </>
                    )}
                    {activeSeries === 'cpu' && (
                      <>
                        <span className="text-[#047857]">W01</span>
                        <span className="text-[#B45309]">W02</span>
                        <span className="text-[#0369A1]">W03</span>
                        <span className="text-[#874924]">W04</span>
                      </>
                    )}
                    {activeSeries === 'dlq' && (
                      <span className="text-[#BE123C]">Quarantined jobs in DLQ</span>
                    )}
                  </div>

                  <div className="tabular-nums">
                    {displayedMetrics.length} samples · {formatTimeShort(displayedMetrics[0].timestamp)} –{' '}
                    {formatTimeShort(displayedMetrics[displayedMetrics.length - 1].timestamp)}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Execution Distribution + Worker Performance */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Execution Distribution */}
            <div className="lg:col-span-5 bg-white border border-[#EAE1D4] rounded-xl p-4 sm:p-5 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAE1D4]">
                <div>
                  <h2 className="text-sm font-semibold text-[#241812] font-sans">
                    Execution Distribution
                  </h2>
                  <p className="text-xs text-[#5D5044] font-mono tabular-nums mt-0.5">
                    {jobsInRange.length} workloads in {timeRange}
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Distribution grouping"
                  className="inline-flex items-center p-0.5 rounded-lg bg-[#FAF6F0] border border-[#EAE1D4]"
                >
                  {(
                    [
                      { key: 'status', label: 'Status' },
                      { key: 'type', label: 'Type' },
                      { key: 'priority', label: 'Priority' },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      role="tab"
                      aria-selected={distributionGroup === g.key}
                      onClick={() => setDistributionGroup(g.key)}
                      className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        distributionGroup === g.key
                          ? 'bg-white text-[#241812] font-semibold border border-[#EAE1D4]'
                          : 'text-[#5D5044] hover:text-[#241812] border border-transparent'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {jobsInRange.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#5D5044] font-mono">
                  No workloads recorded in the {timeRange} window.
                </div>
              ) : (
                <div className="pt-4 space-y-4 flex-1">
                  {/* Stacked Proportional Overview Bar */}
                  <div
                    className="w-full h-2.5 rounded-full overflow-hidden bg-[#FAF6F0] border border-[#EAE1D4] flex"
                    aria-hidden="true"
                  >
                    {distributionRows
                      .filter((r) => r.pct > 0)
                      .map((r) => (
                        <div
                          key={r.label}
                          style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                          className="h-full transition-all duration-300"
                        />
                      ))}
                  </div>

                  {/* Clean Breakdown Rows */}
                  <div className="divide-y divide-[#F2EAE0]">
                    {distributionRows.map((row) => (
                      <div key={row.label} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: row.color }}
                            aria-hidden="true"
                          />
                          <span className="text-[#241812] font-medium truncate">{row.label}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                          <span className="text-[#241812] font-semibold">{row.count}</span>
                          <span className="text-[#5D5044] w-12 text-right">
                            {row.pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Worker Performance */}
            <div className="lg:col-span-7 bg-white border border-[#EAE1D4] rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE1D4] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#241812] font-sans">
                    Worker Performance
                  </h2>
                  <p className="text-xs text-[#5D5044] font-mono tabular-nums mt-0.5">
                    {workers.length} registered nodes · {summary.activeWorkers} healthy
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#5D5044] tabular-nums">
                  Weights: {weights.specialization ?? 45}% spec · {weights.workerLoad ?? 30}% load ·{' '}
                  {weights.historicalPerformance ?? 25}% hist
                </span>
              </div>

              {workers.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#5D5044] font-mono">
                  No worker nodes registered with the cluster yet.
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#EAE1D4] bg-[#FAF6F0] text-[11px] text-[#5D5044]">
                        <th className="py-2.5 px-4 font-medium">Worker</th>
                        <th className="py-2.5 px-3 font-medium">Status</th>
                        <th className="py-2.5 px-3 font-medium">CPU</th>
                        <th className="py-2.5 px-3 font-medium">RAM</th>
                        <th className="py-2.5 px-3 font-medium text-right">Processed</th>
                        <th className="py-2.5 px-3 font-medium text-right">Success</th>
                        <th className="py-2.5 px-4 font-medium text-right">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2EAE0] tabular-nums">
                      {workers.map((w) => {
                        const isCrashed = w.status === 'crashed';
                        const totalWorkerJobs = (w.jobsCompleted || 0) + (w.jobsFailed || 0);
                        const workerSuccessRate =
                          totalWorkerJobs > 0
                            ? ((w.jobsCompleted / totalWorkerJobs) * 100).toFixed(1)
                            : '100.0';

                        return (
                          <tr
                            key={w.id}
                            className={`transition-colors ${
                              isCrashed ? 'bg-[#FFF1F2] animate-worker-crash' : 'hover:bg-[#FAF6F0]/70'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 font-sans font-semibold text-[#241812] whitespace-nowrap">
                                {isCrashed && (
                                  <span
                                    className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse shrink-0"
                                    aria-label="Crashed worker"
                                  />
                                )}
                                <span>{w.name}</span>
                              </div>
                              <div className="text-[11px] font-mono text-[#5D5044] truncate max-w-[200px]">
                                {isCrashed && w.lastCrashedJobId
                                  ? `Abandoned ${w.lastCrashedJobId}`
                                  : w.specialization}
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`font-medium ${
                                  isCrashed
                                    ? 'text-[#BE123C] font-semibold'
                                    : w.status === 'busy'
                                    ? 'text-[#0369A1]'
                                    : 'text-[#047857]'
                                }`}
                              >
                                {isCrashed ? 'Crashed' : w.status === 'busy' ? 'Busy' : 'Idle'}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="w-8 text-[#241812]">{w.cpuUtilization}%</span>
                                <div className="w-12 h-1.5 bg-[#FAF6F0] rounded-full overflow-hidden border border-[#EAE1D4]">
                                  <div
                                    className={`h-full rounded-full ${
                                      isCrashed || w.cpuUtilization > 80
                                        ? 'bg-[#E11D48]'
                                        : 'bg-[#0284C7]'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, w.cpuUtilization))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[#5D5044] whitespace-nowrap">
                              {w.memoryUtilization}%
                            </td>
                            <td className="py-3 px-3 text-right text-[#241812] whitespace-nowrap">
                              {w.jobsCompleted.toLocaleString()}
                              {w.jobsFailed > 0 && (
                                <span className="text-[#5D5044]"> / {w.jobsFailed} err</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right text-[#241812] whitespace-nowrap">
                              {workerSuccessRate}%
                            </td>
                            <td className="py-3 px-4 text-right text-[#5D5044] whitespace-nowrap">
                              {formatDurationMs(w.avgExecutionTimeMs)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity Section */}
          <section className="bg-white border border-[#EAE1D4] rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE1D4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#241812] font-sans">
                  Recent Activity
                </h2>
                <p className="text-xs text-[#5D5044] font-mono tabular-nums mt-0.5">
                  Latest workload transitions and scheduler events ({timeRange})
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Filter recent activity"
                className="inline-flex flex-wrap items-center p-0.5 rounded-lg bg-[#FAF6F0] border border-[#EAE1D4] self-start sm:self-auto"
              >
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'completed', label: 'Completed' },
                    { key: 'active', label: 'Active' },
                    { key: 'failures', label: 'Failures & Retries' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={activityFilter === f.key}
                    onClick={() => setActivityFilter(f.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activityFilter === f.key
                        ? 'bg-white text-[#241812] font-semibold border border-[#EAE1D4]'
                        : 'text-[#5D5044] hover:text-[#241812] border border-transparent'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-[#5D5044] font-mono">
                No matching activity events in the {timeRange} window.
              </div>
            ) : (
              <div className="divide-y divide-[#F2EAE0]">
                {recentActivity.map((event) => (
                  <div
                    key={event.id}
                    className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF6F0]/60 transition-colors text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span
                          className={`font-mono font-semibold ${
                            event.kind === 'Failed / DLQ'
                              ? 'text-[#BE123C]'
                              : event.kind === 'Retry'
                              ? 'text-[#B45309]'
                              : event.kind === 'Completed'
                              ? 'text-[#047857]'
                              : event.kind === 'Running'
                              ? 'text-[#0369A1]'
                              : 'text-[#5D5044]'
                          }`}
                        >
                          {event.kind}
                        </span>
                        <span className="text-[#C8BCAC]" aria-hidden="true">·</span>
                        <span className="font-medium text-[#241812] truncate">
                          {event.jobName}
                        </span>
                        <span className="text-[#C8BCAC]" aria-hidden="true">·</span>
                        <span className="font-mono text-[#5D5044]">{event.jobId}</span>
                      </div>
                      <p className="text-[11px] font-mono text-[#5D5044] mt-0.5 truncate">
                        {event.worker}
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        {event.detail}
                      </p>
                    </div>

                    <div className="text-[11px] font-mono text-[#5D5044] tabular-nums shrink-0 sm:text-right">
                      {event.timestamp > 0 ? formatTimeShort(event.timestamp) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
