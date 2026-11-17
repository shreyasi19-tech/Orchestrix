// Client API service for Orchestrix backend communication

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('orchestrix_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('orchestrix_auth_token', token);
  } else {
    localStorage.removeItem('orchestrix_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || `HTTP error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ success: boolean; user: any; token: string; message: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    register: (userData: { name: string; email: string; password: string }) =>
      request<{ success: boolean; user: any; token: string; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    demoLogin: (email: string) =>
      request<{ success: boolean; user: any; token: string; message: string }>('/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    me: () =>
      request<{ authenticated: boolean; user: any | null }>('/auth/me'),

    logout: () =>
      request<{ success: boolean; message: string }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    getDemoAccounts: () =>
      request<{ accounts: any[] }>('/auth/demo-accounts'),
  },

  // Users (Admin)
  users: {
    list: () =>
      request<{ users: any[] }>('/users'),

    updateRole: (userId: string, role: 'Admin' | 'DevOps / SRE' | 'Viewer') =>
      request<{ success: boolean; user: any; message: string }>(
        `/users/${encodeURIComponent(userId)}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        }
      ),
  },

  // Jobs
  jobs: {
    list: (params?: { status?: string; priority?: string; type?: string; worker?: string; search?: string; sortBy?: string }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '' && v !== 'All') {
            searchParams.set(k, String(v));
          }
        });
      }
      const qs = searchParams.toString();
      return request<{ jobs: any[]; count: number }>(`/jobs${qs ? `?${qs}` : ''}`);
    },

    getById: (id: string) =>
      request<{ job: any }>(`/jobs/${encodeURIComponent(id)}`),

    submit: (payload: {
      name: string;
      type?: string;
      priority?: string;
      workerConstraints?: string;
      dataSource?: string;
      cpuCores?: string;
      gpuAccelerator?: string;
      ramCapacity?: string;
      timeoutMinutes?: number;
    }) =>
      request<{ success: boolean; job: any; message: string }>('/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    pause: (id: string) =>
      request<{ success: boolean; message: string }>(`/jobs/${encodeURIComponent(id)}/pause`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    resume: (id: string) =>
      request<{ success: boolean; message: string }>(`/jobs/${encodeURIComponent(id)}/resume`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    cancel: (id: string) =>
      request<{ success: boolean; message: string }>(`/jobs/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    fail: (id: string, payload?: { reason?: string; failureType?: string }) =>
      request<{ success: boolean; dlqRecord: any; message: string }>(`/jobs/${encodeURIComponent(id)}/fail`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),

    changePriority: (id: string, priority: string) =>
      request<{ success: boolean; message: string }>(`/jobs/${encodeURIComponent(id)}/priority`, {
        method: 'POST',
        body: JSON.stringify({ priority }),
      }),

    retry: (id: string) =>
      request<{ success: boolean; message: string }>(`/jobs/${encodeURIComponent(id)}/retry`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    getStats: () =>
      request<{ stats: any }>('/jobs/stats/summary'),
  },

  // Workers
  workers: {
    list: () =>
      request<{ workers: any[]; count: number }>('/workers'),

    simulateFailure: (id: string) =>
      request<{ success: boolean; message: string }>(`/workers/${encodeURIComponent(id)}/failure`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    recover: (id: string) =>
      request<{ success: boolean; message: string }>(`/workers/${encodeURIComponent(id)}/recover`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },

  // Queues & DLQ
  queues: {
    getQueued: () =>
      request<{ queuedJobs: any[]; count: number; agingVelocity: string; priorityTiers: number }>('/queues'),

    getDLQ: () =>
      request<{ dlq: any[]; count: number }>('/dlq'),

    retryDLQ: (id: string) =>
      request<{ success: boolean; message: string }>(`/dlq/${encodeURIComponent(id)}/retry`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    purgeDLQ: () =>
      request<{ success: boolean; purgedCount: number; message: string }>('/dlq/purge', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },

  // Monitoring
  monitoring: {
    getData: () =>
      request<{
        summary: any;
        metricsHistory: any[];
        weights: Record<string, number>;
      }>('/monitoring'),
  },

  // Interactive Demo & Guided Tour
  demo: {
    seedBurst: () =>
      request<{ success: boolean; jobs: any[]; count: number; message: string }>('/demo/seed', {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    crashWorker: (workerId?: string) =>
      request<{
        success: boolean;
        crashedWorkerId: string | null;
        crashedWorkerName: string | null;
        affectedJobId: string | null;
        message: string;
      }>('/demo/crash-worker', {
        method: 'POST',
        body: JSON.stringify(workerId ? { workerId } : {}),
      }),

    recoverWorker: (workerId?: string) =>
      request<{
        success: boolean;
        recoveredWorkerIds: string[];
        count: number;
        message: string;
      }>('/demo/recover-worker', {
        method: 'POST',
        body: JSON.stringify(workerId ? { workerId } : {}),
      }),
  },
};
