import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { TopicInput } from '../components/TopicInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, Trash2 } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { sessions, isLoading, loadSessions, createSession, deleteSession } = useAppStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSubmit = async (topic: string, config?: any) => {
    try {
      const session = await createSession(topic, config);
      navigate(`/research/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Deep Search</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered research assistant for comprehensive topic exploration
          </p>
        </div>

        {/* Topic Input */}
        <TopicInput onSubmit={handleSubmit} isLoading={isLoading} />

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Research Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/research/${session.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {session.topic}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge
                        variant={
                          session.status === 'completed'
                            ? 'success'
                            : session.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                      <span>
                        {new Date(session.createdAt).toLocaleDateString()} -{' '}
                        {session.currentIteration} iterations
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm('Delete this session?')) {
                          deleteSession(session.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/research/${session.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
