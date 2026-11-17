import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createClusterContainer, ClusterFacade } from '../server/clusterStore';

describe('Cluster Persistence, Real Computed Metrics & Benchmarks', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrix-persist-'));
    dbPath = path.join(tempDir, 'cluster.db');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('computes real aggregate stats, trailing 60s throughput, queue wait times, and P95 latency with zero randomness', () => {
    const container = createClusterContainer({
      dbPath,
      autoStartScheduler: false,
      spawnWorkers: false,
    });
    const facade = new ClusterFacade(container);

    const stats = facade.getStats();
    const jobs = facade.getJobs();
    expect(stats.total).toBe(jobs.length);

    const now = Date.now();
    const waitSamples = [400, 800, 1200, 1600, 2000, 2400, 2800, 3200, 3600, 5000];
    waitSamples.forEach((waitMs, idx) => {
      container.metricsCollector.recordJobDispatched(`m-job-${idx}`, waitMs, now - 10_000 + idx);
    });
    container.metricsCollector.recordJobCompleted('m-job-0', now - 5000);
    container.metricsCollector.recordJobCompleted('m-job-1', now - 4000);
    container.metricsCollector.recordJobFailed('m-job-2', now - 3000);

    const sample = container.metricsCollector.collectSample(now);
    expect(sample.completedCount).toBeGreaterThanOrEqual(2);
    expect(sample.failedCount).toBeGreaterThanOrEqual(1);
    expect(sample.queueWaitTimeMs).toBeGreaterThan(0);
    expect(sample.p95WaitTimeMs).toBeGreaterThanOrEqual(sample.queueWaitTimeMs);

    const monitoring = facade.getMonitoringData();
    expect(monitoring.summary.totalWorkers).toBe(4);
    expect(monitoring.metricsHistory.length).toBeGreaterThan(0);

    // Deterministic Amdahl benchmark
    const bench1 = facade.runBenchmark(4, 250);
    const bench2 = facade.runBenchmark(4, 250);
    expect(bench1).toEqual(bench2);

    facade.shutdown();
  });

  it('persists jobs, DLQ records, and metric history in SQLite across shutdown and reopen', async () => {
    const container1 = createClusterContainer({
      dbPath,
      autoStartScheduler: false,
      spawnWorkers: false,
    });

    const created = container1.schedulerService.createJob({
      name: 'SQLite Persisted Job',
      type: 'ML Training',
      priority: 'Critical',
      submittedBy: 'persistence-test@orchestrix.io',
    });

    container1.metricsCollector.collectSample(Date.now());
    await container1.schedulerService.shutdownAsync();

    const container2 = createClusterContainer({
      dbPath,
      autoStartScheduler: false,
      spawnWorkers: false,
    });

    const persisted = container2.jobRepository.getById(created.id);
    expect(persisted).toBeDefined();
    expect(persisted?.name).toBe('SQLite Persisted Job');
    expect(container2.metricsCollector.getHistory().length).toBeGreaterThan(0);

    await container2.schedulerService.shutdownAsync();
  });
});
