// UI Presentation Models for Orchestrix Dashboard
// These types encapsulate viewport state, client filters, colors, and modal controls,
// keeping domain models pristine and free of UI concerns.

import { JobDomainModel, WorkerDomainModel } from './domain';

export type DashboardTab = 'jobs' | 'queues' | 'workers' | 'monitoring' | 'console' | 'docs';

export type JobFilterPriority = 'All' | 'Critical' | 'High' | 'Medium' | 'Low';
export type JobFilterStatus = 'All' | 'Running' | 'Queued' | 'Completed' | 'Failed' | 'Paused';
export type JobFilterType = 'All' | 'Computer Vision' | 'ML Training' | 'Data Processing' | 'AI Inference' | 'NLP / LLM' | 'Document OCR';

export interface JobFilterState {
  search: string;
  status: JobFilterStatus;
  priority: JobFilterPriority;
  type: JobFilterType;
  worker?: string;
  sortBy: 'time-desc' | 'priority-desc' | 'duration-desc' | 'id-asc';
}

export interface WorkerCardViewState {
  isExpanded: boolean;
  accentColor: string;
  isHovered: boolean;
  showLogs: boolean;
}

export interface ChartHoverState {
  index: number | null;
  timestamp: number | null;
  value: number | null;
  formattedTime?: string;
}

export interface ModalControlsState {
  isSubmitModalOpen: boolean;
  isPriorityModalOpen: boolean;
  isLoadTestModalOpen: boolean;
  isSchedulerInspectorOpen: boolean;
  isAuthModalOpen: boolean;
  selectedJobForDetail?: JobDomainModel | null;
  selectedJobForPriority?: JobDomainModel | null;
}

export interface BannerAlertState {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  autoDismissMs?: number;
}

export interface SimulationControlState {
  isLiveStreaming: boolean;
  isSimulationMode: boolean;
  simulationVelocity: number; // 1x, 2x, 5x
  autoInjectFailures: boolean;
}
