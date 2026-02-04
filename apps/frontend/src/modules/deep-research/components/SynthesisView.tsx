import type { Synthesis } from '@deep-search/shared';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Diamond, Circle, ExternalLink } from 'lucide-react';

interface SynthesisViewProps {
  synthesis: Synthesis | null;
  isLoading?: boolean;
}

const importanceIcons = {
  high: Star,
  medium: Diamond,
  low: Circle,
};

export function SynthesisView({ synthesis, isLoading }: SynthesisViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!synthesis) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Research in progress. Synthesis will appear here...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Summary
            {synthesis.confidence !== undefined && (
              <Badge variant="outline">
                {Math.round(synthesis.confidence * 100)}% confidence
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{synthesis.summary}</ReactMarkdown>
        </CardContent>
      </Card>

      {/* Key Findings */}
      <Card>
        <CardHeader>
          <CardTitle>Key Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {synthesis.keyFindings.map((finding, index) => {
            const Icon = importanceIcons[finding.importance];
            return (
              <div key={index} className="flex gap-3">
                <Icon
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    finding.importance === 'high'
                      ? 'text-yellow-500'
                      : finding.importance === 'medium'
                      ? 'text-blue-500'
                      : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <h4 className="font-medium">{finding.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                  {finding.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {finding.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          [{i + 1}]
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Detailed Sections */}
      {synthesis.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={synthesis.sections[0]?.title}>
              <TabsList className="flex-wrap h-auto">
                {synthesis.sections.map((section) => (
                  <TabsTrigger key={section.title} value={section.title} className="text-sm">
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {synthesis.sections.map((section) => (
                <TabsContent key={section.title} value={section.title}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                  {section.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {section.sources.map((source, i) => (
                          <a
                            key={i}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {new URL(source).hostname}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
