import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createClusterContainer, ClusterContainer } from '../server/clusterStore';

async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 6000,
  intervalMs = 50
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('Real Node worker_threads Integration', () => {
  let tempDir: string;
  let dbPath: string;
  let container: ClusterContainer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrix-wt-'));
    dbPath = path.join(tempDir, 'cluster.db');
    container = createClusterContainer({
      dbPath,
      autoStartScheduler: true,
      spawnWorkers: true,
      heartbeatIntervalMs: 250,
      schedulerOptions: {
        leaseTtlMs: 1200,
        maxRetries: 3,
        baseBackoffMs: 150,
        maxBackoffMs: 1000,
        dynamicJobDurationMs: 150,
        tickIntervalMs: 100,
      },
    });
  });

  afterEach(async () => {
    await container.schedulerService.shutdownAsync();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('spawns real worker_threads that register, send heartbeats, and execute jobs idempotently', async () => {
    // 1. Wait for worker threads to register with real threadIds
    await waitForCondition(() => {
      const workers = container.workerRegistry.getAll();
      return workers.every((w) => typeof w.threadId === 'number' && w.threadId > 0);
    });

    const workersBefore = container.workerRegistry.getAll();
    const initialBeat = workersBefore[0].lastHeartbeatAt;

    // 2. Verify heartbeats actually arrive and advance lastHeartbeatAt
    await waitForCondition(() => {
      const w = container.workerRegistry.getById(workersBefore[0].id)!;
      return w.lastHeartbeatAt > initialBeat;
    });

    // 3. Submit a job and verify real worker_thread executes and completes it
    const job = container.schedulerService.createJob({
      name: 'Real Thread SHA256 Workload',
      type: 'Data Processing',
      priority: 'Critical',
      executionDurationMs: 120,
    });

    await waitForCondition(() => {
      const current = container.jobRepository.getById(job.id);
      return current?.status === 'Completed';
    });

    const completed = container.jobRepository.getById(job.id)!;
    expect(completed.status).toBe('Completed');
    expect(completed.outputs.status).toBe('COMPLETED');
    expect(typeof completed.outputs.executionDigest).toBe('string');
    expect(typeof completed.outputs.threadId).toBe('number');
    expect(container.db.hasProcessedIdempotencyKey(completed.idempotencyKey)).toBe(true);
  });

  it('handles genuine worker_thread crash, re-queues job with backoff, recovers on healthy thread, and respawns crashed worker', async () => {
    await waitForCondition(() =>
      container.workerRegistry.getAll().every((w) => typeof w.threadId === 'number')
    );

    const job = container.schedulerService.createJob({
      name: 'Crash-Resilient Worker Thread Job',
      type: 'Computer Vision',
      priority: 'Critical',
      executionDurationMs: 800,
    });

    await waitForCondition(() => {
      const current = container.jobRepository.getById(job.id);
      return current?.status === 'Running' && !!current.workerId;
    });

    const runningJob = container.jobRepository.getById(job.id)!;
    const doomedWorkerId = runningJob.workerId!;
    const oldThreadId = container.workerRegistry.getById(doomedWorkerId)!.threadId;

    // Crash the actual Node worker_thread running the job
    const crashed = container.schedulerService.simulateWorkerFailure(doomedWorkerId);
    expect(crashed).toBe(true);
    expect(container.workerRegistry.getById(doomedWorkerId)?.status).toBe('crashed');
    await waitForCondition(() => !container.workerProcessManager?.isWorkerAlive(doomedWorkerId));

    // Wait for job to complete on another live worker thread after backoff retry
    await waitForCondition(() => {
      const current = container.jobRepository.getById(job.id);
      return current?.status === 'Completed';
    });

    const recoveredJob = container.jobRepository.getById(job.id)!;
    expect(recoveredJob.retries.length).toBeGreaterThanOrEqual(1);
    expect(recoveredJob.workerId).not.toBe(doomedWorkerId);

    // Recover crashed worker and verify a fresh worker_thread respawns with a new threadId
    expect(container.schedulerService.recoverWorker(doomedWorkerId)).toBe(true);
    await waitForCondition(() => {
      const w = container.workerRegistry.getById(doomedWorkerId);
      return w?.status !== 'crashed' && typeof w?.threadId === 'number' && w.threadId !== oldThreadId;
    });
  });
});
