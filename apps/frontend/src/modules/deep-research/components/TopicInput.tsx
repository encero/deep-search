import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

interface TopicInputProps {
  onSubmit: (topic: string, config?: any) => void;
  isLoading?: boolean;
}

export function TopicInput({ onSubmit, isLoading }: TopicInputProps) {
  const [topic, setTopic] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [depthLevel, setDepthLevel] = useState<'shallow' | 'medium' | 'deep'>('medium');
  const [focusAreas, setFocusAreas] = useState('');
  const [excludeTopics, setExcludeTopics] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const config = {
      depthLevel,
      focusAreas: focusAreas
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      excludeTopics: excludeTopics
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    onSubmit(topic, config);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Start New Research
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your research topic..."
              className="text-lg"
              disabled={isLoading}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            Advanced Settings
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium">Research Depth</label>
                <div className="flex gap-2 mt-2">
                  {(['shallow', 'medium', 'deep'] as const).map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={depthLevel === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDepthLevel(level)}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {depthLevel === 'shallow' && '3 subtopics, quick overview'}
                  {depthLevel === 'medium' && '5 subtopics, balanced coverage'}
                  {depthLevel === 'deep' && '8 subtopics, comprehensive research'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Focus Areas (comma-separated)</label>
                <Input
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="e.g., technical details, case studies"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Exclude Topics (comma-separated)</label>
                <Input
                  value={excludeTopics}
                  onChange={(e) => setExcludeTopics(e.target.value)}
                  placeholder="e.g., historical background, pricing"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!topic.trim() || isLoading}>
            {isLoading ? 'Starting Research...' : 'Start Research'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
