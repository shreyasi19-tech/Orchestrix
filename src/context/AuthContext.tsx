import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getAuthToken, setAuthToken } from '../services/api';
import {
  auth,
  signInWithGoogle as firebaseGoogleSignIn,
  signInWithEmail as firebaseEmailSignIn,
  registerWithEmail as firebaseEmailRegister,
  signOutFirebase,
  syncUserProfile,
  UserProfileData,
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export type UserRole = 'Admin' | 'DevOps / SRE' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  photoURL?: string;
  createdAt?: string;
  lastLoginAt?: string;
  isFirebaseUser?: boolean;
}

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  description: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  demoAccounts: DemoAccount[];
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  quickDemoLogin: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  // Fetch dev-only demo accounts metadata (empty outside NODE_ENV=development)
  useEffect(() => {
    api.auth
      .getDemoAccounts()
      .then((res) => {
        if (Array.isArray(res.accounts)) {
          setDemoAccounts(res.accounts);
        }
      })
      .catch(() => {
        setDemoAccounts([]);
      });
  }, []);

  const resolveServerUser = useCallback(
    async (idToken: string, fallbackProfile?: UserProfileData): Promise<User | null> => {
      setAuthToken(idToken);
      setToken(idToken);
      try {
        const me = await api.auth.me();
        if (me.authenticated && me.user) {
          return { ...me.user, isFirebaseUser: !!fallbackProfile };
        }
      } catch {
        // Fallback to profile if backend is temporarily unreachable
      }

      if (fallbackProfile) {
        return {
          id: fallbackProfile.uid,
          name: fallbackProfile.displayName || 'Operator',
          email: fallbackProfile.email || '',
          role: (fallbackProfile.role as UserRole) || 'Viewer',
          avatarUrl: fallbackProfile.photoURL,
          photoURL: fallbackProfile.photoURL,
          createdAt: fallbackProfile.createdAt,
          lastLoginAt: fallbackProfile.lastLoginAt,
          isFirebaseUser: true,
        };
      }
      return null;
    },
    []
  );

  // Listen to Firebase Auth state & local server session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const profile = await syncUserProfile(firebaseUser);
          const resolved = await resolveServerUser(idToken, profile);
          setUser(resolved);
        } catch (err) {
          console.warn('Failed to resolve Firebase user profile:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        const existingToken = getAuthToken();
        if (existingToken && existingToken.startsWith('otx_')) {
          api.auth
            .me()
            .then((res) => {
              if (res.authenticated && res.user) {
                setUser({ ...res.user, isFirebaseUser: false });
              } else {
                setAuthToken(null);
                setToken(null);
                setUser(null);
              }
            })
            .catch(() => {
              setAuthToken(null);
              setToken(null);
              setUser(null);
            })
            .finally(() => setIsLoading(false));
        } else {
          if (existingToken) {
            setAuthToken(null);
            setToken(null);
          }
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [resolveServerUser]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.me();
      if (res.authenticated && res.user) {
        setUser((prev) => ({ ...res.user, isFirebaseUser: prev?.isFirebaseUser ?? false }));
      }
    } catch {
      // Ignore refresh failures
    }
  }, []);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Sign in with Email / Password (Firebase Auth with local backend fallback)
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        const { user: profile, token: idToken } = await firebaseEmailSignIn(email, password);
        const resolved = await resolveServerUser(idToken, profile);
        setUser(resolved);
        setIsAuthModalOpen(false);
        return { success: true };
      } catch (fbErr: any) {
        const res = await api.auth.login({ email, password });
        if (res.success && res.token && res.user) {
          setAuthToken(res.token);
          setToken(res.token);
          setUser({ ...res.user, isFirebaseUser: false });
          setIsAuthModalOpen(false);
          return { success: true };
        }
        return { success: false, error: fbErr.message || 'Invalid credentials' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication error.' };
    }
  };

  // Sign up with Email / Password — new users always receive the Viewer role
  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user: profile, token: idToken } = await firebaseEmailRegister(name, email, password);
      const resolved = await resolveServerUser(idToken, profile);
      setUser(resolved);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (fbErr: any) {
      try {
        const res = await api.auth.register({ name, email, password });
        if (res.success && res.token && res.user) {
          setAuthToken(res.token);
          setToken(res.token);
          setUser({ ...res.user, isFirebaseUser: false });
          setIsAuthModalOpen(false);
          return { success: true };
        }
        return { success: false, error: fbErr.message || 'Registration failed' };
      } catch (err: any) {
        return { success: false, error: err.message || fbErr.message || 'Failed to create account.' };
      }
    }
  };

  // Sign in with Firebase Google Popup
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user: profile, token: idToken } = await firebaseGoogleSignIn();
      const resolved = await resolveServerUser(idToken, profile);
      setUser(resolved);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.warn('Google Sign-In prompt closed or canceled:', err);
      return {
        success: false,
        error: err.message || 'Google authentication was canceled or failed.',
      };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOutFirebase();
    } catch {
      // Ignore
    }
    try {
      await api.auth.logout();
    } catch {
      // Ignore
    }
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  // Development-only demo login via server session endpoint
  const quickDemoLogin = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.auth.demoLogin(email);
      if (res.success && res.token && res.user) {
        setAuthToken(res.token);
        setToken(res.token);
        setUser({ ...res.user, isFirebaseUser: false });
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Demo authentication failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Demo login unavailable.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        demoAccounts,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        setAuthModalMode,
        login,
        register,
        loginWithGoogle,
        logout,
        quickDemoLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
