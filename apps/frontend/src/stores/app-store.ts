import { create } from 'zustand';
import type { ResearchSession, Synthesis, AgentState, ServerEvent } from '@deep-search/shared';
import { api } from '@/lib/api-client';
import { wsClient } from '@/lib/websocket';

interface AppState {
  // Sessions
  sessions: ResearchSession[];
  currentSession: ResearchSession | null;
  currentSynthesis: Synthesis | null;
  isLoading: boolean;
  error: string | null;

  // Theme
  theme: 'light' | 'dark';

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (topic: string, config?: any) => Promise<ResearchSession>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  submitFeedback: (type: 'guidance' | 'approval' | 'stop' | 'redirect', content: string) => Promise<void>;
  finishSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;

  // WebSocket handlers
  initializeWebSocket: () => void;
  handleServerEvent: (event: ServerEvent) => void;

  // Theme
  toggleTheme: () => void;

  // Internal
  setError: (error: string | null) => void;
  updateSession: (updates: Partial<ResearchSession>) => void;
  updateAgentState: (agentId: string, updates: Partial<AgentState>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [],
  currentSession: null,
  currentSynthesis: null,
  isLoading: false,
  error: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { sessions } = await api.listSessions();
      set({ sessions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createSession: async (topic: string, config?: any) => {
    set({ isLoading: true, error: null });
    try {
      const { session } = await api.createSession({ topic, config });
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSession: session,
        isLoading: false,
      }));

      // Join WebSocket room
      wsClient.joinSession(session.id);

      return session;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [{ session }, synthesisResult] = await Promise.all([
        api.getSession(sessionId),
        api.getSynthesis(sessionId).catch(() => null),
      ]);

      set({
        currentSession: session,
        currentSynthesis: synthesisResult?.synthesis || null,
        isLoading: false,
      });

      // Join WebSocket room
      wsClient.joinSession(sessionId);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  submitFeedback: async (type, content) => {
    const session = get().currentSession;
    if (!session) return;

    try {
      await api.submitFeedback(session.id, type, content);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  finishSession: async () => {
    const session = get().currentSession;
    if (!session) return;

    try {
      await api.finishSession(session.id);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  pauseSession: async () => {
    const session = get().currentSession;
    if (!session) return;

    try {
      const { session: updated } = await api.pauseSession(session.id);
      set({ currentSession: updated });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  resumeSession: async () => {
    const session = get().currentSession;
    if (!session) return;

    try {
      const { session: updated } = await api.resumeSession(session.id);
      set({ currentSession: updated });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  initializeWebSocket: () => {
    wsClient.connect().catch(console.error);
    wsClient.on('*', get().handleServerEvent);
  },

  handleServerEvent: (event: ServerEvent) => {
    const session = get().currentSession;
    if (!session || !('sessionId' in event) || event.sessionId !== session.id) return;

    switch (event.type) {
      case 'session_status':
        get().updateSession({ status: event.status, currentIteration: event.iteration });
        break;

      case 'agent_spawned':
        get().updateSession({
          agents: [...(session.agents || []), event.agent],
        });
        break;

      case 'agent_status':
        get().updateAgentState(event.agentId, { status: event.status, error: event.error });
        break;

      case 'agent_progress':
        get().updateAgentState(event.agentId, {
          progress: event.progress,
          currentTask: event.currentTask,
        });
        break;

      case 'plan_created':
        get().updateSession({ plan: event.plan });
        break;

      case 'synthesis_complete':
        set({ currentSynthesis: event.synthesis });
        break;

      case 'research_complete':
        set({ currentSynthesis: event.synthesis });
        get().updateSession({ status: 'completed' });
        break;

      case 'error':
        set({ error: event.error });
        break;
    }
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    set({ theme: newTheme });
  },

  setError: (error) => set({ error }),

  updateSession: (updates) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, ...updates }
        : null,
    }));
  },

  updateAgentState: (agentId, updates) => {
    set((state) => {
      if (!state.currentSession) return state;
      return {
        currentSession: {
          ...state.currentSession,
          agents: state.currentSession.agents.map((agent) =>
            agent.id === agentId ? { ...agent, ...updates } : agent
          ),
        },
      };
    });
  },
}));
