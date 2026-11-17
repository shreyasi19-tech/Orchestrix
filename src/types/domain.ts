// Domain models for Orchestrix AI Workload Orchestration Engine
// These represent pure backend and cluster entities, completely decoupled from UI display concerns.

export type TaskType = 
  | 'pdf_analysis'
  | 'resume_parsing'
  | 'csv_processing'
  | 'text_summarization'
  | 'image_analysis'
  | 'custom_task';

export type InfraJobType =
  | 'Computer Vision'
  | 'ML Training'
  | 'Data Processing'
  | 'AI Inference'
  | 'NLP / LLM'
  | 'Document OCR';

export type JobPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type JobStatus = 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Paused' | 'Cancelled';

export type WorkerSpecialization = 
  | 'text_llm'
  | 'documents'
  | 'data_processing'
  | 'image_analysis'
  | 'ml_training';

export type FailureType = 
  | 'TIMEOUT'
  | 'CRASH'
  | 'RATE_LIMIT'
  | 'INVALID_INPUT'
  | 'OOM_KILLED';

export interface ResourceUsage {
  cpuCores: string;
  cpuPercent: number;
  gpuType?: string;
  gpuPercent?: number;
  memoryGiB: string;
  memoryPercent: number;
  diskIo?: string;
}

export interface TimelinePhase {
  phase: 'queued' | 'scheduled' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
  label: string;
  timestamp: string;
  duration?: string;
  active: boolean;
  completed: boolean;
  failed?: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  stream: 'stdout' | 'stderr';
  message: string;
}

export interface RetryRecord {
  attempt: number;
  timestamp: string;
  workerId: string;
  reason: string;
  backoffSec: number;
}

export interface WorkerAffinityScore {
  workerId: string;
  workerName: string;
  specializationScore: number;
  loadScore: number;
  historicalScore: number;
  errorPenalty: number;
  totalScore: number;
}

// Pure Domain Job
export interface JobDomainModel {
  id: string;
  name: string;
  type: InfraJobType;
  status: JobStatus;
  priority: JobPriority;
  basePriority: number;
  effectivePriority: number; // Starvation aging score
  worker: string;
  workerId?: string;
  startedAt: string;
  startedTimestamp: number;
  enqueuedAt: number;
  duration: string;
  durationSeconds: number;
  resources: ResourceUsage;
  timeline: TimelinePhase[];
  logs: LogEntry[];
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  retries: RetryRecord[];
  tags: string[];
  submittedBy: string;
  isSeedData?: boolean;
  inDLQ?: boolean;
  dlqRecordId?: string;
  dlqReason?: string;
  routingScoreBreakdown?: WorkerAffinityScore[];
  selectedWorkerReason?: string;
  error?: {
    code: string;
    message: string;
    stackTrace: string;
    remediation?: string;
  };
}

// Pure Domain Worker Node
export interface WorkerDomainModel {
  id: string;
  name: string;
  workerNumber: string;
  specialization: WorkerSpecialization;
  supportedJobTypes: InfraJobType[];
  label: string;
  status: 'idle' | 'busy' | 'recovering' | 'crashed' | 'offline';
  currentJobId?: string;
  currentJobTitle?: string;
  currentJobProgress?: number;
  jobsCompleted: number;
  jobsFailed: number;
  totalExecutionTimeMs: number;
  avgExecutionTimeMs: number;
  cpuUtilization: number;
  memoryUtilization: number;
  lastHeartbeatAt: number;
  leaseExpiresAt: number;
  consecutiveFailures: number;
  historicalSuccessRate: number; // 0.0 to 1.0
}

// Pure Domain DLQ Record
export interface DLQRecordDomainModel {
  id: string;
  jobId: string;
  jobName: string;
  jobType: InfraJobType;
  failedAt: number;
  failedAtFormatted: string;
  failureReason: string;
  failureType: FailureType;
  originalWorkerId?: string;
  originalWorkerName?: string;
  attempts: number;
  maxAttempts: number;
  quarantineReason: string;
  canRetry: boolean;
}

// Pure Domain Cluster Telemetry Snapshot
export interface ClusterTelemetryPoint {
  timestamp: number;
  throughput: number; // jobs/min
  completedCount: number;
  failedCount: number;
  queueWaitTimeMs: number;
  p95WaitTimeMs: number;
  activeLeases: number;
  cpuAvg: number;
  memoryAvg: number;
  worker1Cpu: number;
  worker2Cpu: number;
  worker3Cpu: number;
  worker4Cpu: number;
  dlqCount: number;
}

// Pure Domain Scheduler Configuration
export interface SchedulerWeightsDomain {
  specializationWeight: number; // default: 45
  currentLoadWeight: number;    // default: 30
  historicalPerfWeight: number; // default: 25
  errorRatePenaltyWeight: number; // default: 20
  agingRatePerSec: number;       // default: 1.5
}

// Pure Domain Benchmark Results
export interface BenchmarkMetricResult {
  concurrencyLevel: number;
  workersCount: number;
  totalJobsProcessed: number;
  completedJobs: number;
  failedJobs: number;
  elapsedSeconds: number;
  throughputJobsPerSec: number;
  avgWaitTimeMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRatePercent: number;
  cpuUtilizationPercent: number;
}
