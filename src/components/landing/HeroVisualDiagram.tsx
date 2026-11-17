import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Brain, 
  Database, 
  Image as ImageIcon, 
  Check, 
  MoreVertical,
  Sparkles
} from 'lucide-react';
import { BronzeLogo } from '../common/BronzeLogo';
import { SculpturalOrb } from '../common/SculpturalOrb';

interface HeroVisualDiagramProps {
  onSelectWorker?: (workerId: string) => void;
  onLaunchConsole?: () => void;
}

export const HeroVisualDiagram: React.FC<HeroVisualDiagramProps> = ({ 
  onSelectWorker,
  onLaunchConsole 
}) => {
  const [activeWorker, setActiveWorker] = useState<string>('worker-01');
  const [pulsePhase, setPulsePhase] = useState<number>(0);
  const [lastJobDuration, setLastJobDuration] = useState<string>('12.4s');

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 4);
      const workers = ['worker-01', 'worker-02', 'worker-03', 'worker-04'];
      const nextWorker = workers[Math.floor(Math.random() * workers.length)];
      setActiveWorker(nextWorker);
      const dur = (Math.random() * 6 + 9).toFixed(1) + 's';
      setLastJobDuration(dur);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-[720px] select-none">
      {/* Compact Responsive Topology Flow (< 640px / 375px safe) */}
      <div className="flex sm:hidden flex-col gap-3 bg-white/85 border border-[#EFE8DD] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EFE8DD]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF3EC] border border-[#ECDCCB] flex items-center justify-center text-[#8B4D26]">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#241812]">Incoming Jobs</span>
          </div>
          <span className="text-[10px] font-mono text-[#5D5044]">PDF · LLM · CSV · Vision</span>
        </div>

        <button
          type="button"
          onClick={onLaunchConsole}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#FFFDFC] to-[#F3E8DA] border border-[#E5D7C5] cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <BronzeLogo size={32} />
            <div>
              <div className="text-xs font-bold text-[#241812]">Smart Scheduler</div>
              <div className="text-[10px] font-mono text-[#5D5044]">Weighted Affinity + Aging</div>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-[#874924]">Console →</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'worker-01', name: 'Worker 01', spec: 'Text / LLM', color: '#047857', bg: '#ECFDF5', icon: <Brain className="w-3.5 h-3.5" /> },
            { id: 'worker-02', name: 'Worker 02', spec: 'Documents', color: '#B45309', bg: '#FFFBEB', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'worker-03', name: 'Worker 03', spec: 'Data Proc', color: '#6D28D9', bg: '#F5F3FF', icon: <Database className="w-3.5 h-3.5" /> },
            { id: 'worker-04', name: 'Worker 04', spec: 'Vision', color: '#BE123C', bg: '#FEF2F2', icon: <ImageIcon className="w-3.5 h-3.5" /> },
          ].map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                setActiveWorker(w.id);
                onSelectWorker?.(w.id);
              }}
              className={`flex items-center gap-2 p-2.5 rounded-xl bg-white border text-left cursor-pointer transition-all ${
                activeWorker === w.id ? 'border-[#874924] ring-1 ring-[#874924]/25' : 'border-[#EFE8DD]'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: w.bg, color: w.color }}
              >
                {w.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#241812] truncate">{w.name}</div>
                <div className="text-[10px] text-[#5D5044] truncate">{w.spec}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#EFE8DD] text-[11px] text-[#5D5044]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#241812]">
            <Check className="w-3.5 h-3.5 text-[#047857]" />
            Job Completed
          </span>
          <span className="font-mono text-[10px]">Processed in {lastJobDuration}</span>
        </div>
      </div>

      {/* Desktop Orbital Visual Diagram (>= 640px) */}
      <div className="hidden sm:flex relative w-full max-w-[720px] h-[520px] items-center justify-center">
        {/* Background ambient radial glow */}
        <div className="absolute inset-0 bg-radial from-[#F5EADF]/50 via-[#FAF4ED]/20 to-transparent pointer-events-none rounded-3xl" />

        {/* SVG Connecting Flow Lines & Orbital Rings */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 720 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bronzeLineGrad" x1="180" y1="140" x2="420" y2="250" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C99468" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#B2784A" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#8A4E26" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="workerLineGrad1" x1="420" y1="230" x2="530" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C99468" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="workerLineGrad2" x1="420" y1="240" x2="530" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C99468" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="workerLineGrad3" x1="420" y1="250" x2="530" y2="190" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C99468" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="workerLineGrad4" x1="420" y1="260" x2="530" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C99468" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.7" />
            </linearGradient>

            <radialGradient id="orbitBeadGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="40%" stopColor="#E2A66C" />
              <stop offset="100%" stopColor="#874924" />
            </radialGradient>
          </defs>

          <ellipse
            cx="360"
            cy="245"
            rx="340"
            ry="190"
            stroke="#C89D78"
            strokeWidth="1.2"
            strokeOpacity="0.35"
            strokeDasharray="4 8"
            transform="rotate(-12 360 245)"
          />
          <ellipse
            cx="360"
            cy="245"
            rx="185"
            ry="105"
            stroke="#B58156"
            strokeWidth="1"
            strokeOpacity="0.4"
            transform="rotate(-16 360 245)"
          />
          <ellipse
            cx="360"
            cy="245"
            rx="110"
            ry="65"
            stroke="#C89D78"
            strokeWidth="0.8"
            strokeOpacity="0.3"
            transform="rotate(-8 360 245)"
          />

          <path
            d="M 195 125 C 240 125, 255 210, 292 235"
            stroke="url(#bronzeLineGrad)"
            strokeWidth="1.8"
            fill="none"
          />
          <path
            d="M 195 155 C 235 155, 260 230, 292 255"
            stroke="url(#bronzeLineGrad)"
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M 430 225 C 470 215, 490 85, 528 50"
            stroke={activeWorker === 'worker-01' ? '#10B981' : 'url(#workerLineGrad1)'}
            strokeWidth={activeWorker === 'worker-01' ? '2.2' : '1.5'}
            strokeOpacity={activeWorker === 'worker-01' ? '0.9' : '0.45'}
            fill="none"
            className="transition-all duration-300"
          />
          <path
            d="M 430 235 C 465 230, 495 145, 528 120"
            stroke={activeWorker === 'worker-02' ? '#F59E0B' : 'url(#workerLineGrad2)'}
            strokeWidth={activeWorker === 'worker-02' ? '2.2' : '1.5'}
            strokeOpacity={activeWorker === 'worker-02' ? '0.9' : '0.45'}
            fill="none"
            className="transition-all duration-300"
          />
          <path
            d="M 430 248 C 470 250, 495 205, 528 190"
            stroke={activeWorker === 'worker-03' ? '#8B5CF6' : 'url(#workerLineGrad3)'}
            strokeWidth={activeWorker === 'worker-03' ? '2.2' : '1.5'}
            strokeOpacity={activeWorker === 'worker-03' ? '0.9' : '0.45'}
            fill="none"
            className="transition-all duration-300"
          />
          <path
            d="M 430 260 C 465 270, 495 262, 528 260"
            stroke={activeWorker === 'worker-04' ? '#EF4444' : 'url(#workerLineGrad4)'}
            strokeWidth={activeWorker === 'worker-04' ? '2.2' : '1.5'}
            strokeOpacity={activeWorker === 'worker-04' ? '0.9' : '0.45'}
            fill="none"
            className="transition-all duration-300"
          />
          <path
            d="M 345 315 C 330 365, 305 385, 275 395"
            stroke="#10B981"
            strokeWidth="1.4"
            strokeOpacity="0.45"
            fill="none"
          />

          <circle cx="510" cy="148" r="8" fill="url(#orbitBeadGrad)" className="drop-shadow-xs" />
          <circle cx="215" cy="305" r="7" fill="url(#orbitBeadGrad)" className="drop-shadow-xs" />
          <circle cx="310" cy="140" r="5.5" fill="url(#orbitBeadGrad)" className="drop-shadow-xs" />
          <circle cx="490" cy="340" r="6" fill="url(#orbitBeadGrad)" className="drop-shadow-xs" />
        </svg>

        {/* 1. INCOMING JOBS FLOATING CARD */}
        <div className="absolute left-4 top-8 w-52 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_16px_36px_rgba(130,75,30,0.08)] border border-[#EFE8DD] transition-transform duration-300 hover:-translate-y-1 z-10">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF3EC] border border-[#ECDCCB] flex items-center justify-center text-[#8B4D26] shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-[#241812] tracking-tight">Incoming Jobs</span>
          </div>

          <ul className="space-y-2 text-xs text-[#5D5044] pl-1 font-sans">
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87A4C]" />
              <span>PDF Analysis</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87A4C]" />
              <span>Resume Parsing</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87A4C]" />
              <span>Data Processing</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87A4C]" />
              <span>Image Analysis</span>
            </li>
            <li className="pt-0.5 text-[11px] text-[#5D5044] font-medium pl-4">
              + more
            </li>
          </ul>
        </div>

        {/* 2. CENTRAL SMART SCHEDULER */}
        <button
          type="button"
          onClick={onLaunchConsole}
          aria-label="Open Live Orchestration Console"
          className="absolute left-[290px] top-[175px] w-[140px] h-[140px] bg-gradient-to-br from-[#FFFDFC] via-[#F8F1E7] to-[#EFE2D2] rounded-[28px] shadow-[0_20px_45px_rgba(130,75,30,0.14),inset_0_2px_4px_rgba(255,255,255,0.9)] border border-[#E5D7C5] flex flex-col items-center justify-center p-3 cursor-pointer group transition-all duration-300 hover:scale-105 z-20"
        >
          <div className="absolute inset-0 rounded-[28px] bg-radial from-[#F5D1A6]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative mb-2 transition-transform duration-500 group-hover:rotate-12">
            <BronzeLogo size={58} />
            <Sparkles className="w-3.5 h-3.5 text-[#F5C794] absolute -top-1 -right-1 animate-pulse" />
          </div>

          <span className="text-[12px] font-bold text-[#3C2A1E] tracking-tight text-center leading-tight font-sans">
            Smart Scheduler
          </span>
        </button>

        {/* 3. WORKER NODES */}
        <div className="absolute right-4 top-6 flex flex-col gap-3.5 w-52 z-10">
          <button
            type="button"
            onClick={() => {
              setActiveWorker('worker-01');
              onSelectWorker?.('worker-01');
            }}
            aria-label="Inspect Worker 01 Text and LLM node"
            className={`w-full text-left flex items-center justify-between p-2.5 px-3.5 bg-white/95 backdrop-blur-md rounded-2xl border transition-all duration-200 cursor-pointer ${
              activeWorker === 'worker-01'
                ? 'border-[#10B981] shadow-[0_8px_22px_rgba(16,185,129,0.18)] ring-1 ring-[#10B981]/30 translate-x-1'
                : 'border-[#EFE8DD] shadow-[0_4px_16px_rgba(120,70,30,0.05)] hover:border-[#DFD5C6]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#047857] flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#241812]">Worker 01</span>
                <span className="text-[10.5px] text-[#5D5044]">Text / LLM</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveWorker('worker-02');
              onSelectWorker?.('worker-02');
            }}
            aria-label="Inspect Worker 02 Documents node"
            className={`w-full text-left flex items-center justify-between p-2.5 px-3.5 bg-white/95 backdrop-blur-md rounded-2xl border transition-all duration-200 cursor-pointer ${
              activeWorker === 'worker-02'
                ? 'border-[#F59E0B] shadow-[0_8px_22px_rgba(245,158,11,0.18)] ring-1 ring-[#F59E0B]/30 translate-x-1'
                : 'border-[#EFE8DD] shadow-[0_4px_16px_rgba(120,70,30,0.05)] hover:border-[#DFD5C6]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] text-[#B45309] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#241812]">Worker 02</span>
                <span className="text-[10.5px] text-[#5D5044]">Documents</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveWorker('worker-03');
              onSelectWorker?.('worker-03');
            }}
            aria-label="Inspect Worker 03 Data Processing node"
            className={`w-full text-left flex items-center justify-between p-2.5 px-3.5 bg-white/95 backdrop-blur-md rounded-2xl border transition-all duration-200 cursor-pointer ${
              activeWorker === 'worker-03'
                ? 'border-[#8B5CF6] shadow-[0_8px_22px_rgba(139,92,246,0.18)] ring-1 ring-[#8B5CF6]/30 translate-x-1'
                : 'border-[#EFE8DD] shadow-[0_4px_16px_rgba(120,70,30,0.05)] hover:border-[#DFD5C6]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#241812]">Worker 03</span>
                <span className="text-[10.5px] text-[#5D5044]">Data Processing</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveWorker('worker-04');
              onSelectWorker?.('worker-04');
            }}
            aria-label="Inspect Worker 04 Image Analysis node"
            className={`w-full text-left flex items-center justify-between p-2.5 px-3.5 bg-white/95 backdrop-blur-md rounded-2xl border transition-all duration-200 cursor-pointer ${
              activeWorker === 'worker-04'
                ? 'border-[#EF4444] shadow-[0_8px_22px_rgba(239,68,68,0.18)] ring-1 ring-[#EF4444]/30 translate-x-1'
                : 'border-[#EFE8DD] shadow-[0_4px_16px_rgba(120,70,30,0.05)] hover:border-[#DFD5C6]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] text-[#BE123C] flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#241812]">Worker 04</span>
                <span className="text-[10.5px] text-[#5D5044]">Image Analysis</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
          </button>
        </div>

        {/* 4. JOB COMPLETED FLOATING CARD */}
        <div className="absolute left-[190px] bottom-10 w-[260px] bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-[0_14px_32px_rgba(120,70,30,0.1)] border border-[#EFE8DD] flex items-center justify-between z-15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shadow-2xs">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#241D17]">Job Completed</span>
              <span className="text-[11px] text-[#5D5044]">Processed in {lastJobDuration}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pr-1">
            <svg aria-hidden="true" className="w-14 h-6" viewBox="0 0 60 24" fill="none">
              <path
                d="M 2 18 Q 14 19, 22 13 T 40 10 T 56 4"
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <MoreVertical className="w-3.5 h-3.5 text-[#5D5044]" />
          </div>
        </div>

        {/* 5. SCULPTURAL ORB */}
        <div className="absolute -right-2 -bottom-4 z-20">
          <SculpturalOrb size={175} />
        </div>
      </div>
    </div>
  );
};

