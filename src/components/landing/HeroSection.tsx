import React from 'react';
import { Zap, Layers, BarChart2, Shield } from 'lucide-react';
import { HeroVisualDiagram } from './HeroVisualDiagram';

interface HeroSectionProps {
  onGetStarted: () => void;
  onExploreFeatures: () => void;
  onSelectWorker?: (workerId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStarted,
  onExploreFeatures,
  onSelectWorker,
}) => {
  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 lg:pt-8 pb-12 flex flex-col justify-between min-h-[calc(100vh-90px)]">
      {/* Top Hero Body: Left Headline & Copy + Right Interactive Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center my-auto">
        {/* Left Column (5 cols on large desktop, 6 on medium) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center max-w-xl">
          {/* Main Title */}
          <h1 className="font-serif text-[44px] xs:text-5xl sm:text-7xl md:text-[76px] lg:text-[80px] xl:text-[86px] font-normal leading-[0.98] tracking-[-0.035em] text-[#241812] mb-5 sm:mb-6">
            Orchestrate<br />
            intelligence.<br />
            At scale.
          </h1>

          {/* Subheading paragraph */}
          <p className="font-sans text-sm sm:text-[17px] text-[#5D5044] leading-[1.65] mb-7 sm:mb-8 lg:mb-10 max-w-lg font-normal">
            Orchestrix is an intelligent AI workload orchestration platform that routes, prioritizes, monitors, and scales AI/data-processing jobs across distributed workers — while learning from past executions to optimize performance.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 lg:mb-14">
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-[#874924] hover:bg-[#723B19] active:scale-[0.98] text-white font-sans text-sm sm:text-base font-medium tracking-wide shadow-[0_4px_16px_rgba(135,73,36,0.28)] transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <span className="text-base leading-none">→</span>
            </button>

            <button
              type="button"
              onClick={onExploreFeatures}
              className="inline-flex items-center justify-center px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2EAE0] active:scale-[0.98] text-[#241812] border border-[#DDD1C2] font-sans text-sm sm:text-base font-medium tracking-wide transition-all cursor-pointer shadow-2xs"
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): The interactive visual diagram */}
        <div className="lg:col-span-7 xl:col-span-7 flex justify-center lg:justify-end items-center w-full overflow-hidden sm:overflow-visible">
          <HeroVisualDiagram
            onSelectWorker={onSelectWorker}
            onLaunchConsole={onGetStarted}
          />
        </div>
      </div>

      {/* Bottom 4 Feature Cards Bar */}
      <div className="w-full pt-8 sm:pt-10 mt-6 border-t border-[#EAE1D4]/80 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
        {/* Feature 1: Smart Routing */}
        <div className="flex items-start gap-3.5">
          <div className="text-[#241812] mt-0.5 shrink-0">
            <Zap className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-[#241812] mb-1 font-sans">
              Smart Routing
            </h2>
            <p className="text-xs text-[#5D5044] leading-snug font-sans">
              Send jobs to the right worker automatically
            </p>
          </div>
        </div>

        {/* Feature 2: Scalable */}
        <div className="flex items-start gap-3.5">
          <div className="text-[#241812] mt-0.5 shrink-0">
            <Layers className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-[#241812] mb-1 font-sans">
              Scalable
            </h2>
            <p className="text-xs text-[#5D5044] leading-snug font-sans">
              Handle thousands of jobs effortlessly
            </p>
          </div>
        </div>

        {/* Feature 3: Real-time Monitoring */}
        <div className="flex items-start gap-3.5">
          <div className="text-[#241812] mt-0.5 shrink-0">
            <BarChart2 className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-[#241812] mb-1 font-sans">
              Real-time Monitoring
            </h2>
            <p className="text-xs text-[#5D5044] leading-snug font-sans">
              Track progress and performance
            </p>
          </div>
        </div>

        {/* Feature 4: Fault Tolerant */}
        <div className="flex items-start gap-3.5">
          <div className="text-[#241812] mt-0.5 shrink-0">
            <Shield className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-[#241812] mb-1 font-sans">
              Fault Tolerant
            </h2>
            <p className="text-xs text-[#5D5044] leading-snug font-sans">
              Auto-retries and dead letter queue
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

