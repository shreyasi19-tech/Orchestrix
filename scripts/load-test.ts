import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createClusterContainer, ClusterContainer } from '../server/clusterStore';
import { BackendWorker } from '../server/types';

interface ScalingTierResult {
  workers: number;
  totalJobs: number;
  elapsedSec: number;
  jobsPerSec: number;
  avgWaitMs: number;
  p50WaitMs: number;
  p95WaitMs: number;
  p95EndToEndMs: number;
}

interface StarvationScenarioResult {
  label: string;
  agingRatePerSec: number;
  lowJobsTotal: number;
  highJobsTotal: number;
  lowCompletedDuringPeak: number;
  lowStarvedPercentAtPeak: number;
  lowAvgWaitSec: number;
  lowP95WaitSec: number;
  lowMaxWaitSec: number;
  highP95WaitSec: number;
  timelineLowCompleted: Array<{ sec: number; completed: number }>;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function waitForAllCompleted(
  container: ClusterContainer,
  jobIds: string[],
  timeoutMs = 30000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const done = jobIds.every((id) => container.jobRepository.getById(id)?.status === 'Completed');
    if (done) return;
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error(`Timed out waiting for ${jobIds.length} jobs to complete`);
}

function makeExtraWorker(index: number): BackendWorker {
  const num = String(index).padStart(2, '0');
  const types = ['Computer Vision', 'ML Training', 'Data Processing', 'AI Inference', 'NLP / LLM', 'Document OCR'];
  const spec = types[(index - 1) % types.length];
  const now = Date.now();
  return {
    id: `worker-${num}`,
    name: `Worker ${num}`,
    workerNumber: num,
    status: 'idle',
    specialization: spec,
    supportedJobTypes: [spec, 'AI Inference', 'Data Processing'],
    label: `Benchmark Worker Thread ${num} (${spec})`,
    cpuUtilization: 14,
    memoryUtilization: 22,
    currentJobId: null,
    currentJobTitle: null,
    jobsCompleted: 0,
    jobsFailed: 0,
    avgExecutionTimeMs: 25,
    leaseExpiresAt: now + 30000,
    lastHeartbeatAt: now,
    consecutiveFailures: 0,
    historicalSuccessRate: 0.99,
  };
}

async function runWorkerScalingBenchmark(
  workerCount: number,
  totalJobs: number
): Promise<ScalingTierResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `orchestrix-lt-${workerCount}-`));
  const dbPath = path.join(tempDir, 'cluster.db');

  const container = createClusterContainer({
    dbPath,
    autoStartScheduler: false,
    spawnWorkers: false,
    heartbeatIntervalMs: 500,
    schedulerOptions: {
      leaseTtlMs: 30000,
      dynamicJobDurationMs: 20,
      tickIntervalMs: 100,
    },
  });

  // Clear seeded jobs so only benchmark jobs compete
  for (const job of container.jobRepository.getAll()) {
    container.jobRepository.delete(job.id);
  }

  // Ensure exact workerCount idle workers exist
  const baseWorkers = container.workerRegistry.getAll();
  for (let i = 0; i < baseWorkers.length; i++) {
    if (i < workerCount) {
      baseWorkers[i].status = 'idle';
      baseWorkers[i].currentJobId = null;
      baseWorkers[i].cpuUtilization = 14;
      container.workerRegistry.save(baseWorkers[i]);
    } else {
      baseWorkers[i].status = 'crashed';
      baseWorkers[i].currentJobId = null;
      container.workerRegistry.save(baseWorkers[i]);
    }
  }
  for (let i = baseWorkers.length + 1; i <= workerCount; i++) {
    container.workerRegistry.save(makeExtraWorker(i));
  }

  // Spawn real Node worker_threads for all active workers
  const { WorkerProcessManager } = await import('../server/workers/WorkerProcessManager');
  const wpm = new WorkerProcessManager({ heartbeatIntervalMs: 500 });
  const activeWorkers = container.workerRegistry
    .getAll()
    .filter((w) => w.status !== 'crashed');

  // Re-create scheduler wired to this WorkerProcessManager
  const { SchedulerService } = await import('../server/services/SchedulerService');
  const scheduler = new SchedulerService(
    container.db,
    container.jobRepository,
    container.workerRegistry,
    container.dlqService,
    container.metricsCollector,
    wpm,
    { leaseTtlMs: 30000, dynamicJobDurationMs: 20, tickIntervalMs: 50 }
  );

  wpm.setHandlers({
    onRegister: (p) => scheduler.registerWorkerNode(p),
    onHeartbeat: (p) => scheduler.handleWorkerHeartbeat(p),
    onJobCompleted: (p) => scheduler.handleWorkerJobCompleted(p),
    onJobFailed: (p) => scheduler.handleWorkerJobFailed(p),
    onWorkerCrashed: (id, reason) => scheduler.handleWorkerCrash(id, reason),
  });
  wpm.spawnAll(activeWorkers);

  // Wait until all worker_threads have registered
  const regStart = Date.now();
  while (Date.now() - regStart < 5000) {
    const alive = activeWorkers.every((w) => wpm.isWorkerAlive(w.id));
    const registered = activeWorkers.every(
      (w) => typeof container.workerRegistry.getById(w.id)?.threadId === 'number'
    );
    if (alive && registered) break;
    await new Promise((r) => setTimeout(r, 10));
  }

  const jobTypes = ['Computer Vision', 'ML Training', 'Data Processing', 'AI Inference'];
  const priorities: Array<'Critical' | 'High' | 'Medium' | 'Low'> = ['Critical', 'High', 'Medium', 'Low'];
  const jobIds: string[] = [];

  const benchStart = performance.now();
  for (let i = 0; i < totalJobs; i++) {
    const created = scheduler.createJob({
      name: `LoadTest-${workerCount}w-${i}`,
      type: jobTypes[i % jobTypes.length],
      priority: priorities[i % priorities.length],
      executionDurationMs: 20,
      submittedBy: 'load-test@orchestrix.io',
    });
    jobIds.push(created.id);
  }

  await waitForAllCompleted(container, jobIds, 45000);
  const elapsedSec = (performance.now() - benchStart) / 1000;

  const waitLatencies: number[] = [];
  const e2eLatencies: number[] = [];
  for (const id of jobIds) {
    const job = container.jobRepository.getById(id)!;
    const waitMs = Math.max(0, job.startedTimestamp - job.enqueuedAt);
    const e2eMs = Math.max(0, (job.completedTimestamp || job.startedTimestamp) - job.enqueuedAt);
    waitLatencies.push(waitMs);
    e2eLatencies.push(e2eMs);
  }

  waitLatencies.sort((a, b) => a - b);
  e2eLatencies.sort((a, b) => a - b);
  const avgWaitMs = waitLatencies.reduce((s, v) => s + v, 0) / waitLatencies.length;

  await wpm.shutdownAll();
  await container.schedulerService.shutdownAsync();
  fs.rmSync(tempDir, { recursive: true, force: true });

  return {
    workers: workerCount,
    totalJobs,
    elapsedSec: +elapsedSec.toFixed(3),
    jobsPerSec: +(totalJobs / elapsedSec).toFixed(1),
    avgWaitMs: Math.round(avgWaitMs),
    p50WaitMs: Math.round(percentile(waitLatencies, 50)),
    p95WaitMs: Math.round(percentile(waitLatencies, 95)),
    p95EndToEndMs: Math.round(percentile(e2eLatencies, 95)),
  };
}

async function runStarvationComparison(
  label: string,
  agingRatePerSec: number
): Promise<StarvationScenarioResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrix-starve-'));
  const dbPath = path.join(tempDir, 'cluster.db');

  const container = createClusterContainer({
    dbPath,
    autoStartScheduler: false,
    spawnWorkers: false,
    schedulerOptions: {
      leaseTtlMs: 3600_000,
      dynamicJobDurationMs: 1000, // 1 job per second per worker = 4 jobs/sec capacity
      agingRatePerSec,
    },
  });

  // Reset workers to 4 idle nodes and clear seeded jobs
  for (const j of container.jobRepository.getAll()) {
    container.jobRepository.delete(j.id);
  }
  const t0 = 1_700_000_000_000;
  for (const w of container.workerRegistry.getAll()) {
    w.status = 'idle';
    w.currentJobId = null;
    w.cpuUtilization = 15;
    w.lastHeartbeatAt = t0;
    w.leaseExpiresAt = t0 + 3600_000;
    container.workerRegistry.save(w);
  }

  const lowJobsTotal = 40;
  const peakSeconds = 60;
  const totalSimSeconds = 110;
  const lowIds: string[] = [];
  const highIds: string[] = [];
  const lowEnqueuedAt = new Map<string, number>();
  const lowWaitSec = new Map<string, number>();
  const highWaitSec = new Map<string, number>();
  const timelineLowCompleted: Array<{ sec: number; completed: number }> = [];

  // Helper to create a job with deterministic timestamp t
  const submitAt = (name: string, priority: 'High' | 'Low', t: number) => {
    const base = priority === 'High' ? 75 : 25;
    const id = `sim-${priority.toLowerCase()}-${t}-${Math.random().toString(36).slice(2, 6)}`;
    container.jobRepository.save({
      id,
      name,
      type: 'Data Processing',
      status: 'Queued',
      priority,
      worker: '—',
      startedAt: '—',
      startedTimestamp: 0,
      duration: '—',
      durationSeconds: 0,
      basePriority: base,
      effectivePriority: base,
      enqueuedAt: t,
      attemptCount: 0,
      maxRetries: 3,
      idempotencyKey: `idem_${id}`,
      resources: {
        cpuCores: '4 vCPU',
        cpuPercent: 0,
        gpuType: 'None',
        gpuPercent: 0,
        memoryGiB: '8 GiB',
        memoryPercent: 0,
        diskIo: 'Queued',
      },
      timeline: [],
      logs: [],
      inputs: {},
      outputs: {},
      retries: [],
      tags: [priority.toLowerCase()],
      submittedBy: 'starvation-bench@orchestrix.io',
    });
    return id;
  };

  // Enqueue 40 Low-priority jobs at t = 0
  for (let i = 0; i < lowJobsTotal; i++) {
    const id = submitAt(`Low-Batch-${i}`, 'Low', t0);
    lowIds.push(id);
    lowEnqueuedAt.set(id, t0);
  }

  let lowCompletedDuringPeak = 0;

  for (let sec = 0; sec <= totalSimSeconds; sec++) {
    const now = t0 + sec * 1000;

    // During peak window [0..59s], 4 High-priority jobs arrive every second (matching 100% of 4-worker capacity)
    if (sec < peakSeconds) {
      for (let h = 0; h < 4; h++) {
        const hid = submitAt(`High-Stream-${sec}-${h}`, 'High', now);
        highIds.push(hid);
      }
    }

    // Advance scheduler by 1 second (completes 1s running jobs, ages queued jobs, dispatches eligible)
    container.schedulerService.tick(now);

    for (const lid of lowIds) {
      if (!lowWaitSec.has(lid)) {
        const j = container.jobRepository.getById(lid);
        if (j && (j.status === 'Running' || j.status === 'Completed') && j.startedTimestamp > 0) {
          lowWaitSec.set(lid, (j.startedTimestamp - (lowEnqueuedAt.get(lid) || t0)) / 1000);
        }
      }
    }
    for (const hid of highIds) {
      if (!highWaitSec.has(hid)) {
        const j = container.jobRepository.getById(hid);
        if (j && (j.status === 'Running' || j.status === 'Completed') && j.startedTimestamp > 0) {
          highWaitSec.set(hid, (j.startedTimestamp - j.enqueuedAt) / 1000);
        }
      }
    }

    const completedLowCount = lowIds.filter((id) => {
      const st = container.jobRepository.getById(id)?.status;
      return st === 'Completed' || st === 'Running';
    }).length;

    if (sec === peakSeconds - 1) {
      lowCompletedDuringPeak = completedLowCount;
    }

    if (sec % 10 === 0 || sec === peakSeconds - 1) {
      timelineLowCompleted.push({ sec, completed: completedLowCount });
    }
  }

  const lowWaits = Array.from(lowWaitSec.values()).sort((a, b) => a - b);
  const highWaits = Array.from(highWaitSec.values()).sort((a, b) => a - b);

  const lowAvgWaitSec =
    lowWaits.length > 0 ? lowWaits.reduce((s, v) => s + v, 0) / lowWaits.length : 0;

  await container.schedulerService.shutdownAsync();
  fs.rmSync(tempDir, { recursive: true, force: true });

  return {
    label,
    agingRatePerSec,
    lowJobsTotal,
    highJobsTotal: highIds.length,
    lowCompletedDuringPeak,
    lowStarvedPercentAtPeak: +(((lowJobsTotal - lowCompletedDuringPeak) / lowJobsTotal) * 100).toFixed(1),
    lowAvgWaitSec: +lowAvgWaitSec.toFixed(1),
    lowP95WaitSec: +percentile(lowWaits, 95).toFixed(1),
    lowMaxWaitSec: +(lowWaits[lowWaits.length - 1] || 0).toFixed(1),
    highP95WaitSec: +percentile(highWaits, 95).toFixed(1),
    timelineLowCompleted,
  };
}

function generateSvgChart(
  scaling: ScalingTierResult[],
  withAging: StarvationScenarioResult,
  withoutAging: StarvationScenarioResult
): string {
  const width = 920;
  const height = 380;

  // Left panel: Scaling Throughput & P95 Wait
  const maxThroughput = Math.max(...scaling.map((s) => s.jobsPerSec), 10);
  const maxP95 = Math.max(...scaling.map((s) => s.p95WaitMs), 50);

  const leftBars = scaling
    .map((s, idx) => {
      const x = 75 + idx * 90;
      const barH = Math.max(8, Math.round((s.jobsPerSec / (maxThroughput * 1.15)) * 170));
      const y = 275 - barH;
      const p95BarH = Math.max(6, Math.round((s.p95WaitMs / (maxP95 * 1.15)) * 170));
      const p95Y = 275 - p95BarH;
      return `
        <rect x="${x}" y="${y}" width="26" height="${barH}" rx="4" fill="#874924"/>
        <text x="${x + 13}" y="${y - 6}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="bold" fill="#241812">${s.jobsPerSec}</text>
        <rect x="${x + 30}" y="${p95Y}" width="26" height="${p95BarH}" rx="4" fill="#0284C7"/>
        <text x="${x + 43}" y="${p95Y - 6}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="bold" fill="#0369A1">${s.p95WaitMs}ms</text>
        <text x="${x + 28}" y="295" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="#5D5044">${s.workers}w</text>
      `;
    })
    .join('\n');

  // Right panel: Starvation Comparison timeline (sec 0..90)
  const pointsWith = withAging.timelineLowCompleted
    .map((pt) => {
      const px = 520 + Math.round((pt.sec / 110) * 350);
      const py = 275 - Math.round((pt.completed / withAging.lowJobsTotal) * 170);
      return `${px},${py}`;
    })
    .join(' ');

  const pointsWithout = withoutAging.timelineLowCompleted
    .map((pt) => {
      const px = 520 + Math.round((pt.sec / 110) * 350);
      const py = 275 - Math.round((pt.completed / withoutAging.lowJobsTotal) * 170);
      return `${px},${py}`;
    })
    .join(' ');

  const peakX = 520 + Math.round((59 / 110) * 350);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="12" fill="#FAF6F0" stroke="#EAE1D4" stroke-width="1.5"/>

  <!-- Left Panel -->
  <rect x="20" y="20" width="430" height="340" rx="10" fill="#FFFFFF" stroke="#EAE1D4"/>
  <text x="40" y="48" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="#241812">Real worker_threads Throughput &amp; P95 Wait</text>
  <text x="40" y="66" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#736558">160 jobs per tier · SQLite WAL + Node worker_threads</text>

  <rect x="40" y="80" width="12" height="10" rx="2" fill="#874924"/>
  <text x="57" y="89" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#5D5044">Jobs / sec</text>
  <rect x="140" y="80" width="12" height="10" rx="2" fill="#0284C7"/>
  <text x="157" y="89" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#5D5044">P95 Queue Wait (ms)</text>

  <line x1="55" y1="275" x2="430" y2="275" stroke="#D8CEC0" stroke-width="1"/>
  ${leftBars}
  <text x="235" y="330" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#736558">Worker Thread Pool Size</text>

  <!-- Right Panel -->
  <rect x="470" y="20" width="430" height="340" rx="10" fill="#FFFFFF" stroke="#EAE1D4"/>
  <text x="490" y="48" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="#241812">Starvation Test: Low-Priority Progress (t=0..110s)</text>
  <text x="490" y="66" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#736558">40 Low jobs vs 240 High arrivals (100% capacity saturation 0..60s)</text>

  <line x1="490" y1="85" x2="510" y2="85" stroke="#059669" stroke-width="3"/>
  <text x="516" y="89" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#065F46">With Aging (+1.5/s): P95 ${withAging.lowP95WaitSec}s</text>
  <line x1="700" y1="85" x2="720" y2="85" stroke="#E11D48" stroke-width="3" stroke-dasharray="5,3"/>
  <text x="726" y="89" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#9F1239">No Aging: P95 ${withoutAging.lowP95WaitSec}s</text>

  <!-- Peak Contention Shaded Region -->
  <rect x="520" y="105" width="${peakX - 520}" height="170" fill="#FEF3C7" opacity="0.45"/>
  <line x1="${peakX}" y1="105" x2="${peakX}" y2="275" stroke="#D97706" stroke-dasharray="4,3"/>
  <text x="${Math.round((520 + peakX) / 2)}" y="120" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" font-weight="600" fill="#B45309">100% High-Priority Saturation</text>

  <line x1="520" y1="275" x2="870" y2="275" stroke="#D8CEC0" stroke-width="1"/>
  <line x1="520" y1="105" x2="520" y2="275" stroke="#D8CEC0" stroke-width="1"/>
  <text x="512" y="278" text-anchor="end" font-family="ui-monospace, monospace" font-size="10" fill="#736558">0</text>
  <text x="512" y="193" text-anchor="end" font-family="ui-monospace, monospace" font-size="10" fill="#736558">20</text>
  <text x="512" y="110" text-anchor="end" font-family="ui-monospace, monospace" font-size="10" fill="#736558">40</text>

  <polyline fill="none" stroke="#E11D48" stroke-width="3" stroke-dasharray="6,3" points="${pointsWithout}"/>
  <polyline fill="none" stroke="#059669" stroke-width="3" points="${pointsWith}"/>

  <text x="520" y="295" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#736558">0s</text>
  <text x="${peakX}" y="295" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#B45309">60s</text>
  <text x="870" y="295" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#736558">110s</text>
  <text x="695" y="330" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#736558">Cluster Elapsed Time (seconds) — Low Jobs Dispatched</text>
</svg>
`;
}

async function main() {
  console.log('=== Orchestrix Load Test & Starvation Benchmark ===\n');

  const workerCounts = [1, 4, 8, 16];
  const jobsPerTier = 160;
  const scalingResults: ScalingTierResult[] = [];

  for (const wc of workerCounts) {
    const res = await runWorkerScalingBenchmark(wc, jobsPerTier);
    scalingResults.push(res);
    console.log(
      `[${wc} worker_threads] ${res.totalJobs} jobs in ${res.elapsedSec}s -> ${res.jobsPerSec} jobs/sec | Avg Wait: ${res.avgWaitMs}ms | P95 Wait: ${res.p95WaitMs}ms | P95 E2E: ${res.p95EndToEndMs}ms`
    );
  }

  console.log('\nRunning Starvation Comparison (40 Low jobs vs 240 High arrivals over 60s saturation)...');
  const withAging = await runStarvationComparison('With Aging (+1.5 pts/s)', 1.5);
  const withoutAging = await runStarvationComparison('Without Aging (0 pts/s)', 0);

  console.log(
    `[With Aging +1.5/s]    Peak Low Completed: ${withAging.lowCompletedDuringPeak}/${withAging.lowJobsTotal} | Starved@60s: ${withAging.lowStarvedPercentAtPeak}% | Low Avg Wait: ${withAging.lowAvgWaitSec}s | Low P95 Wait: ${withAging.lowP95WaitSec}s | High P95 Wait: ${withAging.highP95WaitSec}s`
  );
  console.log(
    `[Without Aging (0/s)]  Peak Low Completed: ${withoutAging.lowCompletedDuringPeak}/${withoutAging.lowJobsTotal} | Starved@60s: ${withoutAging.lowStarvedPercentAtPeak}% | Low Avg Wait: ${withoutAging.lowAvgWaitSec}s | Low P95 Wait: ${withoutAging.lowP95WaitSec}s | High P95 Wait: ${withoutAging.highP95WaitSec}s`
  );

  const docsDir = path.resolve(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  const svg = generateSvgChart(scalingResults, withAging, withoutAging);
  fs.writeFileSync(path.join(docsDir, 'load-test-chart.svg'), svg, 'utf-8');
  console.log('\nGenerated chart: docs/load-test-chart.svg');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Load test failed:', err);
    process.exit(1);
  });
