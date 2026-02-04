import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThumbsUp, Target, CheckCircle, Send } from 'lucide-react';

interface FeedbackBarProps {
  onFeedback: (type: 'guidance' | 'approval' | 'stop' | 'redirect', content: string) => void;
  onFinish: () => void;
  disabled?: boolean;
}

export function FeedbackBar({ onFeedback, onFinish, disabled }: FeedbackBarProps) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onFeedback('guidance', feedback);
      setFeedback('');
    }
  };

  return (
    <div className="border-t bg-background p-4 space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Go deeper on..., Ignore..., Also look at..."
          disabled={disabled}
          className="flex-1"
        />
        <Button type="submit" disabled={disabled || !feedback.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFeedback('approval', 'Looks good, continue')}
          disabled={disabled}
        >
          <ThumbsUp className="h-4 w-4 mr-2" />
          Continue
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const area = prompt('What area should we focus on?');
            if (area) {
              onFeedback('redirect', area);
            }
          }}
          disabled={disabled}
        >
          <Target className="h-4 w-4 mr-2" />
          Go Deeper
        </Button>
        <Button variant="default" size="sm" onClick={onFinish} disabled={disabled}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Finish Now
        </Button>
      </div>
    </div>
  );
}
