import { Worker } from 'node:worker_threads';
import * as path from 'path';
import {
  BackendWorker,
  IWorkerProcessManager,
  WorkerDispatchRequest,
  WorkerHeartbeatPayload,
  WorkerJobCompletionPayload,
  WorkerJobFailurePayload,
  WorkerRegistrationPayload,
} from '../types';

export interface WorkerCoordinatorHandlers {
  onRegister: (payload: WorkerRegistrationPayload) => void;
  onHeartbeat: (payload: WorkerHeartbeatPayload) => void;
  onJobCompleted: (payload: WorkerJobCompletionPayload) => void;
  onJobFailed: (payload: WorkerJobFailurePayload) => void;
  onWorkerCrashed: (workerId: string, reason: string) => void;
}

interface ManagedThread {
  worker: Worker;
  workerConfig: BackendWorker;
}

export class WorkerProcessManager implements IWorkerProcessManager {
  private threads: Map<string, ManagedThread> = new Map();
  private intentionalStops: Set<string> = new Set();
  private isShuttingDown = false;
  private handlers: WorkerCoordinatorHandlers | null = null;
  private readonly workerScriptPath: string;
  private readonly heartbeatIntervalMs: number;

  constructor(options?: { workerScriptPath?: string; heartbeatIntervalMs?: number }) {
    this.workerScriptPath =
      options?.workerScriptPath ||
      path.resolve(process.cwd(), 'server', 'workers', 'workerRunner.mjs');
    this.heartbeatIntervalMs = options?.heartbeatIntervalMs ?? 1000;
  }

  public setHandlers(handlers: WorkerCoordinatorHandlers): void {
    this.handlers = handlers;
  }

  public spawnAll(workers: BackendWorker[]): void {
    for (const worker of workers) {
      if (worker.status !== 'crashed') {
        this.spawnWorker(worker);
      }
    }
  }

  public spawnWorker(workerConfig: BackendWorker): void {
    if (this.isShuttingDown) return;

    const existing = this.threads.get(workerConfig.id);
    if (existing) {
      this.intentionalStops.add(workerConfig.id);
      existing.worker.terminate().catch(() => {});
      this.threads.delete(workerConfig.id);
    }

    this.intentionalStops.delete(workerConfig.id);

    const thread = new Worker(this.workerScriptPath, {
      workerData: {
        id: workerConfig.id,
        name: workerConfig.name,
        workerNumber: workerConfig.workerNumber,
        specialization: workerConfig.specialization,
        supportedJobTypes: workerConfig.supportedJobTypes,
        label: workerConfig.label,
        heartbeatIntervalMs: this.heartbeatIntervalMs,
      },
    });

    this.threads.set(workerConfig.id, { worker: thread, workerConfig });

    thread.on('message', (msg: any) => {
      if (!msg || typeof msg !== 'object' || !this.handlers) return;

      switch (msg.type) {
        case 'register':
          if (msg.worker) {
            this.handlers.onRegister(msg.worker as WorkerRegistrationPayload);
          }
          break;
        case 'heartbeat':
          if (msg.payload) {
            this.handlers.onHeartbeat(msg.payload as WorkerHeartbeatPayload);
          }
          break;
        case 'job_completed':
          if (msg.payload) {
            this.handlers.onJobCompleted(msg.payload as WorkerJobCompletionPayload);
          }
          break;
        case 'job_failed':
          if (msg.payload) {
            this.handlers.onJobFailed(msg.payload as WorkerJobFailurePayload);
          }
          break;
      }
    });

    thread.on('error', (err) => {
      this.threads.delete(workerConfig.id);
      if (this.isShuttingDown || this.intentionalStops.has(workerConfig.id)) {
        return;
      }
      this.handlers?.onWorkerCrashed(
        workerConfig.id,
        `Worker thread error: ${err.message}`
      );
    });

    thread.on('exit', (code) => {
      this.threads.delete(workerConfig.id);
      if (this.isShuttingDown || this.intentionalStops.has(workerConfig.id)) {
        this.intentionalStops.delete(workerConfig.id);
        return;
      }
      if (code !== 0) {
        this.handlers?.onWorkerCrashed(
          workerConfig.id,
          `Worker ${workerConfig.name} exited unexpectedly with exit code ${code}`
        );
      }
    });
  }

  public dispatchJob(request: WorkerDispatchRequest): boolean {
    const managed = this.threads.get(request.workerId);
    if (!managed) return false;
    managed.worker.postMessage({
      type: 'execute',
      request,
    });
    return true;
  }

  public cancelJobOnWorker(workerId: string, jobId: string): void {
    const managed = this.threads.get(workerId);
    if (!managed) return;
    managed.worker.postMessage({
      type: 'cancel',
      jobId,
    });
  }

  public crashWorker(workerId: string): boolean {
    const managed = this.threads.get(workerId);
    if (!managed) return false;
    this.intentionalStops.add(workerId);
    managed.worker.postMessage({ type: 'crash' });
    return true;
  }

  public isWorkerAlive(workerId: string): boolean {
    return this.threads.has(workerId);
  }

  public async shutdownAll(): Promise<void> {
    this.isShuttingDown = true;
    const terminations: Promise<number>[] = [];

    for (const [workerId, managed] of this.threads.entries()) {
      this.intentionalStops.add(workerId);
      try {
        managed.worker.postMessage({ type: 'shutdown' });
      } catch {
        // Ignore postMessage failure on already-exiting thread
      }
      terminations.push(managed.worker.terminate());
    }

    this.threads.clear();
    await Promise.allSettled(terminations);
  }
}
