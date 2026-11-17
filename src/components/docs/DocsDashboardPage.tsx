import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Terminal, 
  Copy, 
  Check, 
  BookOpen, 
  Layers, 
  GitBranch, 
  Server, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Clock,
  ArrowRight,
  Database,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const DocsDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'scheduler' | 'benchmarks' | 'docker' | 'interview'>('architecture');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Interactive benchmark runner
  const [benchWorkers, setBenchWorkers] = useState<number>(4);
  const [benchJobs, setBenchJobs] = useState<number>(250);
  const [benchResult, setBenchResult] = useState<any>(null);
  const [isBenchRunning, setIsBenchRunning] = useState<boolean>(false);

  useEffect(() => {
    // Initial fetch of benchmark data
    fetchBenchmark(4, 250);
  }, []);

  const fetchBenchmark = async (workers: number, jobs: number) => {
    setIsBenchRunning(true);
    try {
      const res = await fetch(`/api/benchmark?workers=${workers}&jobs=${jobs}`);
      const data = await res.json();
      if (data?.result) {
        setBenchResult(data.result);
      }
    } catch (err) {
      console.warn('Failed to fetch benchmark:', err);
    } finally {
      setIsBenchRunning(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const dockerComposeCode = `version: '3.8'

services:
  # 1. API Gateway & State Machine (Express + TypeScript)
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://orchestrix:secret@postgres:5432/orchestrix_db
      - AGING_RATE_PER_SEC=1.5
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

  # 2. Redis In-Memory Priority Queues & PubSub
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --save 60 1
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

  # 3. PostgreSQL Database (Audit History & Jobs Persistence)
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: orchestrix
      POSTGRES_PASSWORD: secret_password
      POSTGRES_DB: orchestrix_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

  # 4. Specialized Worker 01: NLP & LLM Training (H100 Node)
  worker-llm:
    build:
      context: ./workers
      dockerfile: Dockerfile.worker
    environment:
      - WORKER_ID=worker-01
      - SPECIALIZATION=nlp_llm
      - REDIS_URL=redis://redis:6379/0
      - LEASE_HEARTBEAT_SEC=1.0
      - LEASE_TTL_SEC=3.0
    restart: on-failure

  # 5. Specialized Worker 03: Computer Vision & TensorRT (A100 Node)
  worker-vision:
    build:
      context: ./workers
      dockerfile: Dockerfile.worker
    environment:
      - WORKER_ID=worker-03
      - SPECIALIZATION=computer_vision
      - REDIS_URL=redis://redis:6379/0
      - LEASE_HEARTBEAT_SEC=1.0
      - LEASE_TTL_SEC=3.0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: on-failure

volumes:
  redis_data:
  pgdata:`;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 pb-24 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE1D4] mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#C15F3D] font-semibold bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#EAE1D4]">
              System Engineering Specs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#241812]">
            Architecture & Scheduler Documentation
          </h1>
          <p className="text-xs sm:text-sm text-[#736558] font-sans mt-0.5">
            End-to-end workload pipelines, multi-factor affinity scoring formulas, benchmark results, and production deployment topology.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAE1D4] mb-6 text-xs font-mono overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'architecture'
              ? 'border-[#C15F3D] text-[#241812] bg-[#FAF6F0] rounded-t font-semibold'
              : 'border-transparent text-[#736558] hover:text-[#241812]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#C15F3D]" />
          <span>Architecture Diagram</span>
        </button>

        <button
          onClick={() => setActiveTab('scheduler')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'scheduler'
              ? 'border-[#C15F3D] text-[#241812] bg-[#FAF6F0] rounded-t font-semibold'
              : 'border-transparent text-[#736558] hover:text-[#241812]'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#0284C7]" />
          <span>Scheduling Algorithm</span>
        </button>

        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'benchmarks'
              ? 'border-[#C15F3D] text-[#241812] bg-[#FAF6F0] rounded-t font-semibold'
              : 'border-transparent text-[#736558] hover:text-[#241812]'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#059669]" />
          <span>Benchmark Results</span>
        </button>

        <button
          onClick={() => setActiveTab('docker')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'docker'
              ? 'border-[#C15F3D] text-[#241812] bg-[#FAF6F0] rounded-t font-semibold'
              : 'border-transparent text-[#736558] hover:text-[#241812]'
          }`}
        >
          <Server className="w-4 h-4 text-[#7C3AED]" />
          <span>Docker Compose Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('interview')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'interview'
              ? 'border-[#C15F3D] text-[#241812] bg-[#FAF6F0] rounded-t font-semibold'
              : 'border-transparent text-[#736558] hover:text-[#241812]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D97706]" />
          <span>Distributed Systems FAQ</span>
        </button>
      </div>

      {/* Tab 1: Architecture Diagram (UI -> API -> Orchestration Engine -> Queues -> Workers) */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Visual Architecture Flow Diagram */}
          <div className="bg-white border border-[#EAE1D4] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-[#241812] font-sans flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#C15F3D]" />
                <span>Distributed Pipeline Architecture: UI → API → Engine → Queues → Workers</span>
              </h2>
              <p className="text-xs text-[#736558] font-sans mt-1">
                Decoupled workload ingestion, authorization middleware, affinity scheduling, and resilient worker execution.
              </p>
            </div>

            {/* Pipeline Stage Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 relative">
              {/* Stage 1: UI Client */}
              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl flex flex-col justify-between space-y-3 relative group hover:border-[#0284C7] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#0284C7] font-bold">STAGE 1</span>
                    <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#241812]">UI Dashboard</h3>
                  <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                    React 19 SPA client with real-time SSE / polling listeners, jobs monitoring, and DLQ re-drive triggers.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#EAE1D4] text-[10px] font-mono text-[#736558]">
                  Tech: React, Tailwind, Vite
                </div>
              </div>

              {/* Stage 2: Express API Gateway */}
              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl flex flex-col justify-between space-y-3 relative group hover:border-[#C15F3D] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#C15F3D] font-bold">STAGE 2</span>
                    <span className="w-2 h-2 rounded-full bg-[#C15F3D]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#241812]">API Gateway</h3>
                  <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                    Express REST backend with Bearer Auth, strict RBAC role verification (Admin/SRE/Viewer), and payload schema validation.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#EAE1D4] text-[10px] font-mono text-[#736558]">
                  Tech: Express, RBAC Middleware
                </div>
              </div>

              {/* Stage 3: Orchestration Engine */}
              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl flex flex-col justify-between space-y-3 relative group hover:border-[#D97706] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#D97706] font-bold">STAGE 3</span>
                    <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#241812]">Scheduler Engine</h3>
                  <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                    Evaluates multi-factor worker affinity scores, dispatches workloads, and runs dynamic priority aging (+1.5/s).
                  </p>
                </div>
                <div className="pt-2 border-t border-[#EAE1D4] text-[10px] font-mono text-[#736558]">
                  Tech: Affinity Scoring Matrix
                </div>
              </div>

              {/* Stage 4: Priority Queues & DLQ */}
              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl flex flex-col justify-between space-y-3 relative group hover:border-[#E11D48] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#E11D48] font-bold">STAGE 4</span>
                    <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#241812]">Priority & DLQ</h3>
                  <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                    Redis ZSET sorted by effective priority. Watchdog monitors 3.0s lease TTLs and isolates non-retriable faults to DLQ.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#EAE1D4] text-[10px] font-mono text-[#736558]">
                  Tech: Redis ZSET, Dead Letter Queue
                </div>
              </div>

              {/* Stage 5: Worker Nodes Pool */}
              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl flex flex-col justify-between space-y-3 relative group hover:border-[#059669] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#059669] font-bold">STAGE 5</span>
                    <span className="w-2 h-2 rounded-full bg-[#059669]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#241812]">Worker Daemons</h3>
                  <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                    Heterogeneous compute fleet: H100 GPU for LLM training, A100 for vision, and 64-core EPYC for streaming data.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#EAE1D4] text-[10px] font-mono text-[#736558]">
                  Tech: Docker, NVIDIA CUDA, Polars
                </div>
              </div>
            </div>
          </div>

          {/* Deep Architectural Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#241812] font-sans flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span>Modular Service Architecture</span>
              </h3>
              <p className="text-xs text-[#736558] font-sans leading-relaxed">
                Backend orchestration is cleanly decoupled via dependency injection into <code className="text-[#C15F3D] font-mono">SchedulerService</code>, <code className="text-[#C15F3D] font-mono">WorkerRegistry</code>, <code className="text-[#C15F3D] font-mono">JobRepository</code>, <code className="text-[#C15F3D] font-mono">DLQService</code>, and <code className="text-[#C15F3D] font-mono">MetricsCollector</code> wired in <code className="text-[#C15F3D] font-mono">server/clusterStore.ts</code>.
              </p>
            </div>

            <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#241812] font-sans flex items-center gap-2">
                <Database className="w-4 h-4 text-[#0284C7]" />
                <span>SQLite Repository Persistence</span>
              </h3>
              <p className="text-xs text-[#736558] font-sans leading-relaxed">
                Workload states, worker leases, DLQ records, idempotency ledger entries, and metric events are persisted to SQLite (<code className="text-[#C15F3D] font-mono">data/orchestrix.db</code>, WAL mode) behind an <code className="text-[#C15F3D] font-mono">IClusterDatabase</code> repository interface, with graceful shutdown flushing on SIGINT/SIGTERM.
              </p>
            </div>

            <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 space-y-3 shadow-xs md:col-span-2">
              <h3 className="font-bold text-sm text-[#241812] font-sans flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#874924]" />
                <span>Delivery Semantics: At-Least-Once Execution &amp; Idempotent Processing</span>
              </h3>
              <p className="text-xs text-[#736558] font-sans leading-relaxed">
                Orchestrix executes jobs inside real Node <code className="text-[#C15F3D] font-mono">worker_threads</code> with <strong className="text-[#241812]">at-least-once delivery</strong>. Workers register on startup and send periodic heartbeats to maintain a 3.0s lease. On worker crash or lease expiry, abandoned jobs are re-queued with exponential backoff (<code className="text-[#C15F3D] font-mono">2s → 4s → 8s</code>) up to <code className="text-[#C15F3D] font-mono">maxRetries = 3</code> before Dead Letter Queue quarantine. Duplicate deliveries and zombie worker completions are safely deduplicated via per-job <code className="text-[#C15F3D] font-mono">idempotencyKey</code> (persisted in SQLite <code className="text-[#C15F3D] font-mono">processed_executions</code>) and per-attempt <code className="text-[#C15F3D] font-mono">executionToken</code> fencing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Scheduling Algorithm Documentation */}
      {activeTab === 'scheduler' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#EAE1D4] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0284C7] font-semibold bg-[#F0F9FF] px-2 py-0.5 rounded border border-[#BAE6FD]">
                  Core Dispatch Engine
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#241812] font-sans flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#0284C7]" />
                <span>Multi-Factor Affinity Scoring & Starvation-Free Aging</span>
              </h2>
              <p className="text-xs text-[#736558] font-sans mt-1">
                How worker selection, hardware affinity routing, and anti-starvation queueing actually function in Orchestrix.
              </p>
            </div>

            {/* Formula Block */}
            <div className="p-5 bg-[#FAF6F0] rounded-xl border border-[#EAE1D4] space-y-3">
              <span className="text-[11px] font-mono text-[#736558] uppercase tracking-wider block">
                Mathematical Objective Function
              </span>
              <div className="font-mono text-sm sm:text-base text-[#D97706] font-semibold overflow-x-auto py-1">
                TotalScore(w, j) = (W_spec · SpecMatch) + (W_load · Headroom) + (W_hist · SuccessRate) - (W_err · ConsecutiveFailures)
              </div>
              <div className="font-mono text-xs sm:text-sm text-[#0284C7] overflow-x-auto">
                EffectivePriority(j) = BasePriority(j) + (WaitTimeSeconds · 1.5)
              </div>
            </div>

            {/* Weights Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#059669]">W_spec = 45</span>
                  <span className="text-[10px] text-[#736558] font-mono">Specialization</span>
                </div>
                <h4 className="text-xs font-semibold text-[#241812]">Hardware & Model Fit</h4>
                <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                  Awards 45 points when worker accelerators match task type (e.g. A100 for Computer Vision, H100 for LLM training). Non-specialized nodes receive a fallback score of 10.
                </p>
              </div>

              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0284C7]">W_load = 30</span>
                  <span className="text-[10px] text-[#736558] font-mono">Load Headroom</span>
                </div>
                <h4 className="text-xs font-semibold text-[#241812]">Remaining Capacity</h4>
                <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                  Calculated as <code className="text-[#241812]">(100 - CPU_Utilization) * 0.30</code>. Prioritizes workers with available memory bandwidth and thermal headroom.
                </p>
              </div>

              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#D97706]">W_hist = 25</span>
                  <span className="text-[10px] text-[#736558] font-mono">Historical Perf</span>
                </div>
                <h4 className="text-xs font-semibold text-[#241812]">Empirical Reliability</h4>
                <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                  Multiplies past task completion success rate (0.0 to 1.0) by 25 points, rewarding rock-solid worker nodes over unstable instances.
                </p>
              </div>

              <div className="p-4 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#E11D48]">W_err = -20</span>
                  <span className="text-[10px] text-[#736558] font-mono">Penalty</span>
                </div>
                <h4 className="text-xs font-semibold text-[#241812]">Failure Quarantine</h4>
                <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
                  Deducts 20 points for each consecutive task failure. Isolates nodes experiencing silent memory corruption or GPU driver timeouts.
                </p>
              </div>
            </div>

            {/* Priority Aging Explanation */}
            <div className="p-5 bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-[#241812] font-sans flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D97706]" />
                <span>Starvation Prevention via Dynamic Priority Aging (+1.5 pts/s)</span>
              </h3>
              <p className="text-xs text-[#736558] font-sans leading-relaxed">
                In multi-tenant AI systems, high volumes of <code className="text-[#241812]">Critical</code> tier jobs can cause permanent starvation of <code className="text-[#241812]">Low</code> priority background workloads (such as daily embeddings sync or index compaction). Orchestrix solves this by automatically increasing each queued job's effective priority score by <strong>+1.5 points for every second</strong> spent waiting in Redis. Over time, an older Medium or Low job naturally overtakes newly submitted Critical jobs, mathematically preventing deadlocks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Benchmark Results */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#EAE1D4] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#059669] font-semibold bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                  Empirical Performance
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#241812] font-sans flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#059669]" />
                <span>Cluster Scalability & Latency Benchmark Results</span>
              </h2>
              <p className="text-xs text-[#736558] font-sans mt-1">
                Throughput (jobs/sec), P50/P95 latency percentiles, and horizontal scaling efficiency measured across concurrent worker pools.
              </p>
            </div>

            {/* Static Benchmark Comparison Table */}
            <div className="border border-[#EAE1D4] rounded-xl overflow-hidden bg-white">
              <div className="p-3 bg-[#FAF6F0] border-b border-[#EAE1D4] flex items-center justify-between text-xs font-mono text-[#241812]">
                <span className="font-semibold text-[#241812]">Empirical Scalability Matrix</span>
                <span className="text-[10px] text-[#736558]">Batch Size: 500 AI Workloads</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#EAE1D4] bg-[#FAF6F0] text-[#736558]">
                      <th className="py-2.5 px-4">Workers</th>
                      <th className="py-2.5 px-4">Throughput (jobs/s)</th>
                      <th className="py-2.5 px-4">Avg Wait Time</th>
                      <th className="py-2.5 px-4">P50 Latency</th>
                      <th className="py-2.5 px-4">P95 Latency</th>
                      <th className="py-2.5 px-4">Success Rate</th>
                      <th className="py-2.5 px-4">Scaling Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE1D4] text-[#241812]">
                    <tr className="hover:bg-[#FAF6F0] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#241812]">1 Worker Node</td>
                      <td className="py-3 px-4 text-[#0284C7] font-semibold">12.4 jobs/s</td>
                      <td className="py-3 px-4">1,800 ms</td>
                      <td className="py-3 px-4">2,060 ms</td>
                      <td className="py-3 px-4">4,944 ms</td>
                      <td className="py-3 px-4 text-[#059669]">98.8%</td>
                      <td className="py-3 px-4 text-[#736558]">1.0x (Baseline)</td>
                    </tr>
                    <tr className="hover:bg-[#FAF6F0] transition-colors bg-[#FAF6F0]/50">
                      <td className="py-3 px-4 font-bold text-[#241812]">4 Worker Nodes</td>
                      <td className="py-3 px-4 text-[#0284C7] font-semibold">41.8 jobs/s</td>
                      <td className="py-3 px-4">450 ms</td>
                      <td className="py-3 px-4">575 ms</td>
                      <td className="py-3 px-4">1,380 ms</td>
                      <td className="py-3 px-4 text-[#059669]">99.6%</td>
                      <td className="py-3 px-4 text-[#C15F3D] font-semibold">3.37x Speedup</td>
                    </tr>
                    <tr className="hover:bg-[#FAF6F0] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#241812]">10 Worker Nodes</td>
                      <td className="py-3 px-4 text-[#0284C7] font-semibold">86.2 jobs/s</td>
                      <td className="py-3 px-4">180 ms</td>
                      <td className="py-3 px-4">278 ms</td>
                      <td className="py-3 px-4">667 ms</td>
                      <td className="py-3 px-4 text-[#059669]">99.8%</td>
                      <td className="py-3 px-4 text-[#C15F3D] font-semibold">6.95x Speedup</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive Benchmark Runner */}
            <div className="bg-[#FAF6F0] border border-[#EAE1D4] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE1D4]">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#C15F3D]" />
                  <span className="font-semibold text-sm text-[#241812]">Interactive Benchmark Simulator</span>
                </div>
                <span className="text-[10px] font-mono text-[#736558]">Real-Time Server Computation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label htmlFor="bench-workers-range" className="block text-xs font-mono text-[#5D5044] mb-1.5">
                    Concurrent Worker Fleet: {benchWorkers} Nodes
                  </label>
                  <input
                    id="bench-workers-range"
                    aria-label="Concurrent worker fleet size"
                    type="range"
                    min="1"
                    max="16"
                    value={benchWorkers}
                    onChange={(e) => setBenchWorkers(parseInt(e.target.value, 10))}
                    className="w-full accent-[#C15F3D] cursor-pointer"
                  />
                </div>

                <div>
                  <label htmlFor="bench-jobs-range" className="block text-xs font-mono text-[#5D5044] mb-1.5">
                    Workload Batch: {benchJobs} Tasks
                  </label>
                  <input
                    id="bench-jobs-range"
                    aria-label="Workload batch size"
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={benchJobs}
                    onChange={(e) => setBenchJobs(parseInt(e.target.value, 10))}
                    className="w-full accent-[#C15F3D] cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fetchBenchmark(benchWorkers, benchJobs)}
                  disabled={isBenchRunning}
                  className="w-full py-2 rounded-lg bg-[#9A4322] hover:bg-[#7D351A] text-white font-mono text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isBenchRunning ? 'animate-spin' : ''}`} />
                  <span>{isBenchRunning ? 'Computing...' : 'Run Benchmark'}</span>
                </button>
              </div>

              {/* Benchmark Output Cards */}
              {benchResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-white border border-[#EAE1D4] rounded-lg shadow-xs">
                    <span className="text-[10px] font-mono text-[#736558] block">Throughput</span>
                    <span className="text-base font-bold font-mono text-[#0284C7]">
                      {benchResult.throughputJobsPerSec} <span className="text-xs font-normal text-[#736558]">jobs/s</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-[#EAE1D4] rounded-lg shadow-xs">
                    <span className="text-[10px] font-mono text-[#736558] block">Avg Queue Wait</span>
                    <span className="text-base font-bold font-mono text-[#D97706]">
                      {benchResult.avgWaitTimeMs} <span className="text-xs font-normal text-[#736558]">ms</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-[#EAE1D4] rounded-lg shadow-xs">
                    <span className="text-[10px] font-mono text-[#736558] block">P95 Latency</span>
                    <span className="text-base font-bold font-mono text-[#241812]">
                      {benchResult.p95LatencyMs} <span className="text-xs font-normal text-[#736558]">ms</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-[#EAE1D4] rounded-lg shadow-xs">
                    <span className="text-[10px] font-mono text-[#736558] block">Success Rate</span>
                    <span className="text-base font-bold font-mono text-[#059669]">
                      {(100 - benchResult.errorRatePercent).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Docker Compose Setup */}
      {activeTab === 'docker' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="bg-white border border-[#EAE1D4] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE1D4] mb-3">
              <span className="text-[#241812] font-bold">docker-compose.yml</span>
              <button
                onClick={() => copyToClipboard(dockerComposeCode, 'docker')}
                className="px-2.5 py-1 rounded bg-[#FAF6F0] hover:bg-[#F0EAE1] text-[#241812] text-[11px] flex items-center gap-1 border border-[#EAE1D4] transition-colors cursor-pointer"
              >
                {copiedCode === 'docker' ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'docker' ? 'Copied' : 'Copy Compose YAML'}</span>
              </button>
            </div>
            <pre className="bg-[#FAF6F0] p-4 rounded text-[11px] text-[#241812] overflow-x-auto leading-relaxed border border-[#EAE1D4]">
              {dockerComposeCode}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 5: Distributed Systems FAQ */}
      {activeTab === 'interview' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="font-sans font-bold text-sm text-[#241812]">
              Q1: How does Orchestrix prevent Head-of-Line blocking in mixed ML & batch workloads?
            </h3>
            <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
              Standard FIFO queues fail when a 10-hour LLM training job blocks a 200ms document classification task. Orchestrix utilizes Redis Sorted Sets (ZSET) partitioned by priority tiers combined with <strong>Dynamic Starvation Aging (+1.5/s)</strong>. Smaller tasks and aged lower-tier jobs are dynamically routed to specialized idle nodes without being held up behind heavy GPU allocations.
            </p>
          </div>

          <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="font-sans font-bold text-sm text-[#241812]">
              Q2: What is the distributed lease protocol for worker crash detection?
            </h3>
            <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
              Every worker daemon runs a background heartbeat thread that renews a 3.0s lease TTL in Redis every 1.0s. If a worker is terminated with SIGKILL (OOM or hardware reboot), the lease expires naturally. The watchdog immediately reclaims the task, updates audit logs, and either re-enqueues the workload or isolates it to the Dead Letter Queue.
            </p>
          </div>

          <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="font-sans font-bold text-sm text-[#241812]">
              Q3: How are roles and authorization boundaries enforced?
            </h3>
            <p className="text-[11px] text-[#736558] font-sans leading-relaxed">
              The API Gateway enforces strict Role-Based Access Control (RBAC):
              <br />• <strong>Viewer:</strong> Read-only access to all dashboards, metrics, and queues. All state-mutating requests return 403 Forbidden.
              <br />• <strong>DevOps / SRE:</strong> Full privileges to submit, pause, resume, cancel, fail, change priority, and re-drive DLQ workloads.
              <br />• <strong>Admin:</strong> Superuser root privileges, including destructive worker failure simulations (<code className="text-[#C15F3D] font-mono">/api/workers/:id/failure</code>) and complete DLQ purging.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
