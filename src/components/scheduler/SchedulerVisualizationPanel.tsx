import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Cpu, Layers, Play, RotateCcw, Sliders } from 'lucide-react';
import { InfraJob, WorkerAffinityScore, WorkerInstance } from '../../types/orchestration';

interface SchedulerVisualizationPanelProps {
  queuedJobs: InfraJob[];
  allJobs: InfraJob[];
  workers: WorkerInstance[];
  agingRatePerSec?: number;
  compact?: boolean;
  onTriggerDemoBurst?: () => void;
  onSelectJobForDrawer?: (job: InfraJob) => void;
}

interface LiveQueuedEntry {
  job: InfraJob;
  basePriority: number;
  agingDelta: number;
  effectivePriority: number;
  waitSeconds: number;
  backoffRemainingSec: number;
  rank: number;
}

const PRIORITY_COLOR: Record<string, string> = {
  Critical: '#DC2626',
  High: '#D97706',
  Medium: '#874924',
  Low: '#736558',
};

export const SchedulerVisualizationPanel: React.FC<SchedulerVisualizationPanelProps> = ({
  queuedJobs,
  allJobs,
  workers,
  agingRatePerSec = 1.5,
  compact = false,
  onTriggerDemoBurst,
  onSelectJobForDrawer,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Smooth 250ms client-side clock so priority aging bars and backoff countdowns animate live
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const liveQueue: LiveQueuedEntry[] = useMemo(() => {
    const computed = queuedJobs.map((job) => {
      const basePriority = job.basePriority ?? 50;
      const enqueuedAt = job.enqueuedAt || nowMs;
      const waitSeconds = Math.max(0, (nowMs - enqueuedAt) / 1000);
      const agingDelta = Number((waitSeconds * agingRatePerSec).toFixed(1));
      const effectivePriority = Number(
        Math.max(job.effectivePriority ?? basePriority, basePriority + agingDelta).toFixed(1)
      );
      const backoffRemainingSec =
        job.nextRetryAt && job.nextRetryAt > nowMs
          ? Number(((job.nextRetryAt - nowMs) / 1000).toFixed(1))
          : 0;

      return {
        job,
        basePriority,
        agingDelta,
        effectivePriority,
        waitSeconds,
        backoffRemainingSec,
        rank: 0,
      };
    });

    computed.sort((a, b) => {
      if (b.effectivePriority !== a.effectivePriority) {
        return b.effectivePriority - a.effectivePriority;
      }
      return (a.job.enqueuedAt || 0) - (b.job.enqueuedAt || 0);
    });

    return computed.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }, [queuedJobs, nowMs, agingRatePerSec]);

  // Candidate jobs for Affinity-Score inspection: queued jobs first, then running, then completed/failed
  const inspectableJobs = useMemo(() => {
    const map = new Map<string, InfraJob>();
    for (const entry of liveQueue) {
      map.set(entry.job.id, entry.job);
    }
    for (const j of allJobs) {
      if (!map.has(j.id)) {
        map.set(j.id, j);
      }
    }
    return Array.from(map.values());
  }, [liveQueue, allJobs]);

  // Keep selectedJobId valid and defaulted to the top queued or running job
  const activeInspectedJob: InfraJob | undefined = useMemo(() => {
    if (selectedJobId) {
      const found = inspectableJobs.find((j) => j.id === selectedJobId);
      if (found) return found;
    }
    if (liveQueue.length > 0) return liveQueue[0].job;
    const running = inspectableJobs.find((j) => j.status === 'Running');
    return running || inspectableJobs[0];
  }, [selectedJobId, inspectableJobs, liveQueue]);

  const maxBarScale = useMemo(() => {
    const peak = liveQueue.reduce((max, item) => Math.max(max, item.effectivePriority), 120);
    return Math.max(140, Math.ceil(peak * 1.1));
  }, [liveQueue]);

  const workerStatusMap = useMemo(() => {
    const map = new Map<string, WorkerInstance>();
    for (const w of workers) {
      map.set(w.id, w);
    }
    return map;
  }, [workers]);

  const affinityRows: WorkerAffinityScore[] = useMemo(() => {
    if (!activeInspectedJob?.routingScoreBreakdown) return [];
    return [...activeInspectedJob.routingScoreBreakdown].sort(
      (a, b) => b.totalScore - a.totalScore
    );
  }, [activeInspectedJob]);

  const displayedQueue = compact ? liveQueue.slice(0, 6) : liveQueue;

  return (
    <section
      aria-label="Scheduler Visualization"
      className="bg-white border border-[#EAE1D4] rounded-xl overflow-hidden shadow-xs"
    >
      {/* Top Section Header */}
      <div className="px-4 py-3 border-b border-[#EAE1D4] bg-[#FAF6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-[#874924] shrink-0" />
          <div>
            <h2 className="font-sans font-bold text-sm text-[#241812]">
              Live Scheduler Visualization & Affinity Engine
            </h2>
            <p className="text-[11px] font-mono text-[#736558]">
              Priority Aging (+{agingRatePerSec} pts/s) · Multi-Factor Worker Scoring (Spec + Load + History - Penalty)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-[#5D5044]">
          <span>
            Queued: <strong className="text-[#D97706]">{liveQueue.length}</strong>
          </span>
          <span className="text-[#C8BCAC]">·</span>
          <span>
            Healthy Nodes:{' '}
            <strong className="text-[#059669]">
              {workers.filter((w) => w.status !== 'crashed').length}/{workers.length}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#EAE1D4]">
        {/* Left: Live Priority Aging Bars */}
        <div className="lg:col-span-6 p-3.5 sm:p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#0284C7]" />
              <span className="text-xs font-sans font-semibold text-[#241812]">
                Priority Queue Aging Bars (Live)
              </span>
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[#5D5044]">
              Scale max: {maxBarScale} pts
            </span>
          </div>

          {displayedQueue.length === 0 ? (
            <div className="flex-1 min-h-[210px] flex flex-col items-center justify-center text-center p-6 bg-[#FAF6F0]/60 rounded-lg border border-dashed border-[#EAE1D4]">
              <Layers className="w-7 h-7 text-[#6B5D51] mb-2" />
              <p className="text-xs font-sans font-medium text-[#241812]">
                All queued jobs have already been dispatched to workers
              </p>
              <p className="text-[11px] font-mono text-[#5D5044] mt-1 max-w-sm">
                Seed a mixed burst to saturate all 4 nodes and watch lower-priority bars climb live.
              </p>
              {onTriggerDemoBurst && (
                <button
                  type="button"
                  onClick={onTriggerDemoBurst}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#241812] hover:bg-[#3A281E] text-white text-xs font-sans font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>Run Demo Burst</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {displayedQueue.map((item) => {
                const { job, basePriority, agingDelta, effectivePriority, waitSeconds, backoffRemainingSec, rank } =
                  item;
                const isSelected = activeInspectedJob?.id === job.id;
                const baseWidthPct = Math.min(100, (basePriority / maxBarScale) * 100);
                const agingWidthPct = Math.min(
                  Math.max(0, 100 - baseWidthPct),
                  (agingDelta / maxBarScale) * 100
                );
                const priorityColor = PRIORITY_COLOR[job.priority] || '#5D5044';
                const overtookNextTier =
                  (job.priority === 'Low' && effectivePriority >= 50) ||
                  (job.priority === 'Medium' && effectivePriority >= 75) ||
                  (job.priority === 'High' && effectivePriority >= 100);

                const isRequeued = (job.retries && job.retries.length > 0) || backoffRemainingSec > 0;
                const lastRetry = job.retries && job.retries.length > 0 ? job.retries[job.retries.length - 1] : null;
                const retryAttemptCount = job.retries?.length || 0;
                const totalBackoffSec = Math.max(2, Math.pow(2, Math.max(0, retryAttemptCount - 1)) * 2);
                const countdownPct = backoffRemainingSec > 0
                  ? Math.max(0, Math.min(100, (backoffRemainingSec / totalBackoffSec) * 100))
                  : 0;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      isRequeued ? 'animate-requeue-entry ' : ''
                    }${
                      isSelected
                        ? isRequeued
                          ? 'bg-[#FFFBEB] border-[#D97706]'
                          : 'bg-[#FAF6F0] border-[#874924]'
                        : isRequeued
                        ? 'bg-[#FFFBEB]/60 border-[#F59E0B] hover:bg-[#FFFBEB]'
                        : 'bg-white border-[#EAE1D4] hover:bg-[#FAF6F0]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono font-bold tabular-nums text-[#874924] shrink-0">
                          #{rank}
                        </span>
                        <span className="text-xs font-sans font-semibold text-[#241812] truncate">
                          {job.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs tabular-nums">
                        <span className="font-bold text-[#241812]">
                          {effectivePriority.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-[#5D5044]">pts</span>
                      </div>
                    </div>

                    {/* Stacked Base + Live Aging Progress Bar */}
                    <div className="w-full h-2.5 bg-[#FAF6F0] border border-[#EAE1D4] rounded overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-200"
                        style={{
                          width: `${baseWidthPct}%`,
                          backgroundColor: priorityColor,
                        }}
                        title={`Base Priority (${job.priority}): ${basePriority} pts`}
                      />
                      {agingWidthPct > 0 && (
                        <div
                          className="h-full bg-[#0284C7] transition-all duration-200"
                          style={{ width: `${agingWidthPct}%` }}
                          title={`Live Starvation Aging: +${agingDelta.toFixed(1)} pts`}
                        />
                      )}
                    </div>

                    {/* Re-queue / Backoff Countdown Strip when abandoned by a crashed worker */}
                    {isRequeued && (
                      <div className="mt-2 p-2 rounded bg-[#FEF3C7]/70 border border-[#FCD34D] space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono tabular-nums text-[#92400E]">
                          <span className="font-semibold inline-flex items-center gap-1">
                            <RotateCcw className="w-3 h-3 text-[#B45309]" />
                            <span>
                              Recovered from {lastRetry?.workerName || lastRetry?.workerId || 'crashed node'} · Retry #{retryAttemptCount}
                            </span>
                          </span>
                          {backoffRemainingSec > 0 ? (
                            <span className="font-bold text-[#B45309]">
                              Retry in {backoffRemainingSec.toFixed(1)}s
                            </span>
                          ) : (
                            <span className="font-bold text-[#047857]">Ready for dispatch</span>
                          )}
                        </div>
                        {backoffRemainingSec > 0 && (
                          <div className="w-full h-1 bg-[#FDE68A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D97706] rounded-full transition-all duration-200"
                              style={{ width: `${countdownPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dense Typographic Metadata Row (zero pill clutter) */}
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-[#5D5044]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span style={{ color: priorityColor }} className="font-semibold">
                          {job.priority} ({basePriority})
                        </span>
                        <span>·</span>
                        <span className="text-[#0369A1] font-semibold">
                          +{agingDelta.toFixed(1)} aging
                        </span>
                        <span>·</span>
                        <span>{job.type}</span>
                        <span>·</span>
                        <span>Wait {waitSeconds.toFixed(0)}s</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {backoffRemainingSec > 0 && (
                          <span className="text-[#B45309] font-semibold inline-flex items-center gap-1">
                            <RotateCcw className="w-2.5 h-2.5" />
                            Retry in {backoffRemainingSec.toFixed(1)}s
                          </span>
                        )}
                        {overtookNextTier && (
                          <span className="text-[#0369A1] font-semibold inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-2.5 h-2.5" />
                            Tier Escalated
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {compact && liveQueue.length > 6 && (
                <div className="text-[11px] font-mono text-[#5D5044] pt-1 text-right">
                  Showing top 6 of {liveQueue.length} waiting workloads
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-3 pt-2.5 border-t border-[#EAE1D4] flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] font-mono text-[#5D5044]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded-xs bg-[#DC2626]" />
              Critical (100)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded-xs bg-[#D97706]" />
              High (75)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded-xs bg-[#874924]" />
              Medium (50)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded-xs bg-[#5D5044]" />
              Low (25)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded-xs bg-[#0284C7]" />
              Live Aging (+1.5/s)
            </span>
          </div>
        </div>

        {/* Right: Worker Affinity-Score Breakdown Panel */}
        <div className="lg:col-span-6 p-3.5 sm:p-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#874924]" />
              <span className="text-xs font-sans font-semibold text-[#241812]">
                Worker Affinity-Score Breakdown
              </span>
            </div>

            {inspectableJobs.length > 0 && (
              <select
                aria-label="Inspect job worker affinity breakdown"
                value={activeInspectedJob?.id || ''}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="text-[11px] font-mono bg-[#FAF6F0] border border-[#EAE1D4] rounded-md px-2 py-1 text-[#241812] w-full sm:w-auto sm:max-w-[260px] truncate cursor-pointer"
              >
                {inspectableJobs.slice(0, 16).map((j) => (
                  <option key={j.id} value={j.id}>
                    [{j.status}] {j.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!activeInspectedJob ? (
            <div className="flex-1 min-h-[210px] flex items-center justify-center text-xs font-mono text-[#5D5044]">
              Select a job to inspect its worker affinity calculation.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {/* Decision Summary Box */}
              <div className="p-3 rounded-lg bg-[#FAF6F0] border border-[#EAE1D4]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-xs font-sans font-semibold text-[#241812] truncate">
                    {activeInspectedJob.name}
                  </div>
                  {onSelectJobForDrawer && (
                    <button
                      type="button"
                      onClick={() => onSelectJobForDrawer(activeInspectedJob)}
                      className="text-[10px] font-mono text-[#874924] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Inspect Job →
                    </button>
                  )}
                </div>
                <div className="text-[11px] font-mono text-[#5D5044] leading-relaxed break-words">
                  {activeInspectedJob.selectedWorkerReason ||
                    `Evaluating affinity candidates for ${activeInspectedJob.type} (${activeInspectedJob.priority}).`}
                </div>
                <div className="mt-1.5 text-[10px] font-mono text-[#5D5044] tabular-nums">
                  Status: <strong className="text-[#241812]">{activeInspectedJob.status}</strong> · Type:{' '}
                  <strong className="text-[#241812]">{activeInspectedJob.type}</strong> · Assigned:{' '}
                  <strong className="text-[#874924]">{activeInspectedJob.worker || 'Pending'}</strong>
                </div>
              </div>

              {/* Per-Worker Breakdown Rows */}
              <div className="space-y-2">
                {affinityRows.map((row, idx) => {
                  const workerMeta = workerStatusMap.get(row.workerId);
                  const isAssigned = activeInspectedJob.workerId === row.workerId;
                  const isTopCandidate = idx === 0 && !activeInspectedJob.workerId;
                  const isCrashed = workerMeta?.status === 'crashed' || row.totalScore < 0;

                  const specPct = Math.max(0, (row.specializationScore / 100) * 100);
                  const loadPct = Math.max(0, (row.loadScore / 100) * 100);
                  const histPct = Math.max(0, (row.historicalScore / 100) * 100);

                  return (
                    <div
                      key={row.workerId}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        isCrashed
                          ? 'bg-[#FFF1F2] border-[#E11D48] animate-worker-crash'
                          : isAssigned || isTopCandidate
                          ? 'bg-[#FAF6F0] border-[#874924]'
                          : 'bg-white border-[#EAE1D4]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {isCrashed && (
                            <span
                              className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse shrink-0"
                              aria-label="Crashed worker"
                            />
                          )}
                          <span className="text-xs font-sans font-semibold text-[#241812] shrink-0">
                            {row.workerName}
                          </span>
                          <span className="text-[10px] font-mono text-[#5D5044] truncate">
                            {workerMeta?.specialization || row.workerId}
                          </span>
                          {isAssigned && !isCrashed && (
                            <span className="text-[10px] font-mono font-bold text-[#047857] shrink-0">
                              · Selected
                            </span>
                          )}
                          {!isAssigned && isTopCandidate && !isCrashed && (
                            <span className="text-[10px] font-mono font-bold text-[#0369A1] shrink-0">
                              · Next Match
                            </span>
                          )}
                          {isCrashed && (
                            <span className="text-[10px] font-mono font-bold text-[#BE123C] shrink-0">
                              · CRASHED
                            </span>
                          )}
                        </div>

                        <span
                          className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                            isCrashed
                              ? 'text-[#BE123C]'
                              : isAssigned || isTopCandidate
                              ? 'text-[#874924]'
                              : 'text-[#241812]'
                          }`}
                        >
                          {row.totalScore} pts
                        </span>
                      </div>

                      {/* Segmented Score Bar */}
                      <div className="w-full h-1.5 bg-[#FAF6F0] border border-[#EAE1D4] rounded overflow-hidden flex mb-2">
                        {!isCrashed && (
                          <>
                            <div
                              className="h-full bg-[#874924]"
                              style={{ width: `${specPct}%` }}
                              title={`Specialization: +${row.specializationScore}`}
                            />
                            <div
                              className="h-full bg-[#0284C7]"
                              style={{ width: `${loadPct}%` }}
                              title={`Load Headroom: +${row.loadScore}`}
                            />
                            <div
                              className="h-full bg-[#059669]"
                              style={{ width: `${histPct}%` }}
                              title={`Historical Reliability: +${row.historicalScore}`}
                            />
                          </>
                        )}
                      </div>

                      {/* Tabular Component Metrics */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono tabular-nums text-[#5D5044]">
                        <div>
                          <span className="text-[#736558]">Spec </span>
                          <strong className="text-[#874924]">+{row.specializationScore}</strong>
                        </div>
                        <div>
                          <span className="text-[#736558]">Load </span>
                          <strong className="text-[#0284C7]">+{row.loadScore}</strong>
                        </div>
                        <div>
                          <span className="text-[#736558]">Hist </span>
                          <strong className="text-[#059669]">+{row.historicalScore}</strong>
                        </div>
                        <div>
                          <span className="text-[#736558]">Pen </span>
                          <strong className={row.errorPenalty < 0 ? 'text-[#DC2626]' : 'text-[#736558]'}>
                            {row.errorPenalty}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
