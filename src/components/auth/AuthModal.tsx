import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BronzeLogo } from '../common/BronzeLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    register,
    loginWithGoogle,
    quickDemoLogin,
    demoAccounts,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    const res = await loginWithGoogle();
    setIsSubmitting(false);
    if (!res.success) {
      setError(res.error || 'Google authentication was not completed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (authModalMode === 'login') {
      const res = await login(email, password);
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || 'Invalid email or password.');
      }
    } else {
      if (!name.trim()) {
        setError('Please enter your full name or callsign.');
        setIsSubmitting(false);
        return;
      }
      const res = await register(name, email, password);
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || 'Failed to create account.');
      }
    }
  };

  const handleDemoClick = async (demoEmail: string) => {
    setError(null);
    setIsSubmitting(true);
    const res = await quickDemoLogin(demoEmail);
    setIsSubmitting(false);
    if (!res.success) {
      setError(res.error || 'Failed to authenticate with demo credentials.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={closeAuthModal}
    >
      <div
        className="w-full max-w-md bg-white border border-[#EAE1D4] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#241812] relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 pb-4 border-b border-[#EAE1D4] bg-[#FAF6F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BronzeLogo size={24} />
            <div>
              <span className="font-mono text-[10px] tracking-wider uppercase text-[#874924] block font-semibold">
                SECURITY GATEWAY
              </span>
              <h2 id="auth-modal-title" className="font-bold text-sm text-[#241812]">
                {authModalMode === 'login' ? 'Authenticate Operator' : 'Register Operator Credentials'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close authentication modal"
            className="p-1.5 rounded-md text-[#5D5044] hover:text-[#241812] hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 m-4 mb-2 bg-[#FAF6F0] rounded-lg border border-[#EAE1D4] text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('login');
              setError(null);
            }}
            className={`py-1.5 rounded-md transition-all font-medium cursor-pointer ${
              authModalMode === 'login'
                ? 'bg-white text-[#241812] shadow-xs border border-[#EAE1D4] font-semibold'
                : 'text-[#736558] hover:text-[#241812]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('register');
              setError(null);
            }}
            className={`py-1.5 rounded-md transition-all font-medium cursor-pointer ${
              authModalMode === 'register'
                ? 'bg-white text-[#241812] shadow-xs border border-[#EAE1D4] font-semibold'
                : 'text-[#736558] hover:text-[#241812]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] text-xs font-mono flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-tight">{error}</div>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-[#FAF6F0] border border-[#EAE1D4] text-[#241812] text-xs font-mono font-medium flex items-center justify-center gap-2.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google (Firebase)</span>
          </button>
        </div>

        {/* Divider */}
        <div className="px-4 pt-3 flex items-center gap-2">
          <div className="flex-1 h-px bg-[#EAE1D4]" />
          <span className="text-[10px] font-mono text-[#5D5044] uppercase">Or with email</span>
          <div className="flex-1 h-px bg-[#EAE1D4]" />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {authModalMode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-[11px] font-mono text-[#5D5044] mb-1">
                Full Name / Operator Callsign
              </label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-[#5D5044] absolute left-3 top-3 pointer-events-none" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  className="w-full bg-[#FAF6F0] border border-[#EAE1D4] focus:border-[#874924] rounded-lg py-2 pl-9 pr-3 text-xs text-[#241812] placeholder-[#6B5D51] outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-[11px] font-mono text-[#5D5044] mb-1">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#5D5044] absolute left-3 top-3 pointer-events-none" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@orchestrix.io"
                className="w-full bg-[#FAF6F0] border border-[#EAE1D4] focus:border-[#874924] rounded-lg py-2 pl-9 pr-3 text-xs text-[#241812] placeholder-[#6B5D51] outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-[11px] font-mono text-[#5D5044] mb-1">
              Secret Passkey
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#5D5044] absolute left-3 top-3 pointer-events-none" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={authModalMode === 'register' ? 6 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#FAF6F0] border border-[#EAE1D4] focus:border-[#874924] rounded-lg py-2 pl-9 pr-3 text-xs text-[#241812] placeholder-[#6B5D51] outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {authModalMode === 'register' && (
            <div className="p-2.5 rounded-lg bg-[#FAF6F0] border border-[#EAE1D4] flex items-start gap-2 text-[11px] text-[#5D5044]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0369A1] shrink-0 mt-0.5" />
              <span>
                New accounts are provisioned with <strong className="text-[#241812]">Viewer</strong> access. A cluster Admin can elevate permissions later.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 mt-2 rounded-lg bg-[#C15F3D] hover:bg-[#A84F31] active:scale-[0.99] text-white text-xs font-mono font-medium flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{authModalMode === 'login' ? 'Sign In to Cluster' : 'Initialize Credentials'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins Section (Rendered only in NODE_ENV=development when demo accounts are seeded) */}
        {demoAccounts.length > 0 && (
          <div className="p-4 pt-3 border-t border-[#EAE1D4] bg-[#FAF6F0]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-[#874924] uppercase tracking-wider flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-[#874924]" />
                <span>Development Sandbox Accounts</span>
              </span>
              <span className="text-[9px] font-mono text-[#5D5044]">1-Click Dev Login</span>
            </div>
            <p className="text-[10px] text-[#5D5044] font-sans mb-2">
              Select a role to verify permission boundaries. <strong>Viewer</strong> has read-only access (mutations return 403), <strong>DevOps</strong> can manage workloads, and <strong>Admin</strong> has root cluster control.
            </p>

            <div className="grid grid-cols-1 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoClick(acc.email)}
                  disabled={isSubmitting}
                  className="w-full p-2 rounded-lg bg-white hover:bg-[#F5EFEB] border border-[#EAE1D4] text-left flex items-center justify-between transition-colors group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded border flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                        acc.role === 'Admin'
                          ? 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]'
                          : acc.role === 'Viewer'
                          ? 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]'
                          : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                      }`}
                    >
                      {acc.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#241812] group-hover:text-[#874924] transition-colors truncate">
                        {acc.name}{' '}
                        <span className="font-mono text-[10px] text-[#5D5044]">({acc.email})</span>
                      </div>
                      <div className="text-[10px] text-[#5D5044] font-sans truncate">
                        {acc.description ||
                          (acc.role === 'Admin'
                            ? 'Root cluster control & node actions'
                            : acc.role === 'Viewer'
                            ? 'Read-only metrics & jobs'
                            : 'Workload scheduling & remediation')}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border shrink-0 ${
                      acc.role === 'Admin'
                        ? 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]'
                        : acc.role === 'Viewer'
                        ? 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]'
                        : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                    }`}
                  >
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
