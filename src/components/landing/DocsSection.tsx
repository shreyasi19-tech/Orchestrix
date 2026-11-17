import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  Terminal, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Play
} from 'lucide-react';

interface DocsSectionProps {
  onLaunchConsole: () => void;
}

export const DocsSection: React.FC<DocsSectionProps> = ({ onLaunchConsole }) => {
  const [activeFaq, setActiveFaq] = useState<number>(0);

  const interviewQuestions = [
    {
      q: "1. Why not use standard Celery or RabbitMQ out of the box?",
      a: "Standard message brokers are task-content agnostic: they distribute jobs strictly via FIFO or fixed priority heaps. This creates two fatal problems in AI workloads: (1) Queue Starvation: a flood of High-Priority LLM tasks starves low-priority PDF conversions forever; (2) Specialization & Cold-Start Waste: AI workers benefit immensely from warm memory caches (OCR engines, embedding models, tokenizers). Orchestrix's Smart Scheduler pairs dynamic priority aging with historical performance scoring to achieve both starvation-free execution and cache-optimal dispatch."
    },
    {
      q: "2. How is worker failure/abandonment detected mid-job without deadlocks?",
      a: "Every worker maintains a 5-second heartbeat lease in Redis (`heartbeat:{worker_id}`). When a job is leased, a sliding execution lease is maintained. If a worker process receives SIGKILL, runs out of memory (OOM), or loses network connectivity, the heartbeat key expires. The Scheduler's watchdog loop identifies the running job whose assigned worker failed the heartbeat check, marks it as 'worker_crash', increments its retry counter, and immediately pushes it back to the priority queue with a recovery priority boost so an alternate worker takes over within seconds."
    },
    {
      q: "3. How does the Weighted Statistical Scoring Function work?",
      a: "For each candidate worker w and incoming task t, the scheduler evaluates:\nScore(w, t) = (w_spec × SpecializationBonus) - (w_load × CurrentLoadPenalty) + (w_perf × HistoricalPerfBonus) - (w_err × ErrorPenalty)\n\n• SpecializationBonus (0-100): High score if worker runtime has dedicated libraries/models pre-warmed.\n• CurrentLoadPenalty (0-100): Prevents oversubscribing busy workers (penalizes CPU% and active leases).\n• HistoricalPerfBonus (0-100): Rewards workers that have historically finished this specific task type with lower latency and higher success rates.\n• ErrorPenalty (0-100): Quarantines flaky workers that recently encountered consecutive execution faults."
    },
    {
      q: "4. Why is Smart Failure Classification crucial before retrying?",
      a: "A naive retry loop poisons distributed queues. If a client submits malformed JSON ('invalid_input'), retrying 3 times wastes valuable GPU/CPU worker cycles and fails identically each time. Orchestrix classifies failures into 4 distinct behaviors: Timeout triggers exponential backoff; Process Crash triggers immediate alternate worker requeue; Rate Limit triggers jittered cooldown delay; Invalid Input bypasses retries entirely and is routed directly to the Dead Letter Queue (DLQ) for human audit."
    }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-[#E8DFD3]">
      <div className="max-w-2xl mb-10 sm:mb-12">
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#874924] font-medium block mb-2">
          Documentation &amp; Interview Guide
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#292019] tracking-tight mb-4">
          The Engineering Interview Playbook.
        </h2>
        <p className="text-sm sm:text-base text-[#5D5044] leading-relaxed">
          The exact mental models, architectural rationale, and failure-handling invariants you need to explain Orchestrix with absolute conviction in a senior systems interview.
        </p>
      </div>

      {/* Grid: Left FAQ accordion, Right interactive test runner trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left: Questions Accordion */}
        <div className="lg:col-span-7 space-y-4">
          {interviewQuestions.map((item, index) => {
            const isExpanded = activeFaq === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all ${
                  isExpanded
                    ? 'bg-white border-[#874924] shadow-md ring-1 ring-[#874924]/20'
                    : 'bg-[#FCFAF6] border-[#E9DFD2] hover:border-[#D5C7B5]'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setActiveFaq(isExpanded ? -1 : index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-sm font-semibold text-[#292019] font-sans">
                    {item.q}
                  </span>
                  <span className="text-xs font-mono text-[#874924] font-semibold shrink-0">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 text-xs text-[#5D5044] leading-relaxed border-t border-[#F2EAE0] whitespace-pre-line font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Quick Start Commands & Demo Scripts */}
        <div className="lg:col-span-5 bg-[#201A15] text-[#FAF6F0] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#3C3229] min-w-0">
          <div className="flex items-center gap-2 mb-4 text-[#DFB286]">
            <Terminal className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">Local Setup &amp; Quickstart</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <span className="text-[#D4C5B4] block text-[11px] mb-1"># 1. Clone &amp; Spin up full Docker stack</span>
              <div className="bg-[#15110E] p-3 rounded-xl border border-[#332A22] text-[#93C5FD] overflow-x-auto whitespace-nowrap">
                git clone https://github.com/orchestrix/core.git<br />
                cd core &amp;&amp; docker-compose up -d
              </div>
            </div>

            <div>
              <span className="text-[#D4C5B4] block text-[11px] mb-1"># 2. Run Failure Simulation Demo (SIGKILL)</span>
              <div className="bg-[#15110E] p-3 rounded-xl border border-[#332A22] text-[#FCA5A5] overflow-x-auto whitespace-nowrap">
                curl -X POST http://localhost:8000/api/v1/workers/worker-02/simulate-kill
              </div>
            </div>

            <div>
              <span className="text-[#D4C5B4] block text-[11px] mb-1"># 3. Trigger 500-Job Scale Benchmark</span>
              <div className="bg-[#15110E] p-3 rounded-xl border border-[#332A22] text-[#86EFAC] overflow-x-auto whitespace-nowrap">
                python scripts/benchmark.py --workers 10 --jobs 500
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#3C3229] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#D4C5B4]">Live browser sandbox:</span>
            <button
              type="button"
              onClick={onLaunchConsole}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#874924] hover:bg-[#723B19] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Live Console</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
