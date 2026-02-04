import type { AgentState } from '@deep-search/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Search, FileText, Users } from 'lucide-react';

interface AgentStatusPanelProps {
  agents: AgentState[];
  iteration: number;
  maxIterations?: number;
}

const roleIcons = {
  orchestrator: Brain,
  researcher: Search,
  synthesizer: FileText,
};

const statusColors: Record<AgentState['status'], 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  idle: 'secondary',
  planning: 'default',
  searching: 'default',
  analyzing: 'default',
  synthesizing: 'default',
  waiting: 'warning',
  completed: 'success',
  error: 'destructive',
};

export function AgentStatusPanel({ agents, iteration, maxIterations = 10 }: AgentStatusPanelProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Research Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            Iteration {iteration}/{maxIterations}
          </div>
          <Progress value={(iteration / maxIterations) * 100} className="mt-2" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {agents.map((agent) => {
          const Icon = roleIcons[agent.role] || Search;
          return (
            <Card key={agent.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium capitalize">{agent.role}</span>
                  </div>
                  <Badge variant={statusColors[agent.status]}>{agent.status}</Badge>
                </div>

                {agent.assignedSubtopic && (
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {agent.assignedSubtopic}
                  </p>
                )}

                {agent.progress !== undefined && agent.status !== 'completed' && (
                  <Progress value={agent.progress} className="h-2" />
                )}

                {agent.currentTask && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{agent.currentTask}</p>
                )}

                {agent.error && (
                  <p className="text-xs text-destructive mt-1 truncate">{agent.error}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
