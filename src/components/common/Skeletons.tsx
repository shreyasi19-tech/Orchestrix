import React from 'react';

export const StatsCardsSkeleton: React.FC = () => (
  <div
    className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6"
    aria-label="Loading workload statistics"
    aria-busy="true"
  >
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="bg-white border border-[#EAE1D4] rounded-xl p-3.5 shadow-xs space-y-3 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-[#EAE1D4] rounded" />
          <div className="h-3.5 w-3.5 bg-[#EAE1D4] rounded" />
        </div>
        <div className="flex items-baseline justify-between">
          <div className="h-7 w-12 bg-[#EAE1D4] rounded" />
          <div className="h-4 w-16 bg-[#F2EAE0] rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const JobsTableSkeleton: React.FC = () => (
  <div
    className="bg-white border border-[#EAE1D4] rounded-xl overflow-hidden shadow-xs"
    aria-label="Loading jobs table"
    aria-busy="true"
  >
    <div className="p-3.5 border-b border-[#EAE1D4] bg-[#FAF6F0] flex flex-wrap items-center justify-between gap-3">
      <div className="h-8 w-full sm:w-64 bg-[#EAE1D4] rounded-md animate-pulse" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-[#EAE1D4] rounded animate-pulse" />
        ))}
      </div>
    </div>
    <div className="divide-y divide-[#F0E6D8]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4 animate-pulse">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-3.5 w-32 bg-[#EAE1D4] rounded" />
            <div className="h-3 w-48 max-w-full bg-[#F2EAE0] rounded" />
          </div>
          <div className="hidden sm:block h-4 w-24 bg-[#F2EAE0] rounded" />
          <div className="h-5 w-20 bg-[#EAE1D4] rounded" />
          <div className="hidden md:block h-4 w-16 bg-[#F2EAE0] rounded" />
          <div className="h-7 w-16 bg-[#EAE1D4] rounded" />
        </div>
      ))}
    </div>
  </div>
);

export const WorkersGridSkeleton: React.FC = () => (
  <div
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    aria-label="Loading worker fleet"
    aria-busy="true"
  >
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="bg-white border border-[#EAE1D4] rounded-xl p-5 space-y-4 shadow-xs animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#EAE1D4]" />
            <div className="space-y-1">
              <div className="h-3.5 w-24 bg-[#EAE1D4] rounded" />
              <div className="h-2.5 w-16 bg-[#F2EAE0] rounded" />
            </div>
          </div>
          <div className="h-5 w-20 bg-[#EAE1D4] rounded" />
        </div>
        <div className="h-14 bg-[#FAF6F0] border border-[#EAE1D4] rounded-lg" />
        <div className="space-y-2">
          <div className="h-2 w-full bg-[#EAE1D4] rounded" />
          <div className="h-2 w-4/5 bg-[#F2EAE0] rounded" />
        </div>
        <div className="h-9 w-full bg-[#EAE1D4] rounded-md" />
      </div>
    ))}
  </div>
);

export const QueuesPageSkeleton: React.FC = () => (
  <div className="space-y-6" aria-label="Loading queues and scheduler" aria-busy="true">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-[#EAE1D4] rounded-xl p-3.5 shadow-xs space-y-2 animate-pulse">
          <div className="h-3 w-28 bg-[#EAE1D4] rounded" />
          <div className="h-7 w-16 bg-[#EAE1D4] rounded" />
        </div>
      ))}
    </div>
    <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 h-64 animate-pulse" />
    <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 h-48 animate-pulse" />
  </div>
);

export const MonitoringPageSkeleton: React.FC = () => (
  <div className="space-y-6" aria-label="Loading monitoring telemetry" aria-busy="true">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-[#EAE1D4] rounded-xl p-3.5 shadow-xs space-y-2 animate-pulse">
          <div className="h-3 w-28 bg-[#EAE1D4] rounded" />
          <div className="h-7 w-20 bg-[#EAE1D4] rounded" />
        </div>
      ))}
    </div>
    <div className="bg-white border border-[#EAE1D4] rounded-xl p-5 h-80 animate-pulse" />
  </div>
);

export const PageSuspenseSkeleton: React.FC = () => (
  <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6" aria-busy="true">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE1D4] animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-[#EAE1D4] rounded" />
        <div className="h-4 w-64 max-w-full bg-[#F2EAE0] rounded" />
      </div>
      <div className="h-9 w-44 bg-[#EAE1D4] rounded" />
    </div>
    <StatsCardsSkeleton />
    <JobsTableSkeleton />
  </div>
);
