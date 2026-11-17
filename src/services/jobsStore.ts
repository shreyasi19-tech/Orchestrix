// Unified Reactive State Store for Orchestrix AI Workload Platform
// SINGLE SOURCE OF TRUTH: The Express Backend via src/services/api.ts
// Eliminates competing state engines and ensures all UI portals synchronize with real server state.

import { InfraJob, WorkerInstance, DLQRecord } from '../types/orchestration';
import { api } from './api';

export interface ClusterStats {
  total: number;
  running: number;
  queued: number;
  completed: number;
  failed: number;
  slaRate: string;
}

class UnifiedJobsStore {
  private jobs: InfraJob[] = [];
  private workers: WorkerInstance[] = [];
  private dlq: DLQRecord[] = [];
  private queuedJobs: InfraJob[] = [];
  private stats: ClusterStats = {
    total: 0,
    running: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    slaRate: '100.0%',
  };

  private listeners: Set<() => void> = new Set();
  private pollInterval: any = null;
  private isFetching = false;
  private hasLoadedOnce = false;
  private lastError: string | null = null;
  private isSimulationMode = true;

  constructor() {
    this.refresh();
    this.startPolling();
  }

  // --- Real API Data Synchronization ---
  public async refresh(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const [jobsRes, statsRes, workersRes, dlqRes, queuesRes] = await Promise.allSettled([
        api.jobs.list(),
        api.jobs.getStats(),
        api.workers.list(),
        api.queues.getDLQ(),
        api.queues.getQueued(),
      ]);

      let hasChanges = false;

      if (jobsRes.status === 'fulfilled' && jobsRes.value?.jobs) {
        this.jobs = jobsRes.value.jobs;
        hasChanges = true;
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        this.stats = statsRes.value.stats;
        hasChanges = true;
      }

      if (workersRes.status === 'fulfilled' && workersRes.value?.workers) {
        this.workers = workersRes.value.workers.map((w: any) => ({
          id: w.id,
          name: w.name,
          workerNumber: w.workerNumber || '01',
          specialization: w.specialization || 'text_llm',
          label: w.label || w.name,
          accentColor: w.id === 'worker-01' ? '#10B981' : w.id === 'worker-02' ? '#3B82F6' : w.id === 'worker-03' ? '#8B5CF6' : '#F59E0B',
          status: w.status,
          currentJobId: w.currentJobId,
          currentJobTitle: w.currentJobTitle,
          jobsCompleted: w.jobsCompleted || 0,
          jobsFailed: w.jobsFailed || 0,
          totalExecutionTimeMs: (w.jobsCompleted || 0) * (w.avgExecutionTimeMs || 5000),
          avgExecutionTimeMs: w.avgExecutionTimeMs || 5000,
          cpuUtilization: w.cpuUtilization || 0,
          memoryUtilization: w.memoryUtilization || 0,
          lastHeartbeat: w.lastHeartbeatAt || Date.now(),
          heartbeatHealthy: w.status !== 'crashed',
          consecutiveFailures: w.consecutiveFailures || 0,
          lastCrashedJobId: w.lastCrashedJobId ?? null,
          lastCrashedJobTitle: w.lastCrashedJobTitle ?? null,
          lastCrashedAt: w.lastCrashedAt ?? null,
        }));
        hasChanges = true;
      }

      if (dlqRes.status === 'fulfilled' && dlqRes.value?.dlq) {
        this.dlq = dlqRes.value.dlq.map((d: any) => ({
          id: d.id,
          originalJob: d.originalJob,
          failedAt: d.quarantinedAt || Date.now(),
          failureType: d.failureType || 'CRASH',
          failureReason: d.failureReason || 'Process fault',
          totalAttempts: d.totalAttempts || 1,
          canRetry: true,
        }));
        hasChanges = true;
      }

      if (queuesRes.status === 'fulfilled' && queuesRes.value?.queuedJobs) {
        this.queuedJobs = queuesRes.value.queuedJobs;
        hasChanges = true;
      }

      const wasFirstLoad = !this.hasLoadedOnce;
      this.hasLoadedOnce = true;

      if (hasChanges || wasFirstLoad) {
        this.notify();
      }
    } catch (err: any) {
      console.warn('Unified store sync error:', err);
      const wasFirstLoad = !this.hasLoadedOnce;
      this.hasLoadedOnce = true;
      if (wasFirstLoad) {
        this.notify();
      }
    } finally {
      this.isFetching = false;
    }
  }

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.refresh();
    }, 1800);
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error('Store listener error:', e);
      }
    });
  }

  // --- Getters ---
  public getJobs(): InfraJob[] {
    return [...this.jobs];
  }

  public getJobById(id: string): InfraJob | undefined {
    return this.jobs.find(j => j.id === id);
  }

  public getStats(): ClusterStats {
    return { ...this.stats };
  }

  public getWorkers(): WorkerInstance[] {
    return [...this.workers];
  }

  public getDLQ(): DLQRecord[] {
    return [...this.dlq];
  }

  public getQueuedJobs(): InfraJob[] {
    return [...this.queuedJobs];
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public isLoading(): boolean {
    return !this.hasLoadedOnce;
  }

  public clearLastError(): void {
    this.lastError = null;
  }

  public isSimulationModeActive(): boolean {
    return this.isSimulationMode;
  }

  public toggleSimulationMode(): boolean {
    this.isSimulationMode = !this.isSimulationMode;
    this.notify();
    return this.isSimulationMode;
  }

  // --- Mutating Actions (all go through backend REST API) ---

  public async pauseJob(id: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.jobs.pause(id);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to pause job ${id}`;
      this.notify();
      throw err;
    }
  }

  public async resumeJob(id: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.jobs.resume(id);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to resume job ${id}`;
      this.notify();
      throw err;
    }
  }

  public async cancelJob(id: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.jobs.cancel(id);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to cancel job ${id}`;
      this.notify();
      throw err;
    }
  }

  public async failJob(id: string, reason?: string, failureType: string = 'CRASH'): Promise<boolean> {
    try {
      this.lastError = null;
      await api.jobs.fail(id, { reason, failureType });
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to isolate job ${id}`;
      this.notify();
      throw err;
    }
  }

  public async changePriority(id: string, priority: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.jobs.changePriority(id, priority);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to update priority for job ${id}`;
      this.notify();
      throw err;
    }
  }

  public async retryJob(id: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.jobs.retry(id);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to retry job ${id}`;
      this.notify();
      throw err;
    }
  }

  public async rescheduleJob(id: string): Promise<boolean> {
    return this.retryJob(id);
  }

  public async runAgainJob(id: string): Promise<boolean> {
    const orig = this.getJobById(id);
    if (!orig) return false;
    try {
      this.lastError = null;
      await api.jobs.submit({
        name: `${orig.name} (Rerun)`,
        type: orig.type,
        priority: orig.priority,
        cpuCores: orig.resources.cpuCores,
        gpuAccelerator: orig.resources.gpuType,
        ramCapacity: orig.resources.memoryGiB,
      });
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to re-run job ${id}`;
      this.notify();
      throw err;
    }
  }

  public async submitJob(payload: {
    name: string;
    type?: string;
    priority?: string;
    workerConstraints?: string;
    dataSource?: string;
    cpuCores?: string;
    gpuAccelerator?: string;
    ramCapacity?: string;
    timeoutMinutes?: number;
  }) {
    try {
      this.lastError = null;
      const res = await api.jobs.submit(payload);
      await this.refresh();
      return res.job;
    } catch (err: any) {
      this.lastError = err.message || 'Failed to submit workload to scheduler';
      this.notify();
      throw err;
    }
  }

  // --- Worker & DLQ Actions ---

  public async simulateWorkerFailure(workerId: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.workers.simulateFailure(workerId);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to terminate worker node ${workerId}`;
      this.notify();
      throw err;
    }
  }

  public async recoverWorker(workerId: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.workers.recover(workerId);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to recover worker node ${workerId}`;
      this.notify();
      throw err;
    }
  }

  public async retryDLQRecord(dlqId: string): Promise<boolean> {
    try {
      this.lastError = null;
      await api.queues.retryDLQ(dlqId);
      await this.refresh();
      return true;
    } catch (err: any) {
      this.lastError = err.message || `Failed to re-drive DLQ record ${dlqId}`;
      this.notify();
      throw err;
    }
  }

  public async purgeDLQ(): Promise<number> {
    try {
      this.lastError = null;
      const res = await api.queues.purgeDLQ();
      await this.refresh();
      return res.purgedCount || 0;
    } catch (err: any) {
      this.lastError = err.message || 'Failed to purge Dead Letter Queue';
      this.notify();
      throw err;
    }
  }

  // --- Interactive Demo & Guided Tour Actions ---

  public async runDemoBurst() {
    try {
      this.lastError = null;
      const res = await api.demo.seedBurst();
      await this.refresh();
      return res;
    } catch (err: any) {
      this.lastError = err.message || 'Failed to seed mixed demo workload';
      this.notify();
      throw err;
    }
  }

  public async demoCrashWorker(workerId?: string) {
    try {
      this.lastError = null;
      const res = await api.demo.crashWorker(workerId);
      await this.refresh();
      return res;
    } catch (err: any) {
      this.lastError = err.message || 'Failed to trigger worker crash';
      this.notify();
      throw err;
    }
  }

  public async demoRecoverWorker(workerId?: string) {
    try {
      this.lastError = null;
      const res = await api.demo.recoverWorker(workerId);
      await this.refresh();
      return res;
    } catch (err: any) {
      this.lastError = err.message || 'Failed to recover crashed worker(s)';
      this.notify();
      throw err;
    }
  }
}

export const jobsStore = new UnifiedJobsStore();
