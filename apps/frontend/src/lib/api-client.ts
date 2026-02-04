import type {
  ResearchSession,
  CreateSessionRequest,
  Synthesis,
  UserFeedback,
} from '@deep-search/shared';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Sessions
  createSession: async (request: CreateSessionRequest) => {
    return fetchJson<{ session: ResearchSession }>(`${API_BASE}/research/sessions`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  listSessions: async (limit = 20, offset = 0) => {
    return fetchJson<{ sessions: ResearchSession[] }>(
      `${API_BASE}/research/sessions?limit=${limit}&offset=${offset}`
    );
  },

  getSession: async (sessionId: string) => {
    return fetchJson<{ session: ResearchSession }>(`${API_BASE}/research/sessions/${sessionId}`);
  },

  deleteSession: async (sessionId: string) => {
    await fetch(`${API_BASE}/research/sessions/${sessionId}`, { method: 'DELETE' });
  },

  resumeSession: async (sessionId: string) => {
    return fetchJson<{ session: ResearchSession }>(
      `${API_BASE}/research/sessions/${sessionId}/resume`,
      { method: 'POST' }
    );
  },

  pauseSession: async (sessionId: string) => {
    return fetchJson<{ session: ResearchSession }>(
      `${API_BASE}/research/sessions/${sessionId}/pause`,
      { method: 'POST' }
    );
  },

  submitFeedback: async (
    sessionId: string,
    type: UserFeedback['type'],
    content: string
  ) => {
    return fetchJson<{ success: boolean }>(
      `${API_BASE}/research/sessions/${sessionId}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify({ type, content }),
      }
    );
  },

  finishSession: async (sessionId: string) => {
    return fetchJson<{ success: boolean }>(
      `${API_BASE}/research/sessions/${sessionId}/finish`,
      { method: 'POST' }
    );
  },

  // Synthesis
  getSynthesis: async (sessionId: string) => {
    return fetchJson<{ synthesis: Synthesis }>(
      `${API_BASE}/research/sessions/${sessionId}/synthesis`
    );
  },

  getSynthesisHistory: async (sessionId: string) => {
    return fetchJson<{ syntheses: Synthesis[] }>(
      `${API_BASE}/research/sessions/${sessionId}/synthesis/history`
    );
  },

  // Export
  exportSession: async (sessionId: string, format: 'markdown' | 'json' = 'markdown') => {
    const response = await fetch(
      `${API_BASE}/research/sessions/${sessionId}/export?format=${format}`
    );
    if (format === 'markdown') {
      return response.text();
    }
    return response.json();
  },

  // Config
  getSettings: async () => {
    return fetchJson<{
      llm: { provider: string; model: string };
      search: { provider: string };
      research: { defaultMaxAgents: number; defaultMaxSearchesPerAgent: number; defaultDepthLevel: string };
    }>(`${API_BASE}/config/settings`);
  },
};
