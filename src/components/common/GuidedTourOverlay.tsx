import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { DashboardNavTab } from '../navigation/TopNav';
import { WorkerInstance } from '../../types/orchestration';

interface GuidedTourOverlayProps {
  isOpen: boolean;
  currentStep: number;
  activeTab: DashboardNavTab;
  workers: WorkerInstance[];
  queuedCount: number;
  runningCount: number;
  onStepChange: (step: number) => void;
  onNavigateTab: (tab: DashboardNavTab) => void;
  onClose: () => void;
  onSeedBurst: () => Promise<void>;
  onCrashWorker: () => Promise<{
    crashedWorkerName?: string | null;
    affectedJobId?: string | null;
  } | void>;
  onRecoverWorkers: () => Promise<void>;
}

const STEPS: {
  key: string;
  label: string;
  targetTab: DashboardNavTab;
  title: string;
  description: string;
}[] = [
  {
    key: 'burst',
    label: 'Submit Burst',
    targetTab: 'jobs',
    title: '1. Submit Mixed Workload Burst',
    description:
      'Dispatch 8 realistic workloads spanning all 4 priority tiers (Critical, High, Medium, Low) and all 6 AI job types. All 4 worker threads saturate immediately while lower-priority jobs queue.',
  },
  {
    key: 'aging',
    label: 'Observe Aging',
    targetTab: 'queues',
    title: '2. Observe Live Aging & Worker Affinity',
    description:
      'Watch queued job bars grow at +1.5 pts/s so Low and Medium jobs escalate and never starve. Click any bar to inspect the 4-factor worker affinity score breakdown.',
  },
  {
    key: 'crash',
    label: 'Crash Worker',
    targetTab: 'workers',
    title: '3. Crash a Live Worker Thread',
    description:
      'Send SIGKILL to an active Node worker_thread. Its heartbeat lease expires and the scheduler detects mid-flight workload abandonment.',
  },
  {
    key: 'recovery',
    label: 'Watch Recovery',
    targetTab: 'queues',
    title: '4. Watch Exponential Backoff & Recovery',
    description:
      'The abandoned job enters backoff cooldown (2.0s → 4.0s → 8.0s), re-routes onto a healthy node with fenced execution tokens, and you can reboot the crashed worker back into service.',
  },
];

export const GuidedTourOverlay: React.FC<GuidedTourOverlayProps> = ({
  isOpen,
  currentStep,
  activeTab,
  workers,
  queuedCount,
  runningCount,
  onStepChange,
  onNavigateTab,
  onClose,
  onSeedBurst,
  onCrashWorker,
  onRecoverWorkers,
}) => {
  const [busyAction, setBusyAction] = useState(false);
  const [stepNotice, setStepNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const safeStep = Math.max(0, Math.min(STEPS.length - 1, currentStep));
  const step = STEPS[safeStep];
  const crashedCount = workers.filter((w) => w.status === 'crashed').length;
  const healthyCount = workers.length - crashedCount;

  const goToStep = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, nextIdx));
    setStepNotice(null);
    onStepChange(clamped);
    onNavigateTab(STEPS[clamped].targetTab);
  };

  const handleAction = async () => {
    setBusyAction(true);
    setStepNotice(null);
    try {
      if (safeStep === 0) {
        await onSeedBurst();
        setStepNotice('Seeded 8 mixed workloads across all priorities and job types.');
      } else if (safeStep === 1) {
        onNavigateTab('queues');
        setStepNotice('Viewing live priority aging bars and affinity score breakdown.');
      } else if (safeStep === 2) {
        const res = await onCrashWorker();
        if (res?.crashedWorkerName) {
          setStepNotice(
            res.affectedJobId
              ? `${res.crashedWorkerName} crashed. ${res.affectedJobId} re-queued for recovery.`
              : `${res.crashedWorkerName} crashed via SIGKILL.`
          );
        } else {
          setStepNotice('Worker crash triggered. Proceed to watch recovery.');
        }
      } else if (safeStep === 3) {
        await onRecoverWorkers();
        setStepNotice('Crashed worker thread(s) rebooted and re-registered with fleet.');
      }
    } catch (err: any) {
      setStepNotice(err?.message || 'Action completed or awaiting cluster capacity.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <aside
      aria-label="Interactive Cluster Guided Tour"
      className="fixed bottom-5 right-5 z-40 w-[400px] max-w-[calc(100vw-2rem)] bg-white border border-[#D8CBB8] rounded-xl shadow-2xl overflow-hidden select-none"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#FAF6F0] border-b border-[#EAE1D4] flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#874924] font-semibold">
            Guided Walkthrough · Step {safeStep + 1} of {STEPS.length}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {STEPS.map((s, idx) => (
              <button
                key={s.key}
                type="button"
                onClick={() => goToStep(idx)}
                title={s.label}
                className={`h-1.5 w-10 rounded-xs transition-colors cursor-pointer ${
                  idx === safeStep
                    ? 'bg-[#874924]'
                    : idx < safeStep
                    ? 'bg-[#059669]'
                    : 'bg-[#EAE1D4]'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close guided tour"
          className="p-1 rounded-md text-[#736558] hover:text-[#241812] hover:bg-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-sans font-bold text-[#241812]">{step.title}</h3>
          {activeTab !== step.targetTab && (
            <button
              type="button"
              onClick={() => onNavigateTab(step.targetTab)}
              className="text-[10px] font-mono text-[#0284C7] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Go to {step.targetTab} →
            </button>
          )}
        </div>

        <p className="text-xs font-sans text-[#5D5044] leading-relaxed">{step.description}</p>

        {/* Live Cluster Snapshot Line */}
        <div className="px-3 py-2 rounded-lg bg-[#FAF6F0] border border-[#EAE1D4] flex items-center justify-between text-[11px] font-mono tabular-nums text-[#5D5044]">
          <span>
            Running: <strong className="text-[#0284C7]">{runningCount}</strong> · Queued:{' '}
            <strong className="text-[#D97706]">{queuedCount}</strong>
          </span>
          <span>
            Workers:{' '}
            <strong className={crashedCount > 0 ? 'text-[#DC2626]' : 'text-[#059669]'}>
              {healthyCount}/{workers.length} Online
            </strong>
          </span>
        </div>

        {stepNotice && (
          <div className="px-3 py-2 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-mono text-[#047857] flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{stepNotice}</span>
          </div>
        )}

        {/* Step Interactive Action + Navigation */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={busyAction}
            onClick={handleAction}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${
              safeStep === 2
                ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                : 'bg-[#241812] hover:bg-[#3B291E] text-white'
            }`}
          >
            {safeStep === 0 && <Play className="w-3.5 h-3.5" />}
            {safeStep === 1 && <Activity className="w-3.5 h-3.5" />}
            {safeStep === 2 && <AlertTriangle className="w-3.5 h-3.5" />}
            {safeStep === 3 && <RotateCcw className="w-3.5 h-3.5" />}
            <span>
              {safeStep === 0
                ? 'Seed 8-Job Burst'
                : safeStep === 1
                ? 'Focus Scheduler'
                : safeStep === 2
                ? 'Crash Busy Worker'
                : 'Reboot Crashed Node'}
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            {safeStep > 0 && (
              <button
                type="button"
                onClick={() => goToStep(safeStep - 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-[#FAF6F0] border border-[#EAE1D4] text-xs font-sans text-[#5D5044] whitespace-nowrap cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {safeStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(safeStep + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#874924] hover:bg-[#9E572B] text-white text-xs font-sans font-medium whitespace-nowrap cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-sans font-medium whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finish</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
