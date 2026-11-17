import {
  BackendWorker,
  IClusterDatabase,
  IWorkerRegistry,
  WorkerHeartbeatPayload,
  WorkerRegistrationPayload,
} from '../types';

const DEFAULT_LEASE_TTL_MS = 3000;

export class WorkerRegistry implements IWorkerRegistry {
  private workers: Map<string, BackendWorker> = new Map();

  constructor(private readonly db: IClusterDatabase) {
    const persisted = this.db.loadWorkers();
    for (const worker of persisted) {
      this.workers.set(worker.id, worker);
    }
  }

  public getAll(): BackendWorker[] {
    return Array.from(this.workers.values()).map((w) => ({ ...w }));
  }

  public getById(id: string): BackendWorker | undefined {
    const worker = this.workers.get(id);
    return worker ? { ...worker } : undefined;
  }

  public getAvailableWorkers(): BackendWorker[] {
    return Array.from(this.workers.values()).filter((w) => w.status === 'idle');
  }

  public save(worker: BackendWorker): void {
    this.workers.set(worker.id, worker);
    this.db.upsertWorker(worker);
  }

  public saveAll(workers: BackendWorker[]): void {
    if (workers.length === 0) return;
    for (const worker of workers) {
      this.workers.set(worker.id, worker);
    }
    this.db.upsertWorkers(workers);
  }

  public registerWorker(
    payload: WorkerRegistrationPayload,
    now: number = Date.now(),
    leaseTtlMs: number = DEFAULT_LEASE_TTL_MS
  ): BackendWorker {
    const existing = this.workers.get(payload.id);
    const workerNumber =
      payload.workerNumber ||
      existing?.workerNumber ||
      String(this.workers.size + 1).padStart(2, '0');

    const worker: BackendWorker = existing
      ? {
          ...existing,
          name: payload.name || existing.name,
          specialization: payload.specialization || existing.specialization,
          supportedJobTypes: payload.supportedJobTypes || existing.supportedJobTypes,
          label: payload.label || existing.label,
          status: existing.status === 'busy' && existing.currentJobId ? 'busy' : 'idle',
          registeredAt: now,
          lastHeartbeatAt: now,
          leaseExpiresAt: now + leaseTtlMs,
          threadId: payload.threadId ?? existing.threadId,
          consecutiveFailures: existing.status === 'crashed' ? 0 : existing.consecutiveFailures,
          cpuUtilization: existing.status === 'crashed' ? 16 : existing.cpuUtilization,
          memoryUtilization: existing.status === 'crashed' ? 24 : existing.memoryUtilization,
        }
      : {
          id: payload.id,
          name: payload.name,
          workerNumber,
          status: 'idle',
          specialization: payload.specialization || 'General Compute',
          supportedJobTypes: payload.supportedJobTypes || ['AI Inference'],
          label: payload.label || `${payload.name} Worker Thread`,
          cpuUtilization: 16,
          memoryUtilization: 24,
          currentJobId: null,
          currentJobTitle: null,
          jobsCompleted: 0,
          jobsFailed: 0,
          avgExecutionTimeMs: 5000,
          leaseExpiresAt: now + leaseTtlMs,
          lastHeartbeatAt: now,
          registeredAt: now,
          threadId: payload.threadId,
          consecutiveFailures: 0,
          historicalSuccessRate: 1.0,
        };

    this.save(worker);
    return { ...worker };
  }

  public recordHeartbeat(
    payload: WorkerHeartbeatPayload,
    now: number = Date.now(),
    leaseTtlMs: number = DEFAULT_LEASE_TTL_MS
  ): BackendWorker | undefined {
    const worker = this.workers.get(payload.workerId);
    if (!worker || worker.status === 'crashed') return undefined;

    worker.lastHeartbeatAt = now;
    worker.leaseExpiresAt = now + leaseTtlMs;
    if (typeof payload.cpuUtilization === 'number') {
      worker.cpuUtilization = Math.max(0, Math.min(100, Math.round(payload.cpuUtilization)));
    }
    if (typeof payload.memoryUtilization === 'number') {
      worker.memoryUtilization = Math.max(0, Math.min(100, Math.round(payload.memoryUtilization)));
    }
    this.save(worker);
    return { ...worker };
  }

  public findExpiredWorkers(now: number = Date.now()): BackendWorker[] {
    const expired: BackendWorker[] = [];
    for (const worker of this.workers.values()) {
      if (worker.status !== 'crashed' && worker.leaseExpiresAt > 0 && now > worker.leaseExpiresAt) {
        expired.push({ ...worker });
      }
    }
    return expired;
  }

  public count(): number {
    return this.workers.size;
  }

  public flush(): void {
    this.db.upsertWorkers(Array.from(this.workers.values()));
    this.db.flush();
  }
}
