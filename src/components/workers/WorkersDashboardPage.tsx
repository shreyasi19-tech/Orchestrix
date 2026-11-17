import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  AlertTriangle, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  Terminal, 
  Radio, 
  Layers,
  Zap,
  Server
} from 'lucide-react';
import { jobsStore } from '../../services/jobsStore';
import { WorkerInstance } from '../../types/orchestration';
import { WorkersGridSkeleton } from '../common/Skeletons';

export const WorkersDashboardPage: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerInstance[]>(jobsStore.getWorkers());
  const [isLoading, setIsLoading] = useState<boolean>(jobsStore.isLoading());
  const [banner, setBanner] = useState<{ message: string; type: 'crash' | 'recover' | 'error' } | null>(null);

  useEffect(() => {
    jobsStore.refresh();

    const unsub = jobsStore.subscribe(() => {
      setWorkers(jobsStore.getWorkers());
      setIsLoading(jobsStore.isLoading());
    });
    return () => {
      unsub();
    };
  }, []);

  const handleSimulateKill = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    try {
      await jobsStore.simulateWorkerFailure(workerId);
      setBanner({
        message: `SIMULATION: ${worker.name} process SIGKILL sent. Watchdog detected lease abandonment and re-routed active job.`,
        type: 'crash'
      });
      setTimeout(() => setBanner(null), 8000);
    } catch (e: any) {
      setBanner({
        message: e?.message || `Permission denied or failed to terminate ${worker.name}.`,
        type: 'error'
      });
      setTimeout(() => setBanner(null), 6000);
    }
  };

  const handleRecoverWorker = async (workerId: string) => {
    try {
      await jobsStore.recoverWorker(workerId);
      setBanner({
        message: `Worker node restored to fleet and re-registered with scheduler.`,
        type: 'recover'
      });
      setTimeout(() => setBanner(null), 5000);
    } catch (e: any) {
      setBanner({
        message: e?.message || `Permission denied or failed to recover worker node.`,
        type: 'error'
      });
      setTimeout(() => setBanner(null), 6000);
    }
  };

  const activeCount = workers.filter(w => w.status !== 'crashed').length;
  const crashedCount = workers.length - activeCount;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 py-5 sm:py-6 pb-20 select-none">
      {/* Simulation Banner */}
      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 p-4 rounded-lg border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
            banner.type === 'crash' || banner.type === 'error'
              ? 'bg-[#2B1115] border-[#57232B] text-[#FCA5A5]'
              : 'bg-[#0F2D20] border-[#1E4D36] text-[#6EE7B7]'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            {banner.type === 'crash' || banner.type === 'error' ? (
              <ShieldAlert className="w-5 h-5 text-[#F87171] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#34D399] shrink-0" />
            )}
            <span className="break-words">{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-[10px] uppercase font-bold tracking-wider hover:underline cursor-pointer self-end sm:self-center shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE1D4] mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#241812]">
            Worker Fleet
          </h1>
          <p className="text-xs sm:text-sm text-[#5D5044] font-sans mt-0.5">
            Distributed worker cluster topology, heartbeat leases, and real-time failure recovery.
          </p>
        </div>

        {/* Global Cluster Status Indicator */}
        <div className="flex flex-wrap items-center gap-2.5">
          {crashedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FFF1F2] border border-[#E11D48]/50 font-mono text-xs text-[#BE123C] shadow-xs animate-worker-crash">
              <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse" />
              <span className="font-bold">{crashedCount} Crashed</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-[#EAE1D4] font-mono text-xs text-[#241812] shadow-xs">
            <span className={`w-2 h-2 rounded-full ${activeCount === workers.length ? 'bg-[#10B981]' : 'bg-[#E11D48] animate-pulse'}`} />
            <span>Nodes: {activeCount} / {workers.length} Online</span>
          </div>
        </div>
      </div>

      {/* Architecture Concept Explainer Card */}
      <div className="bg-white border border-[#EAE1D4] rounded-xl p-4 mb-6 text-xs font-mono text-[#5D5044] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <span className="text-[#874924] font-semibold flex items-center gap-1.5 font-sans">
            <Radio className="w-4 h-4 shrink-0" />
            <span>Heartbeat Lease Watchdog &amp; Zero-Starvation Protocol</span>
          </span>
          <p className="text-[11px] text-[#5D5044] leading-relaxed">
            Each worker holds an exclusive Redis key lease (<code className="text-[#874924] bg-[#FAF6F0] px-1 py-0.5 rounded border border-[#EAE1D4]">worker:lease:{'{id}'}</code>) refreshed via background heartbeats every 1.0s (TTL: 3.0s). If a node crashes mid-execution, the watchdog automatically re-drives the abandoned workload without operator intervention.
          </p>
        </div>
      </div>

      {/* Worker Grid / Loading Skeleton / Empty State */}
      {isLoading ? (
        <WorkersGridSkeleton />
      ) : workers.length === 0 ? (
        <div className="bg-white border border-[#EAE1D4] rounded-xl p-10 text-center shadow-xs">
          <Server className="w-9 h-9 text-[#874924] mx-auto mb-3" />
          <h2 className="text-sm font-sans font-bold text-[#241812]">No Worker Nodes Registered</h2>
          <p className="text-xs font-mono text-[#5D5044] mt-1 max-w-md mx-auto">
            Worker daemons haven&apos;t checked in yet or the cluster registry is synchronizing.
          </p>
          <button
            type="button"
            onClick={() => jobsStore.refresh()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#241812] hover:bg-[#3A281E] text-white text-xs font-sans font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Worker Registry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((worker) => {
            const isCrashed = worker.status === 'crashed';
            const isBusy = worker.status === 'busy';

            return (
              <div
                key={worker.id}
                className={`bg-white border rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-xs ${
                  isCrashed
                    ? 'border-[#E11D48] bg-[#FFF1F2] animate-worker-crash'
                    : isBusy
                    ? 'border-[#0284C7] ring-2 ring-[#0284C7]/15'
                    : 'border-[#EAE1D4] hover:border-[#C8BCAC] hover:shadow-sm'
                }`}
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md border flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          isCrashed
                            ? 'bg-[#FFE4E6] border-[#FECDD3] text-[#BE123C]'
                            : 'bg-[#FAF6F0] border-[#EAE1D4] text-[#874924]'
                        }`}
                      >
                        {worker.workerNumber}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-sans font-bold text-sm text-[#241812] truncate flex items-center gap-1.5">
                          <span>{worker.name}</span>
                          {isCrashed && (
                            <span
                              className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse shrink-0"
                              aria-label="Worker crashed alert beacon"
                            />
                          )}
                        </h2>
                        <span className="text-[10px] font-mono text-[#5D5044] block truncate">
                          {worker.specialization}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0 ${
                      isCrashed
                        ? 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]'
                        : isBusy
                        ? 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]'
                        : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                    }`}>
                      {isCrashed ? 'CRASHED' : isBusy ? 'BUSY / LEASED' : 'IDLE / READY'}
                    </span>
                  </div>

                  {/* Crashed Lease Alert Banner */}
                  {isCrashed && (
                    <div
                      role="alert"
                      className="mb-3 p-2.5 rounded-lg bg-[#FFE4E6] border border-[#FDA4AF] text-[11px] font-mono text-[#9F1239] space-y-1"
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse shrink-0" />
                        <span>WORKER CRASHED · LEASE EXPIRED</span>
                      </div>
                      {worker.lastCrashedJobId ? (
                        <div className="text-[10px] text-[#881337] leading-snug break-words">
                          Abandoned <strong>{worker.lastCrashedJobId}</strong> ({worker.lastCrashedJobTitle || 'workload'}) → Re-queued with backoff
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#881337] leading-snug">
                          Heartbeat TTL lapsed. Watchdog fenced zombie leases.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Specialization Tag */}
                  <div className="mb-4">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF6F0] border border-[#EAE1D4] text-[#874924] font-medium">
                      Specialty: {worker.label}
                    </span>
                  </div>

                  {/* Current Job Info */}
                  <div className="p-3 bg-[#FAF6F0] rounded-lg border border-[#EAE1D4] mb-4 text-xs font-mono">
                    <span className="text-[10px] text-[#5D5044] uppercase tracking-wider block mb-1 font-medium">
                      Current Lease:
                    </span>
                    {worker.currentJobId ? (
                      <div>
                        <div className="text-[#0369A1] font-bold truncate">
                          {worker.currentJobId}
                        </div>
                        <div className="text-[10px] text-[#5D5044] truncate mt-0.5">
                          {worker.currentJobTitle || 'Executing workload batch'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#5D5044] italic">
                        {isCrashed ? 'Lease terminated (offline)' : 'Awaiting dispatch...'}
                      </span>
                    )}
                  </div>

                  {/* Hardware Telemetry */}
                  <div className="space-y-2 mb-4 text-xs font-mono">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1 text-[#5D5044]">
                        <span>CPU Utilization</span>
                        <span className="text-[#241812] font-semibold">{worker.cpuUtilization}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#EAE1D4] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isCrashed ? 'bg-[#E11D48]' : 'bg-[#0284C7]'}`}
                          style={{ width: `${worker.cpuUtilization}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1 text-[#5D5044]">
                        <span>Memory Load</span>
                        <span className="text-[#241812] font-semibold">{worker.memoryUtilization}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#EAE1D4] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isCrashed ? 'bg-[#E11D48]' : 'bg-[#059669]'}`}
                          style={{ width: `${worker.memoryUtilization}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2.5 bg-[#FAF6F0] rounded border border-[#EAE1D4] text-[#5D5044] mb-4">
                    <div>
                      <span className="text-[#5D5044] block text-[9px] uppercase">Completed</span>
                      <span className="text-[#241812] font-bold">{worker.jobsCompleted}</span>
                    </div>
                    <div>
                      <span className="text-[#5D5044] block text-[9px] uppercase">Failed</span>
                      <span className={`font-bold ${worker.jobsFailed > 0 ? 'text-[#BE123C]' : 'text-[#5D5044]'}`}>
                        {worker.jobsFailed}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-[#EAE1D4]">
                      <span className="text-[#5D5044] text-[9px] uppercase">Avg Exec Latency: </span>
                      <span className="text-[#874924] font-semibold">{worker.avgExecutionTimeMs} ms</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Kill or Reboot */}
                <div>
                  {isCrashed ? (
                    <button
                      type="button"
                      onClick={() => handleRecoverWorker(worker.id)}
                      className="w-full py-2 rounded-md bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#047857] text-xs font-mono font-medium flex items-center justify-center gap-1.5 border border-[#A7F3D0] transition-all cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reboot Worker Node</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSimulateKill(worker.id)}
                      className="w-full py-2 rounded-md bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#BE123C] text-xs font-mono font-medium flex items-center justify-center gap-1.5 border border-[#FECDD3] transition-all cursor-pointer shadow-2xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Simulate Worker Failure</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
