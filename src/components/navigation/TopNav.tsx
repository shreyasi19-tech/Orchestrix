import React, { useState, useEffect, useRef } from 'react';
import { BronzeLogo } from '../common/BronzeLogo';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { 
  ChevronDown, 
  Activity, 
  LogOut, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  LogIn, 
  BookOpen, 
  FlaskConical,
  AlertTriangle,
  X,
  Menu,
  Search
} from 'lucide-react';
import { jobsStore } from '../../services/jobsStore';
import { useAuth } from '../../context/AuthContext';
import { RoleManagementModal } from '../auth/RoleManagementModal';

export type DashboardNavTab = 'landing' | 'jobs' | 'workers' | 'queues' | 'monitoring' | 'docs';

interface TopNavProps {
  activeTab: DashboardNavTab;
  onNavigate: (tab: DashboardNavTab) => void;
  onSubmitJobClick: () => void;
  onOpenCommandPalette: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onNavigate,
  onOpenCommandPalette,
}) => {
  const [stats, setStats] = useState(jobsStore.getStats());
  const [dlqCount, setDlqCount] = useState(jobsStore.getDLQ().length);
  const [crashedCount, setCrashedCount] = useState(
    jobsStore.getWorkers().filter((w) => w.status === 'crashed').length
  );
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const [showSimTooltip, setShowSimTooltip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout, openAuthModal, demoAccounts, quickDemoLogin } = useAuth();

  useEffect(() => {
    const unsub = jobsStore.subscribe(() => {
      setStats(jobsStore.getStats());
      setDlqCount(jobsStore.getDLQ().length);
      setCrashedCount(jobsStore.getWorkers().filter((w) => w.status === 'crashed').length);
      const err = jobsStore.getLastError();
      if (err) {
        setErrorBanner(err);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleMobileNav = (tab: DashboardNavTab) => {
    setMobileMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#EAE1D4] select-none shadow-xs">
      <div className="max-w-[1600px] mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Lockup & Desktop Nav */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            aria-label="Go to Orchestrix Landing Page"
            className="flex items-center gap-2 cursor-pointer group shrink-0 text-left"
          >
            <BronzeLogo size={24} />
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-xs sm:text-sm tracking-[0.14em] text-[#241812] group-hover:text-[#874924] transition-colors">
                ORCHESTRIX
              </span>
              <span className="text-[10px] font-mono text-[#5D5044] uppercase tracking-wider hidden xl:inline">
                v2.4
              </span>
            </div>
          </button>

          <div className="h-4 w-px bg-[#EAE1D4] hidden lg:block shrink-0" />

          {/* Desktop Navigation Items */}
          <nav aria-label="Console navigation" className="hidden lg:flex items-center gap-1 text-xs font-sans">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'landing'
                  ? 'bg-[#FAF6F0] text-[#241812] border border-[#EAE1D4] shadow-xs font-semibold'
                  : 'text-[#5D5044] hover:text-[#241812] hover:bg-[#F5EFE6]'
              }`}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'jobs'
                  ? 'bg-[#FAF6F0] text-[#241812] border border-[#EAE1D4] shadow-xs font-semibold'
                  : 'text-[#5D5044] hover:text-[#241812] hover:bg-[#F5EFE6]'
              }`}
            >
              <span>Jobs</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[#F4EFEA] text-[#874924] border border-[#EAE1D4]">
                {stats.running}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('workers')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'workers'
                  ? 'bg-[#FAF6F0] text-[#241812] border border-[#EAE1D4] shadow-xs font-semibold'
                  : 'text-[#5D5044] hover:text-[#241812] hover:bg-[#F5EFE6]'
              }`}
            >
              <span>Workers</span>
              {crashedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse" aria-label="Crashed worker alert" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('queues')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'queues'
                  ? 'bg-[#FAF6F0] text-[#241812] border border-[#EAE1D4] shadow-xs font-semibold'
                  : 'text-[#5D5044] hover:text-[#241812] hover:bg-[#F5EFE6]'
              }`}
            >
              <span>Queues</span>
              {stats.queued > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
              )}
              {dlqCount > 0 && (
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3] font-bold">
                  DLQ <AnimatedCounter value={dlqCount} showDelta={false} />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('monitoring')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'monitoring'
                  ? 'bg-[#FAF6F0] text-[#241812] border border-[#EAE1D4] shadow-xs font-semibold'
                  : 'text-[#5D5044] hover:text-[#241812] hover:bg-[#F5EFE6]'
              }`}
            >
              Monitoring
            </button>

            <button
              type="button"
              onClick={() => onNavigate('docs')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'bg-[#FAF6F0] text-[#241812] border border-[#EAE1D4] shadow-xs font-semibold'
                  : 'text-[#5D5044] hover:text-[#241812] hover:bg-[#F5EFE6]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#874924]" />
              <span>Architecture &amp; Docs</span>
            </button>
          </nav>
        </div>

        {/* Right: Command Palette, Status, User Menu & Mobile Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open command palette (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#FAF6F0] hover:bg-[#F2EAE0] border border-[#EAE1D4] text-xs font-mono text-[#5D5044] hover:text-[#241812] transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#874924]" />
            <span className="hidden sm:inline text-[11px]">Search</span>
            <kbd className="hidden md:inline px-1.5 py-0.2 rounded bg-white border border-[#DFD3C3] text-[10px] text-[#5D5044]">
              Ctrl+K
            </kbd>
          </button>

          {/* SIMULATION MODE BADGE */}
          <div
            className="relative hidden xl:block"
            onMouseEnter={() => setShowSimTooltip(true)}
            onMouseLeave={() => setShowSimTooltip(false)}
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF4ED] border border-[#E8D6C5] text-xs font-mono text-[#874924] shadow-xs cursor-help">
              <FlaskConical className="w-3.5 h-3.5 text-[#C25E24] animate-pulse" />
              <span className="font-semibold text-[11px] tracking-wide">SIMULATION MODE</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#F3E5D7] text-[#874924] border border-[#DFC3A8] font-bold">
                ACTIVE
              </span>
            </div>

            {showSimTooltip && (
              <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-white border border-[#EAE1D4] rounded-lg shadow-xl z-50 text-xs font-sans animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-[#874924] font-semibold font-mono text-xs pb-1.5 mb-1.5 border-b border-[#F0E6D8]">
                  <FlaskConical className="w-4 h-4 text-[#C25E24]" />
                  <span>Synthetic Telemetry Simulation Mode</span>
                </div>
                <p className="text-[11px] text-[#5D5044] leading-relaxed">
                  Cluster workloads, throughput graphs, and worker load statistics are currently operating in <strong>Simulation Mode</strong>. The background scheduler actively ages priority queues and processes synthetic ML/CV jobs.
                </p>
                <div className="mt-2 text-[10px] font-mono text-[#874924] bg-[#FAF6F0] p-1.5 rounded border border-[#EAE1D4]">
                  Routing Engine: Real Weighted Affinity + DLQ Isolation
                </div>
              </div>
            )}
          </div>

          {/* System Status Indicator with hover breakdown */}
          <div
            className="relative hidden md:block"
            onMouseEnter={() => setShowStatusTooltip(true)}
            onMouseLeave={() => setShowStatusTooltip(false)}
          >
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white border border-[#EAE1D4] text-xs font-mono text-[#5D5044] hover:border-[#C8BCAC] cursor-pointer transition-colors shadow-xs">
              <span className={`w-2 h-2 rounded-full ${crashedCount > 0 ? 'bg-[#E11D48] animate-pulse' : 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse'}`} />
              <span className="text-[11px] text-[#241812] font-medium">
                {crashedCount > 0 ? `${crashedCount} Alert` : 'System Status'}
              </span>
              <span className={`text-[10px] font-semibold hidden xl:inline ${crashedCount > 0 ? 'text-[#BE123C]' : 'text-[#047857]'}`}>
                {crashedCount > 0 ? '● Degraded' : '● 99.98%'}
              </span>
            </div>

            {showStatusTooltip && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-white border border-[#EAE1D4] rounded-lg shadow-xl z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0E6D8]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${crashedCount > 0 ? 'bg-[#E11D48]' : 'bg-[#10B981]'}`} />
                    <span className="font-semibold text-[#241812]">
                      {crashedCount > 0 ? 'Worker Node Degraded' : 'All Clusters Operational'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#5D5044]">us-east-1</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-[#5D5044]">
                  <div className="flex justify-between">
                    <span className="text-[#5D5044]">Redis Queue Latency:</span>
                    <span className="text-[#241812] font-medium">0.82 ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5D5044]">Active Worker Leases:</span>
                    <span className={`${crashedCount > 0 ? 'text-[#BE123C]' : 'text-[#047857]'} font-medium`}>
                      {4 - crashedCount} / 4 Nodes Online
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5D5044]">Active Workloads:</span>
                    <span className="text-[#0369A1] font-medium">{stats.running} running, {stats.queued} queued</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5D5044]">Heartbeat Lease Period:</span>
                    <span className="text-[#241812]">3.0s lease TTL</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#EAE1D4] hidden sm:block" />

          {/* User Authentication Menu */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="Open user account menu"
                aria-expanded={showUserMenu}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-md hover:bg-[#FAF6F0] border border-transparent hover:border-[#EAE1D4] transition-all text-left cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#8C5229] to-[#3B2211] text-[#F5D5B2] flex items-center justify-center font-mono text-[10px] font-bold border border-[#A26438]/40 shadow-xs">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-medium text-[#241812] leading-none mb-0.5 truncate max-w-[110px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#874924] font-semibold leading-none">
                    {user.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#867568]" />
              </button>

              {/* Profile Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 p-1.5 bg-white border border-[#EAE1D4] rounded-xl shadow-xl z-50 text-xs font-sans animate-in fade-in duration-100">
                  <div className="px-3 py-2 border-b border-[#F0E6D8] mb-1">
                    <div className="font-semibold text-[#241812]">{user.name}</div>
                    <div className="text-[11px] font-mono text-[#867568] truncate">{user.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#FAF4ED] text-[#874924] border border-[#E8D6C5]">
                        {user.role}
                      </span>
                      <span className="text-[9px] font-mono text-[#059669] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        Active Session
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('workers');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[#5D5044] hover:bg-[#FAF6F0] hover:text-[#241812] text-left transition-colors cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5 text-[#867568]" />
                      <span>Worker Cluster Fleet</span>
                    </button>

                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('queues');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[#5D5044] hover:bg-[#FAF6F0] hover:text-[#241812] text-left transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#867568]" />
                      <span>Priority Queues & DLQ</span>
                    </button>

                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('monitoring');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[#5D5044] hover:bg-[#FAF6F0] hover:text-[#241812] text-left transition-colors cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 text-[#867568]" />
                      <span>Telemetry & Metrics</span>
                    </button>

                    {user.role === 'Admin' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowRoleModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[#874924] hover:bg-[#FAF4ED] text-left transition-colors cursor-pointer font-medium"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C15F3D]" />
                        <span>Manage Operator Roles</span>
                      </button>
                    )}
                  </div>

                  {/* Switch to another dev demo account (only shown in development mode) */}
                  {demoAccounts.length > 0 && (
                    <div className="border-t border-[#F0E6D8] mt-1 pt-1.5 px-2">
                      <span className="text-[10px] font-mono text-[#5D5044] block mb-1">
                        Switch Active Operator (Dev):
                      </span>
                      <div className="space-y-1">
                        {demoAccounts.map(acc => (
                          <button
                            key={acc.email}
                            type="button"
                            onClick={async () => {
                              await quickDemoLogin(acc.email);
                              setShowUserMenu(false);
                            }}
                            className={`w-full py-1 px-2 rounded text-[11px] font-mono text-left flex items-center justify-between transition-colors cursor-pointer ${
                              user.email.toLowerCase() === acc.email.toLowerCase()
                                ? 'bg-[#FAF4ED] text-[#874924] font-semibold'
                                : 'text-[#5D5044] hover:bg-[#FAF6F0] hover:text-[#241812]'
                            }`}
                          >
                            <span className="truncate">{acc.name}</span>
                            <span className="text-[9px] text-[#5D5044]">{acc.role.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#F0E6D8] mt-1.5 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[#BE123C] hover:bg-[#FFF1F2] text-left transition-colors cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-2.5 sm:px-3 py-1.5 rounded-md bg-white hover:bg-[#FAF6F0] border border-[#EAE1D4] text-[#241812] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-[#874924]" />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-1.5 rounded-md bg-[#FAF6F0] border border-[#EAE1D4] text-[#241812] hover:bg-[#F2EAE0] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer (< lg) */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile console navigation"
          className="lg:hidden border-t border-[#EAE1D4] bg-white px-3.5 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150"
        >
          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
            <button
              type="button"
              onClick={() => handleMobileNav('landing')}
              className={`px-3 py-2 rounded-lg text-left font-medium cursor-pointer border ${
                activeTab === 'landing'
                  ? 'bg-[#FAF6F0] border-[#874924] text-[#241812] font-semibold'
                  : 'bg-white border-[#EAE1D4] text-[#5D5044]'
              }`}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => handleMobileNav('jobs')}
              className={`px-3 py-2 rounded-lg text-left font-medium cursor-pointer border flex items-center justify-between ${
                activeTab === 'jobs'
                  ? 'bg-[#FAF6F0] border-[#874924] text-[#241812] font-semibold'
                  : 'bg-white border-[#EAE1D4] text-[#5D5044]'
              }`}
            >
              <span>Jobs</span>
              <span className="font-mono text-[10px] text-[#874924]">{stats.running}</span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileNav('workers')}
              className={`px-3 py-2 rounded-lg text-left font-medium cursor-pointer border flex items-center justify-between ${
                activeTab === 'workers'
                  ? 'bg-[#FAF6F0] border-[#874924] text-[#241812] font-semibold'
                  : 'bg-white border-[#EAE1D4] text-[#5D5044]'
              }`}
            >
              <span>Workers</span>
              {crashedCount > 0 && (
                <span className="text-[10px] font-mono text-[#BE123C] font-bold">{crashedCount} alert</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleMobileNav('queues')}
              className={`px-3 py-2 rounded-lg text-left font-medium cursor-pointer border flex items-center justify-between ${
                activeTab === 'queues'
                  ? 'bg-[#FAF6F0] border-[#874924] text-[#241812] font-semibold'
                  : 'bg-white border-[#EAE1D4] text-[#5D5044]'
              }`}
            >
              <span>Queues &amp; DLQ</span>
              {dlqCount > 0 && (
                <span className="text-[10px] font-mono text-[#BE123C] font-bold">{dlqCount}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleMobileNav('monitoring')}
              className={`px-3 py-2 rounded-lg text-left font-medium cursor-pointer border ${
                activeTab === 'monitoring'
                  ? 'bg-[#FAF6F0] border-[#874924] text-[#241812] font-semibold'
                  : 'bg-white border-[#EAE1D4] text-[#5D5044]'
              }`}
            >
              Monitoring
            </button>

            <button
              type="button"
              onClick={() => handleMobileNav('docs')}
              className={`px-3 py-2 rounded-lg text-left font-medium cursor-pointer border ${
                activeTab === 'docs'
                  ? 'bg-[#FAF6F0] border-[#874924] text-[#241812] font-semibold'
                  : 'bg-white border-[#EAE1D4] text-[#5D5044]'
              }`}
            >
              Architecture &amp; Docs
            </button>
          </div>

          <div className="pt-2 border-t border-[#EAE1D4] flex items-center justify-between text-[11px] font-mono text-[#5D5044]">
            <span className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-[#874924]" />
              <span>Simulation Mode Active</span>
            </span>
            <span className="text-[#047857] font-semibold">
              {4 - crashedCount}/4 Nodes
            </span>
          </div>
        </nav>
      )}

      {/* RBAC Error Banner */}
      {errorBanner && (
        <div
          role="alert"
          className="bg-[#FFF1F2] border-b border-[#FECDD3] px-4 py-2 flex items-center justify-between text-xs text-[#9F1239] font-mono animate-in slide-in-from-top duration-150"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-[#BE123C] shrink-0" />
            <span className="font-semibold text-[#9F1239] shrink-0">Authorization Notification:</span>
            <span className="truncate">{errorBanner}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss authorization notification"
            onClick={() => {
              setErrorBanner(null);
              jobsStore.clearLastError();
            }}
            className="p-1 rounded hover:bg-[#FFE4E6] text-[#9F1239] cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <RoleManagementModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
      />
    </header>
  );
};
