import React from 'react';
import {
  Layers,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AnimatedCounter } from '../common/AnimatedCounter';

interface JobStatsCardsProps {
  stats: {
    total: number;
    running: number;
    queued: number;
    completed: number;
    failed: number;
    slaRate?: string;
  };
  activeFilter?: string;
  onFilterClick?: (status: string) => void;
}

export const JobStatsCards: React.FC<JobStatsCardsProps> = ({
  stats,
  activeFilter,
  onFilterClick,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mb-6">
      {/* 1. Total Jobs */}
      <button
        type="button"
        onClick={() => onFilterClick?.('all')}
        aria-pressed={activeFilter === 'all'}
        className={`text-left bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#874924] min-w-0 ${
          activeFilter === 'all'
            ? 'border-[#874924] ring-2 ring-[#874924]/15 bg-[#FAF6F0]'
            : 'border-[#EAE1D4] hover:border-[#C8BCAC] hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between text-[#5D5044] mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#5D5044] font-medium">
            Total Jobs
          </span>
          <Layers className="w-3.5 h-3.5 text-[#5D5044] shrink-0" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="font-mono text-2xl font-bold text-[#241812] tabular-nums">
            {stats.total.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-[#5D5044]">
            All workloads
          </span>
        </div>
      </button>

      {/* 2. Running */}
      <button
        type="button"
        onClick={() => onFilterClick?.('Running')}
        aria-pressed={activeFilter === 'Running'}
        className={`text-left bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#0284C7] min-w-0 ${
          activeFilter === 'Running'
            ? 'border-[#0284C7] ring-2 ring-[#0284C7]/15 bg-[#F0F9FF]'
            : 'border-[#EAE1D4] hover:border-[#C8BCAC] hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#5D5044] font-medium">
            Running
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {stats.running > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] animate-pulse" />
            )}
            <Play className="w-3.5 h-3.5 text-[#0284C7]" />
          </div>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="font-mono text-2xl font-bold text-[#0369A1] tabular-nums">
            {stats.running}
          </span>
          <span className="text-[10px] font-mono text-[#0369A1] font-medium">
            Active lease
          </span>
        </div>
      </button>

      {/* 3. Queued */}
      <button
        type="button"
        onClick={() => onFilterClick?.('Queued')}
        aria-pressed={activeFilter === 'Queued'}
        className={`text-left bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#B45309] min-w-0 ${
          activeFilter === 'Queued'
            ? 'border-[#D97706] ring-2 ring-[#D97706]/15 bg-[#FFFBEB]'
            : 'border-[#EAE1D4] hover:border-[#C8BCAC] hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#5D5044] font-medium">
            Queued
          </span>
          <Clock className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="font-mono text-2xl font-bold text-[#B45309] tabular-nums">
            {stats.queued}
          </span>
          <span className="text-[10px] font-mono text-[#92400E] font-medium">
            Aging +1.5/s
          </span>
        </div>
      </button>

      {/* 4. Completed */}
      <button
        type="button"
        onClick={() => onFilterClick?.('Completed')}
        aria-pressed={activeFilter === 'Completed'}
        className={`text-left bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#047857] min-w-0 ${
          activeFilter === 'Completed'
            ? 'border-[#059669] ring-2 ring-[#059669]/15 bg-[#ECFDF5]'
            : 'border-[#EAE1D4] hover:border-[#C8BCAC] hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#5D5044] font-medium">
            Completed
          </span>
          <CheckCircle2 className="w-3.5 h-3.5 text-[#047857] shrink-0" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="font-mono text-2xl font-bold text-[#047857] tabular-nums">
            {stats.completed.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-[#047857] font-medium">
            {stats.slaRate || '99.0%'} SLA
          </span>
        </div>
      </button>

      {/* 5. Failed / DLQ */}
      <button
        type="button"
        onClick={() => onFilterClick?.('Failed')}
        aria-pressed={activeFilter === 'Failed'}
        className={`col-span-2 sm:col-span-1 text-left bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#BE123C] min-w-0 ${
          activeFilter === 'Failed'
            ? 'border-[#E11D48] ring-2 ring-[#E11D48]/15 bg-[#FFF1F2]'
            : 'border-[#EAE1D4] hover:border-[#C8BCAC] hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#5D5044] font-medium">
            Failed / DLQ
          </span>
          <AlertCircle className="w-3.5 h-3.5 text-[#BE123C] shrink-0" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <AnimatedCounter
            value={stats.failed}
            className="font-mono text-2xl font-bold text-[#BE123C]"
            highlightClassName="text-[#E11D48]"
          />
          <span className="text-[10px] font-mono text-[#BE123C] font-medium">
            Quarantined
          </span>
        </div>
      </button>
    </div>
  );
};
