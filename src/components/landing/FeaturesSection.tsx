import React, { useState } from 'react';
import { 
  Zap, 
  ShieldAlert, 
  Cpu, 
  Clock, 
  BarChart, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  Sliders
} from 'lucide-react';

interface FeaturesSectionProps {
  onLaunchConsole: () => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onLaunchConsole }) => {
  const [activeAgingSec, setActiveAgingSec] = useState<number>(24);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('pdf_analysis');

  const basePriority = 25; // Low
  const agingRate = 1.5;
  const effectivePriority = Math.min(100, Math.round(basePriority + (activeAgingSec * agingRate)));

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-[#E8DFD3]">
      {/* Section Header */}
      <div className="max-w-2xl mb-12 sm:mb-16">
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#874924] font-medium block mb-2">
          Architecture &amp; Principles
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#292019] tracking-tight mb-4">
          Engineered for deterministic execution.
        </h2>
        <p className="text-sm sm:text-base text-[#5D5044] leading-relaxed">
          Standard message brokers like RabbitMQ or standard Celery queues are oblivious to job semantics. Orchestrix combines domain-specialized workers with dynamic priority aging and statistical scoring.
        </p>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
        {/* Card 1: Priority Aging (col 7) */}
        <div className="md:col-span-7 bg-[#FCFAF6] border border-[#E9DFD2] rounded-3xl p-5 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] border border-[#E4D1BD] flex items-center justify-center text-[#874924]">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#5D5044]">Phase 2 · Starvation Prevention</span>
            </div>

            <h3 className="font-serif text-2xl text-[#292019] mb-3">
              Dynamic Priority Aging
            </h3>
            <p className="text-sm text-[#5D5044] leading-relaxed mb-6">
              In naive priority queues, high-priority workloads starve low-priority tasks indefinitely. Orchestrix implements continuous aging: a low-priority job&apos;s effective score increases monotonically with queue wait time until it guarantees timely dispatch.
            </p>

            {/* Interactive Aging Sandbox */}
            <div className="bg-white/90 border border-[#E8DEC8] rounded-2xl p-4 sm:p-5 mb-4">
              <div className="flex items-center justify-between text-xs text-[#5D5044] mb-2">
                <label htmlFor="landing-aging-slider" className="font-medium">
                  Simulated Queue Wait Time:
                </label>
                <span className="font-mono font-semibold text-[#874924]">{activeAgingSec} seconds</span>
              </div>
              <input
                id="landing-aging-slider"
                aria-label="Simulated queue wait time in seconds"
                type="range"
                min="0"
                max="60"
                value={activeAgingSec}
                onChange={(e) => setActiveAgingSec(Number(e.target.value))}
                className="w-full h-1.5 bg-[#EAE0D2] rounded-lg appearance-none cursor-pointer accent-[#874924]"
              />

              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-3 border-t border-[#F0E6D8] text-center">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#5D5044]">Base Priority</span>
                  <span className="text-xs sm:text-sm font-mono font-semibold text-[#5D5044]">Low (25)</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#5D5044]">Aging Rate</span>
                  <span className="text-xs sm:text-sm font-mono font-semibold text-[#874924]">+1.5 / sec</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#5D5044]">Effective Priority</span>
                  <span className={`text-xs sm:text-sm font-mono font-bold ${effectivePriority > 70 ? 'text-[#047857]' : 'text-[#874924]'}`}>
                    {effectivePriority} pts {effectivePriority >= 75 ? '(Escalated!)' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-[#5D5044] flex items-center gap-1.5 pt-2 font-mono">
            <span>Formula: Effective = Base + (WaitSec × λ)</span>
          </div>
        </div>

        {/* Card 2: Specialized Worker Routing (col 5) */}
        <div className="md:col-span-5 bg-[#FCFAF6] border border-[#E9DFD2] rounded-3xl p-5 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] border border-[#E4D1BD] flex items-center justify-center text-[#874924]">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#5D5044]">Phase 2 · Worker Topology</span>
            </div>

            <h3 className="font-serif text-2xl text-[#292019] mb-3">
              Worker Specialization
            </h3>
            <p className="text-sm text-[#5D5044] leading-relaxed mb-6">
              Instead of generic monolithic runners, workers specialize in targeted task classes with warmed memory caches and optimized runtimes.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#EFE8DD] text-xs">
                <span className="font-medium text-[#292019]">Worker 01 (Text / LLM)</span>
                <span className="text-[#047857] font-mono font-medium text-right">Summarization, Parsing</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#EFE8DD] text-xs">
                <span className="font-medium text-[#292019]">Worker 02 (Documents)</span>
                <span className="text-[#B45309] font-mono font-medium text-right">PDF OCR, Resumes</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#EFE8DD] text-xs">
                <span className="font-medium text-[#292019]">Worker 03 (Data Processing)</span>
                <span className="text-[#6D28D9] font-mono font-medium text-right">CSV, DataFrames</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#EFE8DD] text-xs">
                <span className="font-medium text-[#292019]">Worker 04 (Image Analysis)</span>
                <span className="text-[#BE123C] font-mono font-medium text-right">Vision, Segmentation</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLaunchConsole}
            className="mt-6 flex items-center justify-between text-xs font-semibold text-[#874924] hover:text-[#6D3916] transition-colors cursor-pointer"
          >
            <span>Inspect worker fleet in Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Fault Recovery & Heartbeat Watchdog (col 5) */}
        <div className="md:col-span-5 bg-[#FCFAF6] border border-[#E9DFD2] rounded-3xl p-5 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] border border-[#FCD8D8] flex items-center justify-center text-[#BE123C]">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#5D5044]">Phase 3 · Resilience &amp; DLQ</span>
            </div>

            <h3 className="font-serif text-2xl text-[#292019] mb-3">
              Automated Crash Recovery
            </h3>
            <p className="text-sm text-[#5D5044] leading-relaxed mb-6">
              Distributed systems fail. Orchestrix monitors 3-second heartbeat leases. When a worker process abruptly terminates (SIGKILL / OOM), active jobs are marked as abandoned and requeued to an alternate worker seamlessly.
            </p>

            <div className="bg-white/90 border border-[#E8DEC8] rounded-2xl p-4 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-[#241812]">
                <span>Failure Classifier:</span>
                <span className="text-[#874924] font-semibold">Smart 4-Tier Matrix</span>
              </div>
              <div className="text-[11px] text-[#5D5044] space-y-1">
                <div>• Timeout → Exponential Backoff Retry</div>
                <div>• Process Crash → Immediate Alternate Requeue</div>
                <div>• Rate Limit → Jittered Cooldown Delay</div>
                <div>• Invalid Input → Dead Letter Queue (DLQ)</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F0E6D8] mt-6 flex items-center justify-between">
            <span className="text-xs text-[#5D5044]">Zero jobs dropped on crash</span>
            <span className="text-xs font-mono font-medium text-[#047857]">100% Leased Recovery</span>
          </div>
        </div>

        {/* Card 4: Intelligent Scoring Function (col 7) */}
        <div className="md:col-span-7 bg-[#FCFAF6] border border-[#E9DFD2] rounded-3xl p-5 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] border border-[#E4D1BD] flex items-center justify-center text-[#874924]">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#5D5044]">Phase 5 · Intelligent Scheduling</span>
            </div>

            <h3 className="font-serif text-2xl text-[#292019] mb-3">
              Weighted Statistical Scoring
            </h3>
            <p className="text-sm text-[#5D5044] leading-relaxed mb-4">
              Instead of random or round-robin selection, our scheduler computes a composite score for each candidate worker based on domain specialization, current load, historical execution speed, and past reliability.
            </p>

            {/* Formula Block */}
            <div className="bg-[#292019] text-[#FAF6F0] rounded-2xl p-4 sm:p-5 mb-5 font-mono text-xs shadow-inner overflow-x-auto">
              <div className="text-[#F5C794] font-semibold mb-2">
                Score(w, t) = (w_spec × S) - (w_load × L) + (w_perf × P) - (w_err × E)
              </div>
              <div className="text-[11px] text-[#E5D7C7] space-y-1">
                <div>• S(w, t): Specialization alignment bonus (0–100)</div>
                <div>• L(w): Current queue depth and CPU utilization penalty (0–100)</div>
                <div>• P(w, t): Historical execution speed percentile (0–100)</div>
                <div>• E(w): Historical error &amp; failure penalty (0–100)</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#5D5044]">Fully transparent routing decisions</span>
            <button
              type="button"
              onClick={onLaunchConsole}
              className="px-4 py-2 rounded-full bg-[#874924] hover:bg-[#723B19] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Test Scoring Simulator →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
