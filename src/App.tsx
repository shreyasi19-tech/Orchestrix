import React, { Suspense, lazy, useEffect, useState } from 'react';
import { TopNavbar, NavTab } from './components/landing/TopNavbar';
import { HeroSection } from './components/landing/HeroSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { ArchitectureSection } from './components/landing/ArchitectureSection';
import { DocsSection } from './components/landing/DocsSection';
import { TopNav, DashboardNavTab } from './components/navigation/TopNav';
import { BronzeLogo } from './components/common/BronzeLogo';
import { PageSuspenseSkeleton } from './components/common/Skeletons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { jobsStore } from './services/jobsStore';
import { InfraJob, WorkerInstance } from './types/orchestration';

const JobsDashboardPage = lazy(() =>
  import('./components/jobs/JobsDashboardPage').then((m) => ({ default: m.JobsDashboardPage }))
);
const WorkersDashboardPage = lazy(() =>
  import('./components/workers/WorkersDashboardPage').then((m) => ({ default: m.WorkersDashboardPage }))
);
const QueuesDashboardPage = lazy(() =>
  import('./components/queues/QueuesDashboardPage').then((m) => ({ default: m.QueuesDashboardPage }))
);
const MonitoringDashboardPage = lazy(() =>
  import('./components/monitoring/MonitoringDashboardPage').then((m) => ({ default: m.MonitoringDashboardPage }))
);
const DocsDashboardPage = lazy(() =>
  import('./components/docs/DocsDashboardPage').then((m) => ({ default: m.DocsDashboardPage }))
);
const SubmitJobModal = lazy(() =>
  import('./components/jobs/SubmitJobModal').then((m) => ({ default: m.SubmitJobModal }))
);
const GuidedTourOverlay = lazy(() =>
  import('./components/common/GuidedTourOverlay').then((m) => ({ default: m.GuidedTourOverlay }))
);
const AuthModal = lazy(() =>
  import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const CommandPalette = lazy(() =>
  import('./components/common/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);

function AppContent() {
  // Default to the landing page matching orchestrix.png
  const [activeTab, setActiveTab] = useState<DashboardNavTab>('landing');
  const [landingSubTab, setLandingSubTab] = useState<NavTab>('features');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedJobFromPalette, setSelectedJobFromPalette] = useState<InfraJob | null>(null);
  const [jobs, setJobs] = useState<InfraJob[]>(jobsStore.getJobs());
  const [workers, setWorkers] = useState<WorkerInstance[]>(jobsStore.getWorkers());
  const [stats, setStats] = useState(jobsStore.getStats());
  const { openAuthModal } = useAuth();

  useEffect(() => {
    const unsub = jobsStore.subscribe(() => {
      setJobs(jobsStore.getJobs());
      setWorkers(jobsStore.getWorkers());
      setStats(jobsStore.getStats());
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleLandingNavigate = (tab: NavTab) => {
    setLandingSubTab(tab);
    if (tab === 'jobs' || tab === 'workers' || tab === 'queues' || tab === 'monitoring') {
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDashboardNavigate = (tab: DashboardNavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunDemo = async () => {
    await jobsStore.runDemoBurst();
    if (activeTab === 'landing' || activeTab === 'docs') {
      setActiveTab('jobs');
    }
  };

  const handleOpenTour = (step = 0) => {
    setTourStep(step);
    setIsTourOpen(true);
  };

  const isLandingView = activeTab === 'landing';

  return (
    <div className="min-h-screen font-sans flex flex-col bg-[#FAF6F0] text-[#241812] selection:bg-[#874924]/20 selection:text-[#241812] overflow-x-hidden">
      {/* 1. If Landing Page View: Show Landing Header matching orchestrix.png */}
      {isLandingView ? (
        <TopNavbar
          currentTab={landingSubTab}
          onNavigate={handleLandingNavigate}
          onOpenDashboard={() => handleDashboardNavigate('jobs')}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      ) : (
        /* 2. If Console View: Show TopNav in matching light theme */
        <TopNav
          activeTab={activeTab}
          onNavigate={handleDashboardNavigate}
          onSubmitJobClick={() => setIsSubmitModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      )}

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col">
        {/* Landing View */}
        {isLandingView && (
          <>
            <HeroSection
              onGetStarted={() => handleDashboardNavigate('jobs')}
              onExploreFeatures={() => {
                const el = document.getElementById('features-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onSelectWorker={() => handleDashboardNavigate('workers')}
            />

            <div id="features-section">
              <FeaturesSection
                onLaunchConsole={() => handleDashboardNavigate('jobs')}
              />
            </div>

            <div id="architecture-section">
              <ArchitectureSection />
            </div>

            <div id="docs-section">
              <DocsSection
                onLaunchConsole={() => handleDashboardNavigate('jobs')}
              />
            </div>
          </>
        )}

        {/* Main Portal Dashboard Views (Code-Split via React.lazy) */}
        {!isLandingView && (
          <Suspense fallback={<PageSuspenseSkeleton />}>
            {activeTab === 'jobs' && (
              <JobsDashboardPage
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                onRunDemo={handleRunDemo}
                selectedJobFromPalette={selectedJobFromPalette}
                onClearPaletteJob={() => setSelectedJobFromPalette(null)}
              />
            )}

            {activeTab === 'workers' && <WorkersDashboardPage />}

            {activeTab === 'queues' && (
              <QueuesDashboardPage
                onRunDemo={handleRunDemo}
                onOpenTour={() => handleOpenTour(1)}
              />
            )}

            {activeTab === 'monitoring' && <MonitoringDashboardPage />}

            {activeTab === 'docs' && <DocsDashboardPage />}
          </Suspense>
        )}
      </main>

      {/* Lazy Modals & Overlays */}
      <Suspense fallback={null}>
        {isSubmitModalOpen && (
          <SubmitJobModal
            isOpen={isSubmitModalOpen}
            onClose={() => setIsSubmitModalOpen(false)}
            onJobCreated={() => {
              setActiveTab('jobs');
            }}
          />
        )}

        {!isLandingView && isTourOpen && (
          <GuidedTourOverlay
            isOpen={isTourOpen}
            currentStep={tourStep}
            activeTab={activeTab}
            workers={workers}
            queuedCount={stats.queued}
            runningCount={stats.running}
            onStepChange={setTourStep}
            onNavigateTab={handleDashboardNavigate}
            onClose={() => setIsTourOpen(false)}
            onSeedBurst={async () => {
              await jobsStore.runDemoBurst();
            }}
            onCrashWorker={async () => {
              return await jobsStore.demoCrashWorker();
            }}
            onRecoverWorkers={async () => {
              await jobsStore.demoRecoverWorker();
            }}
          />
        )}

        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            jobs={jobs}
            onNavigate={handleDashboardNavigate}
            onSelectJob={(job) => {
              setSelectedJobFromPalette(job);
              setActiveTab('jobs');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenSubmitJob={() => setIsSubmitModalOpen(true)}
            onRunDemo={handleRunDemo}
            onCrashWorker={() => jobsStore.demoCrashWorker()}
            onRecoverWorkers={() => jobsStore.demoRecoverWorker()}
            onOpenAuth={() => openAuthModal('login')}
          />
        )}

        <AuthModal />
      </Suspense>

      {/* Footer: Adapts seamlessly between Landing Theme and Console Theme */}
      {isLandingView ? (
        <footer className="w-full border-t border-[#EAE1D4] bg-[#FAF6F0] py-10 sm:py-12 select-none mt-auto">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#5D5044] font-sans">
            <div className="flex items-center gap-3">
              <BronzeLogo size={26} />
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold tracking-[0.12em] text-[#241812] uppercase text-sm">
                  ORCHESTRIX
                </span>
                <span className="text-[#C8BCAC]">|</span>
                <span className="text-[11px] font-sans text-[#5D5044]">AI Workload Orchestration Platform</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-medium text-[#5D5044]">
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-[#241812] transition-colors cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('features-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#241812] transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('architecture-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#241812] transition-colors cursor-pointer"
              >
                Architecture
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('docs-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#241812] transition-colors cursor-pointer"
              >
                Docs
              </button>
              <button
                type="button"
                onClick={() => handleDashboardNavigate('jobs')}
                className="text-[#874924] font-semibold hover:underline cursor-pointer"
              >
                Console & Dashboard →
              </button>
            </div>

            <div className="text-[11px] text-[#5D5044] font-mono text-center sm:text-right">
              Deterministic, zero-starvation scheduling
            </div>
          </div>
        </footer>
      ) : (
        <footer className="w-full border-t border-[#EAE1D4] bg-[#FAF6F0] py-8 select-none mt-auto">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#5D5044]">
            <div className="flex items-center gap-2.5">
              <BronzeLogo size={20} />
              <div className="flex items-baseline gap-2">
                <span className="font-bold tracking-wider text-[#241812] uppercase font-serif">
                  ORCHESTRIX
                </span>
                <span className="hidden sm:inline text-[#C8BCAC]">·</span>
                <span className="text-[11px] text-[#5D5044] font-sans">AI Workload Orchestration Platform</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-sans text-xs">
              <button
                type="button"
                onClick={() => handleDashboardNavigate('landing')}
                className="text-[#874924] font-semibold hover:underline cursor-pointer"
              >
                ← Landing Page
              </button>
              <button
                type="button"
                onClick={() => handleDashboardNavigate('jobs')}
                className={`transition-colors cursor-pointer ${activeTab === 'jobs' ? 'text-[#241812] font-semibold' : 'hover:text-[#241812]'}`}
              >
                Jobs
              </button>
              <button
                type="button"
                onClick={() => handleDashboardNavigate('workers')}
                className={`transition-colors cursor-pointer ${activeTab === 'workers' ? 'text-[#241812] font-semibold' : 'hover:text-[#241812]'}`}
              >
                Workers
              </button>
              <button
                type="button"
                onClick={() => handleDashboardNavigate('queues')}
                className={`transition-colors cursor-pointer ${activeTab === 'queues' ? 'text-[#241812] font-semibold' : 'hover:text-[#241812]'}`}
              >
                Queues
              </button>
              <button
                type="button"
                onClick={() => handleDashboardNavigate('monitoring')}
                className={`transition-colors cursor-pointer ${activeTab === 'monitoring' ? 'text-[#241812] font-semibold' : 'hover:text-[#241812]'}`}
              >
                Monitoring
              </button>
              <button
                type="button"
                onClick={() => handleDashboardNavigate('docs')}
                className={`transition-colors cursor-pointer ${activeTab === 'docs' ? 'text-[#241812] font-semibold' : 'hover:text-[#241812]'}`}
              >
                Docs
              </button>
            </div>

            <div className="text-[10px] text-[#5D5044] font-mono text-center sm:text-right">
              Cluster: us-east-1 · Redis 7.2 · SLA 99.98%
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
