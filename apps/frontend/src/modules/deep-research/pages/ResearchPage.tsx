import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { AgentStatusPanel } from '../components/AgentStatusPanel';
import { SynthesisView } from '../components/SynthesisView';
import { FeedbackBar } from '../components/FeedbackBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';

export function ResearchPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    currentSession,
    currentSynthesis,
    isLoading,
    error,
    loadSession,
    submitFeedback,
    finishSession,
    pauseSession,
    resumeSession,
  } = useAppStore();

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  const handleExport = async () => {
    if (!sessionId) return;
    try {
      const markdown = await api.exportSession(sessionId, 'markdown');
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSession?.topic.slice(0, 50) || 'research'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading && !currentSession) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  const isActive = ['planning', 'researching', 'synthesizing'].includes(currentSession.status);
  const isCompleted = currentSession.status === 'completed';
  const isPaused = currentSession.status === 'paused';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold truncate max-w-md">{currentSession.topic}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge
                variant={
                  isCompleted
                    ? 'success'
                    : isActive
                    ? 'default'
                    : isPaused
                    ? 'warning'
                    : 'secondary'
                }
              >
                {currentSession.status}
              </Badge>
              <span>Iteration {currentSession.currentIteration}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPaused && (
            <Button variant="outline" size="sm" onClick={resumeSession}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          {isActive && (
            <Button variant="outline" size="sm" onClick={pauseSession}>
              Pause
            </Button>
          )}
          {isCompleted && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Panel */}
        <div className="w-64 border-r p-4 overflow-y-auto hidden md:block">
          <AgentStatusPanel
            agents={currentSession.agents}
            iteration={currentSession.currentIteration}
            maxIterations={currentSession.exitCriteria?.maxIterations}
          />
        </div>

        {/* Synthesis Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <SynthesisView synthesis={currentSynthesis} isLoading={isActive && !currentSynthesis} />
        </div>
      </div>

      {/* Feedback Bar */}
      {isActive && (
        <FeedbackBar
          onFeedback={submitFeedback}
          onFinish={finishSession}
          disabled={currentSession.status === 'synthesizing'}
        />
      )}
    </div>
  );
}
