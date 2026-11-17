import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Cpu,
  Home,
  Layers,
  LogIn,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Terminal,
  X,
} from 'lucide-react';
import { DashboardNavTab } from '../navigation/TopNav';
import { InfraJob } from '../../types/orchestration';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: InfraJob[];
  onNavigate: (tab: DashboardNavTab) => void;
  onSelectJob: (job: InfraJob) => void;
  onOpenSubmitJob: () => void;
  onRunDemo: () => Promise<void>;
  onCrashWorker: () => Promise<unknown>;
  onRecoverWorkers: () => Promise<unknown>;
  onOpenAuth: () => void;
}

interface PaletteItem {
  id: string;
  group: 'Navigation' | 'Cluster Actions' | 'Jobs';
  label: string;
  subtitle: string;
  keywords: string;
  badge?: string;
  icon: React.ReactNode;
  run: () => void | Promise<void>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  jobs,
  onNavigate,
  onSelectJob,
  onOpenSubmitJob,
  onRunDemo,
  onCrashWorker,
  onRecoverWorkers,
  onOpenAuth,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const items: PaletteItem[] = useMemo(() => {
    const navItems: PaletteItem[] = [
      {
        id: 'nav-landing',
        group: 'Navigation',
        label: 'Go to Overview (Landing)',
        subtitle: 'Return to Orchestrix product overview',
        keywords: 'home landing overview start',
        icon: <Home className="w-4 h-4 text-[#874924]" />,
        run: () => onNavigate('landing'),
      },
      {
        id: 'nav-jobs',
        group: 'Navigation',
        label: 'Go to Jobs Console',
        subtitle: 'Inspect workloads, priority queues, and logs',
        keywords: 'jobs tasks workloads queue console',
        icon: <Terminal className="w-4 h-4 text-[#0284C7]" />,
        run: () => onNavigate('jobs'),
      },
      {
        id: 'nav-workers',
        group: 'Navigation',
        label: 'Go to Worker Fleet',
        subtitle: 'Monitor heartbeats, leases, and simulate failures',
        keywords: 'workers nodes fleet crash heartbeat',
        icon: <Cpu className="w-4 h-4 text-[#059669]" />,
        run: () => onNavigate('workers'),
      },
      {
        id: 'nav-queues',
        group: 'Navigation',
        label: 'Go to Queues & DLQ',
        subtitle: 'Priority aging bars, affinity matrix, and Dead Letter Queue',
        keywords: 'queues dlq dead letter scheduler aging affinity',
        icon: <Layers className="w-4 h-4 text-[#D97706]" />,
        run: () => onNavigate('queues'),
      },
      {
        id: 'nav-monitoring',
        group: 'Navigation',
        label: 'Go to Monitoring & Telemetry',
        subtitle: 'Throughput graphs, queue latency, and SLA metrics',
        keywords: 'monitoring telemetry metrics charts latency throughput',
        icon: <Activity className="w-4 h-4 text-[#874924]" />,
        run: () => onNavigate('monitoring'),
      },
      {
        id: 'nav-docs',
        group: 'Navigation',
        label: 'Go to Architecture & Docs',
        subtitle: 'System design specs, scoring math, and benchmarks',
        keywords: 'docs architecture benchmarks interview guide',
        icon: <BookOpen className="w-4 h-4 text-[#5D5044]" />,
        run: () => onNavigate('docs'),
      },
    ];

    const actionItems: PaletteItem[] = [
      {
        id: 'act-submit',
        group: 'Cluster Actions',
        label: 'Submit New Workload',
        subtitle: 'Open job submission modal with presets & constraints',
        keywords: 'submit create new job add task',
        icon: <Plus className="w-4 h-4 text-[#874924]" />,
        run: () => onOpenSubmitJob(),
      },
      {
        id: 'act-demo',
        group: 'Cluster Actions',
        label: 'Run Demo Workload Burst',
        subtitle: 'Seed 8 mixed jobs across all 4 priority tiers',
        keywords: 'demo seed burst workloads test',
        icon: <Play className="w-4 h-4 text-[#059669]" />,
        run: async () => {
          await onRunDemo();
        },
      },
      {
        id: 'act-crash',
        group: 'Cluster Actions',
        label: 'Simulate Worker Crash (SIGKILL)',
        subtitle: 'Crash a busy worker to observe red pulse and job re-queue countdown',
        keywords: 'crash fail kill worker sigkill failure fault',
        icon: <AlertTriangle className="w-4 h-4 text-[#E11D48]" />,
        run: async () => {
          await onCrashWorker();
          onNavigate('workers');
        },
      },
      {
        id: 'act-recover',
        group: 'Cluster Actions',
        label: 'Reboot All Crashed Workers',
        subtitle: 'Restore crashed worker nodes back into active scheduler fleet',
        keywords: 'recover reboot restore worker node',
        icon: <RotateCcw className="w-4 h-4 text-[#059669]" />,
        run: async () => {
          await onRecoverWorkers();
          onNavigate('workers');
        },
      },
      {
        id: 'act-auth',
        group: 'Cluster Actions',
        label: 'Sign In / Switch Operator Role',
        subtitle: 'Open authentication & RBAC demo operator switcher',
        keywords: 'auth login sign in role admin devops viewer',
        icon: <LogIn className="w-4 h-4 text-[#5D5044]" />,
        run: () => onOpenAuth(),
      },
    ];

    const jobItems: PaletteItem[] = jobs.slice(0, 30).map((job) => ({
      id: `job-${job.id}`,
      group: 'Jobs',
      label: job.name,
      subtitle: `${job.id} · ${job.type} · ${job.priority} · Worker: ${job.worker}`,
      keywords: `${job.id} ${job.name} ${job.type} ${job.status} ${job.priority} ${job.worker}`,
      badge: job.inDLQ ? 'DLQ' : job.status,
      icon: (
        <RefreshCw
          className={`w-4 h-4 ${
            job.status === 'Running'
              ? 'text-[#0284C7]'
              : job.status === 'Queued'
              ? 'text-[#D97706]'
              : job.status === 'Failed'
              ? 'text-[#E11D48]'
              : 'text-[#059669]'
          }`}
        />
      ),
      run: () => {
        onSelectJob(job);
      },
    }));

    return [...navItems, ...actionItems, ...jobItems];
  }, [jobs, onNavigate, onSelectJob, onOpenSubmitJob, onRunDemo, onCrashWorker, onRecoverWorkers, onOpenAuth]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show nav, actions, and top 5 jobs when empty
      const navAndActions = items.filter((i) => i.group !== 'Jobs');
      const topJobs = items.filter((i) => i.group === 'Jobs').slice(0, 5);
      return [...navAndActions, ...topJobs];
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    return items
      .filter((item) => {
        const hay = `${item.label} ${item.subtitle} ${item.keywords}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 18);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const executeItem = async (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    try {
      await item.run();
    } catch (err) {
      console.warn('Command palette action failed:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void executeItem(filtered[activeIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-3 sm:px-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-xl bg-white border border-[#D8CBB8] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Header */}
        <div className="px-4 py-3 border-b border-[#EAE1D4] bg-[#FAF6F0] flex items-center gap-3">
          <Search className="w-4 h-4 text-[#6B5D51] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs, navigate views, or trigger cluster actions..."
            aria-label="Command palette search"
            className="flex-1 bg-transparent text-sm font-sans text-[#241812] placeholder-[#6B5D51] focus:outline-none min-w-0"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1.5 rounded-md text-[#5D5044] hover:text-[#241812] hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs font-mono text-[#5D5044]">
              No matching routes, actions, or jobs for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const showGroupHeader = idx === 0 || filtered[idx - 1].group !== item.group;
              const isSelected = idx === activeIndex;

              return (
                <React.Fragment key={item.id}>
                  {showGroupHeader && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#6B5D51] font-semibold">
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => void executeItem(item)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAF4ED] border border-[#874924]/40 text-[#241812]'
                        : 'border border-transparent hover:bg-[#FAF6F0] text-[#241812]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#EAE1D4] flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-sans font-semibold text-[#241812] truncate">
                          {item.label}
                        </div>
                        <div className="text-[11px] font-mono text-[#5D5044] truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono font-semibold text-[#5D5044] shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="px-4 py-2 border-t border-[#EAE1D4] bg-[#FAF6F0] flex items-center justify-between text-[10px] font-mono text-[#5D5044]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="hidden sm:inline">Ctrl+K / Cmd+K</span>
        </div>
      </div>
    </div>
  );
};
