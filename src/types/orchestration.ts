export * from './domain';
export * from './ui';
import type { WorkerAffinityScore } from './domain';

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

export type JobPriority = 'critical' | 'high' | 'normal' | 'low' | 'medium';

export type JobStatus = 
  | 'queued'
  | 'routing'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'abandoned'
  | 'dead_letter'
  | 'paused'
  | 'cancelled';

export type WorkerSpecialization = 
  | 'text_llm'
  | 'documents'
  | 'data_processing'
  | 'image_analysis';

export type FailureType = 
  | 'timeout'
  | 'worker_crash'
  | 'rate_limit'
  | 'invalid_input'
  | 'oom_killed'
  | 'cuda_out_of_memory';

export interface TimelinePhase {
  phase: 'queued' | 'scheduled' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
  label: string;
  timestamp: string;
  duration?: string;
  active: boolean;
  completed: boolean;
  failed?: boolean;
}

export interface ResourceUsage {
  cpuCores: string;
  cpuPercent: number;
  gpuType?: string;
  gpuPercent?: number;
  memoryGiB: string;
  memoryPercent: number;
  diskIo?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  stream: 'stdout' | 'stderr';
  message: string;
}

export interface RetryRecord {
  attempt?: number;
  attemptNumber?: number;
  timestamp?: string;
  failedAt?: string;
  workerId: string;
  workerName?: string;
  reason?: string;
  errorReason?: string;
  backoffSec?: number;
  backoffDuration?: string;
}

export interface InfraJob {
  id: string; // e.g. "image-processing-42"
  name: string;
  type: InfraJobType;
  status: 'Running' | 'Queued' | 'Completed' | 'Failed' | 'Paused' | 'Cancelled';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  worker: string; // "Worker-03" or "—"
  workerId?: string;
  startedAt: string; // "14:32" or "—"
  startedTimestamp?: number;
  duration: string; // "02:14" or "—"
  durationSeconds?: number;
  resources: ResourceUsage;
  timeline: TimelinePhase[];
  logs: LogEntry[];
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  retries: RetryRecord[];
  inDLQ?: boolean;
  dlqRecordId?: string;
  dlqReason?: string;
  basePriority?: number;
  effectivePriority?: number;
  enqueuedAt?: number;
  attemptCount?: number;
  maxRetries?: number;
  nextRetryAt?: number;
  routingScoreBreakdown?: WorkerAffinityScore[];
  selectedWorkerReason?: string;
  queuePosition?: number;
  waitTimeSec?: number;
  starvationAgingScore?: number;
  error?: {
    code: string;
    message: string;
    stackTrace: string;
    remediation?: string;
  };
  tags: string[];
  submittedBy: string;
}

export interface Job {
  id: string;
  taskType: TaskType;
  title: string;
  priority: JobPriority;
  basePriorityValue: number; // Critical: 100, High: 75, Normal: 50, Low: 25
  effectivePriority: number; // Increases with wait time (Priority Aging)
  payload: Record<string, any>;
  status: JobStatus;
  createdAt: number;
  enqueuedAt: number;
  startedAt?: number;
  completedAt?: number;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  retryCount: number;
  maxRetries: number;
  failureType?: FailureType;
  failureReason?: string;
  executionTimeMs?: number;
  result?: any;
  userId: string;
  routingScoreBreakdown?: {
    workerId: string;
    workerName: string;
    specializationBonus: number;
    loadPenalty: number;
    historicalPerfBonus: number;
    errorRatePenalty: number;
    totalScore: number;
  }[];
  selectedWorkerReason?: string;
}

export interface WorkerInstance {
  id: string;
  name: string;
  workerNumber: string; // '01', '02', '03', '04'
  specialization: WorkerSpecialization;
  label: string;
  accentColor: string;
  status: 'idle' | 'busy' | 'recovering' | 'crashed' | 'offline';
  currentJobId?: string;
  currentJobTitle?: string;
  currentJobProgress?: number; // 0 to 100
  jobsCompleted: number;
  jobsFailed: number;
  totalExecutionTimeMs: number;
  avgExecutionTimeMs: number;
  cpuUtilization: number; // percentage
  memoryUtilization: number; // percentage
  lastHeartbeat: number;
  heartbeatHealthy: boolean;
  consecutiveFailures: number;
  lastCrashedJobId?: string | null;
  lastCrashedJobTitle?: string | null;
  lastCrashedAt?: number | null;
}

export interface HistoricalPerfRecord {
  workerId: string;
  taskType: TaskType;
  samplesCount: number;
  avgDurationMs: number;
  successRate: number; // 0 to 1.0
}

export interface SchedulerWeights {
  specializationWeight: number; // e.g. 0.45
  currentLoadWeight: number;    // e.g. 0.30
  historicalPerfWeight: number; // e.g. 0.20
  errorRatePenaltyWeight: number;// e.g. 0.15
  agingRatePerSec: number;       // priority boost per second in queue
}

export interface DLQRecord {
  id: string;
  originalJob: Job;
  failedAt: number;
  failureType: FailureType;
  failureReason: string;
  totalAttempts: number;
  canRetry: boolean;
  actionTaken?: 'retried' | 'discarded';
}

export interface LoadTestBenchmarkResult {
  workersCount: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  elapsedSeconds: number;
  throughputJobsPerSec: number;
  avgWaitTimeMs: number;
  avgExecutionTimeMs: number;
}
