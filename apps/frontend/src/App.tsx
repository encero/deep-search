import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { HomePage } from '@/modules/deep-research/pages/HomePage';
import { ResearchPage } from '@/modules/deep-research/pages/ResearchPage';
import { useAppStore } from '@/stores/app-store';

function App() {
  const { theme, initializeWebSocket } = useAppStore();

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');

    // Initialize WebSocket
    initializeWebSocket();
  }, [theme, initializeWebSocket]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/research/:sessionId" element={<ResearchPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

// Simple History Page
function HistoryPage() {
  const { sessions, loadSessions, deleteSession } = useAppStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Research History</h1>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div>
              <h3 className="font-medium">{session.topic}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(session.createdAt).toLocaleString()} - {session.status}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/research/${session.id}`}
                className="text-primary hover:underline text-sm"
              >
                View
              </a>
              <button
                onClick={() => deleteSession(session.id)}
                className="text-destructive hover:underline text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No research sessions yet</p>
        )}
      </div>
    </div>
  );
}

// Simple Settings Page
function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="max-w-2xl space-y-6">
        <div className="p-4 border rounded-lg">
          <h2 className="font-medium mb-2">LLM Provider</h2>
          <p className="text-sm text-muted-foreground">
            Configure your LLM provider in the backend .env file:
          </p>
          <code className="block mt-2 p-2 bg-muted rounded text-sm">
            LLM_PROVIDER=openai-compat
            <br />
            LLM_BASE_URL=http://localhost:11434/v1
            <br />
            LLM_MODEL=llama3.2
          </code>
        </div>
        <div className="p-4 border rounded-lg">
          <h2 className="font-medium mb-2">Search Provider</h2>
          <p className="text-sm text-muted-foreground">
            Configure your search provider in the backend .env file:
          </p>
          <code className="block mt-2 p-2 bg-muted rounded text-sm">
            SEARCH_PROVIDER=scraper
            <br />
            # or
            <br />
            SEARCH_PROVIDER=searxng
            <br />
            SEARXNG_URL=http://localhost:8080
          </code>
        </div>
      </div>
    </div>
  );
}

export default App;
