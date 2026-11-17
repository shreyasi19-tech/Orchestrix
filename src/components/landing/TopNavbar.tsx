import React, { useState } from 'react';
import { BronzeLogo } from '../common/BronzeLogo';
import { Menu, Search, X } from 'lucide-react';

export type NavTab = 'overview' | 'features' | 'architecture' | 'docs' | 'jobs' | 'workers' | 'queues' | 'monitoring';

interface TopNavbarProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenDashboard?: () => void;
  onOpenCommandPalette?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenDashboard,
  onOpenCommandPalette,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (tab: NavTab, id?: string) => {
    setMobileMenuOpen(false);
    onNavigate(tab);
    if (id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-5 z-30 select-none">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Lockup */}
        <button
          type="button"
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0 text-left"
        >
          <BronzeLogo size={30} />
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="font-serif font-bold text-base sm:text-xl tracking-[0.14em] text-[#241812] uppercase group-hover:text-[#844722] transition-colors leading-none">
              ORCHESTRIX
            </span>
            <span className="text-[#C8BCAC] font-light text-base hidden md:inline">|</span>
            <span className="text-[10px] sm:text-[10.5px] font-sans font-medium tracking-[0.18em] text-[#5D5044] uppercase hidden md:inline">
              AI WORKLOAD ORCHESTRATION PLATFORM
            </span>
          </div>
        </button>

        {/* Desktop Main Navigation */}
        <nav aria-label="Primary landing navigation" className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-sans">
          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className={`transition-colors relative py-1 text-sm font-medium cursor-pointer ${
              currentTab === 'overview'
                ? 'text-[#241812]'
                : 'text-[#5D5044] hover:text-[#241812]'
            }`}
          >
            Home
            {currentTab === 'overview' && (
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#874924] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('features', 'features-section')}
            className={`transition-colors relative py-1 text-sm font-medium cursor-pointer ${
              currentTab === 'features'
                ? 'text-[#241812]'
                : 'text-[#5D5044] hover:text-[#241812]'
            }`}
          >
            Features
            {currentTab === 'features' && (
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#874924] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('architecture', 'architecture-section')}
            className={`transition-colors relative py-1 text-sm font-medium cursor-pointer ${
              currentTab === 'architecture'
                ? 'text-[#241812]'
                : 'text-[#5D5044] hover:text-[#241812]'
            }`}
          >
            Architecture
            {currentTab === 'architecture' && (
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#874924] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('docs', 'docs-section')}
            className={`transition-colors relative py-1 text-sm font-medium cursor-pointer ${
              currentTab === 'docs'
                ? 'text-[#241812]'
                : 'text-[#5D5044] hover:text-[#241812]'
            }`}
          >
            Docs
            {currentTab === 'docs' && (
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#874924] rounded-full" />
            )}
          </button>
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open command palette (Ctrl+K)"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-[#DDD2C4] bg-white/80 hover:bg-[#F2ECE2] text-[#5D5044] hover:text-[#241812] text-xs font-mono transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#874924]" />
              <span className="hidden lg:inline">Ctrl+K</span>
            </button>
          )}

          {/* GitHub Pill Button */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Orchestrix on GitHub"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#DDD2C4] bg-transparent hover:bg-[#F2ECE2] active:scale-[0.98] text-[#241812] text-xs sm:text-[13px] font-sans font-medium transition-all cursor-pointer shadow-2xs"
          >
            <svg aria-hidden="true" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>

          {/* Quick Console Launcher */}
          <button
            type="button"
            onClick={onOpenDashboard || (() => onNavigate('jobs'))}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#874924] hover:bg-[#723B19] active:scale-[0.98] text-white text-xs font-sans font-medium transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <span>Console</span>
            <span className="text-xs">→</span>
          </button>

          {/* Mobile Menu Toggle (< md) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? 'Close landing navigation menu' : 'Open landing navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-1.5 rounded-full border border-[#DDD2C4] bg-white/80 text-[#241812] hover:bg-[#F2ECE2] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation (< md) */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile landing navigation"
          className="md:hidden mt-3 p-3 rounded-2xl bg-white border border-[#EAE1D4] shadow-lg grid grid-cols-2 gap-2 text-xs font-sans"
        >
          <button
            type="button"
            onClick={() => scrollToSection('overview')}
            className="px-3 py-2 rounded-lg text-left font-medium text-[#241812] bg-[#FAF6F0] border border-[#EAE1D4] cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('features', 'features-section')}
            className="px-3 py-2 rounded-lg text-left font-medium text-[#5D5044] hover:bg-[#FAF6F0] border border-[#EAE1D4] cursor-pointer"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('architecture', 'architecture-section')}
            className="px-3 py-2 rounded-lg text-left font-medium text-[#5D5044] hover:bg-[#FAF6F0] border border-[#EAE1D4] cursor-pointer"
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('docs', 'docs-section')}
            className="px-3 py-2 rounded-lg text-left font-medium text-[#5D5044] hover:bg-[#FAF6F0] border border-[#EAE1D4] cursor-pointer"
          >
            Docs
          </button>
        </nav>
      )}
    </header>
  );
};

