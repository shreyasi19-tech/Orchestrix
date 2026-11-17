import React, { useState, useEffect } from 'react';
import { JobStatsCards } from './JobStatsCards';
import { JobsTable } from './JobsTable';
import { JobDetailDrawer } from './JobDetailDrawer';
import { SubmitJobModal } from './SubmitJobModal';
import { ChangePriorityModal } from './ChangePriorityModal';
import { SchedulerVisualizationPanel } from '../scheduler/SchedulerVisualizationPanel';
import { StatsCardsSkeleton, JobsTableSkeleton } from '../common/Skeletons';
import { jobsStore } from '../../services/jobsStore';
import { InfraJob, WorkerInstance } from '../../types/orchestration';
import { Plus, Play, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface JobsDashboardPageProps {
  onOpenSubmitModal?: () => void;
  onRunDemo?: () => Promise<void>;
  selectedJobFromPalette?: InfraJob | null;
  onClearPaletteJob?: () => void;
}

export const JobsDashboardPage: React.FC<JobsDashboardPageProps> = ({
  onRunDemo,
  selectedJobFromPalette,
  onClearPaletteJob,
}) => {
  const [jobs, setJobs] = useState<InfraJob[]>(jobsStore.getJobs());
  const [queuedJobs, setQueuedJobs] = useState<InfraJob[]>(jobsStore.getQueuedJobs());
  const [workers, setWorkers] = useState<WorkerInstance[]>(jobsStore.getWorkers());
  const [stats, setStats] = useState(jobsStore.getStats());
  const [isLoading, setIsLoading] = useState<boolean>(jobsStore.isLoading());
  const [selectedJob, setSelectedJob] = useState<InfraJob | null>(selectedJobFromPalette || null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [priorityModalJob, setPriorityModalJob] = useState<InfraJob | null>(null);
  const [activeFilterFromStats, setActiveFilterFromStats] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [showSchedulerViz, setShowSchedulerViz] = useState(true);

  useEffect(() => {
    if (selectedJobFromPalette) {
      setSelectedJob(selectedJobFromPalette);
    }
  }, [selectedJobFromPalette]);

  useEffect(() => {
    const unsub = jobsStore.subscribe(() => {
      const updatedJobs = jobsStore.getJobs();
      setJobs(updatedJobs);
      setQueuedJobs(jobsStore.getQueuedJobs());
      setWorkers(jobsStore.getWorkers());
      setStats(jobsStore.getStats());
      setIsLoading(jobsStore.isLoading());

      // If drawer is open, keep selected job up to date
      if (selectedJob) {
        const fresh = updatedJobs.find(j => j.id === selectedJob.id);
        if (fresh) setSelectedJob(fresh);
      }
    });

    return () => {
      unsub();
    };
  }, [selectedJob]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleJobCreated = (jobId: string) => {
    const freshJob = jobsStore.getJobById(jobId);
    if (freshJob) {
      setSelectedJob(freshJob);
      showToast(`Workload ${jobId} successfully registered and enqueued.`);
    }
  };

  const handleRunDemoClick = async () => {
    setIsSeedingDemo(true);
    try {
      if (onRunDemo) {
        await onRunDemo();
      } else {
        await jobsStore.runDemoBurst();
      }
      setShowSchedulerViz(true);
      showToast('Demo burst seeded across all 4 priority tiers and 6 AI job types.');
    } catch (err: any) {
      showToast(err?.message || 'Demo burst queued.');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 py-5 sm:py-6 pb-20 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:bottom-6 sm:left-6 z-50 p-3 px-4 rounded-lg bg-white border border-[#EAE1D4] text-[#047857] font-mono text-xs shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE1D4] mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#241812]">
            Jobs
          </h1>
          <p className="text-xs sm:text-sm text-[#5D5044] font-sans mt-0.5">
            Manage, monitor, and control your AI workloads.
          </p>
        </div>

        {/* Primary Action Buttons: Run demo, + Submit Job */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isSeedingDemo}
            onClick={handleRunDemoClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#241812] hover:bg-[#3A281E] active:scale-[0.98] text-white font-sans text-xs font-medium tracking-wide shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isSeedingDemo ? 'Seeding...' : 'Run demo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#874924] hover:bg-[#723B19] active:scale-[0.98] text-white font-sans text-xs font-medium tracking-wide shadow-sm hover:shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Job</span>
          </button>
        </div>
      </div>

      {/* Horizontal row of 5 compact metric cards or initial loading skeleton */}
      {isLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <JobStatsCards
          stats={stats}
          activeFilter={activeFilterFromStats}
          onFilterClick={(filterStatus) => setActiveFilterFromStats(filterStatus)}
        />
      )}

      {/* Live Scheduler Visualization (Priority Aging + Affinity Breakdown) */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#5D5044]">
            Scheduler Engine Telemetry
          </span>
          <button
            type="button"
            onClick={() => setShowSchedulerViz((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-mono text-[#874924] hover:underline whitespace-nowrap cursor-pointer"
          >
            {showSchedulerViz ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide Scheduler Visualization</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show Scheduler Visualization</span>
              </>
            )}
          </button>
        </div>

        {showSchedulerViz && (
          <SchedulerVisualizationPanel
            queuedJobs={queuedJobs}
            allJobs={jobs}
            workers={workers}
            compact
            onTriggerDemoBurst={handleRunDemoClick}
            onSelectJobForDrawer={(job) => setSelectedJob(job)}
          />
        )}
      </div>

      {/* Large Jobs Management Table Area or Skeleton */}
      {isLoading ? (
        <JobsTableSkeleton />
      ) : (
        <JobsTable
          jobs={jobs}
          selectedJobId={selectedJob?.id}
          onSelectJob={(job) => setSelectedJob(job)}
          onChangePriority={(job) => setPriorityModalJob(job)}
          statusFilterFromStats={activeFilterFromStats}
          onClearStatusFilter={() => setActiveFilterFromStats('all')}
          onSubmitJobClick={() => setIsSubmitModalOpen(true)}
          onRunDemoClick={handleRunDemoClick}
        />
      )}

      {/* Slide-in Detailed Side Panel Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        onClose={() => {
          setSelectedJob(null);
          onClearPaletteJob?.();
        }}
        onChangePriorityRequest={(job) => setPriorityModalJob(job)}
      />

      {/* + Submit Job Clean Developer Modal */}
      <SubmitJobModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onJobCreated={handleJobCreated}
      />

      {/* Change Priority Modal for Queued Jobs */}
      <ChangePriorityModal
        job={priorityModalJob}
        isOpen={!!priorityModalJob}
        onClose={() => setPriorityModalJob(null)}
      />
    </div>
  );
};
