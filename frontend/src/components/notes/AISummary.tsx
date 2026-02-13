/**
 * AI Summary component — displays or generates an auto-summary of a note.
 * Shows a collapsible card with the summary text, generation info, and a
 * generate/regenerate button for authenticated users.
 */
import { useState, useEffect } from 'react';
import { summaryService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import type { NoteSummary } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Loader2, Clock, FileText, AlertCircle } from 'lucide-react';

interface AISummaryProps {
  slug: string;
}

export default function AISummary({ slug }: AISummaryProps) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<NoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    summaryService
      .get(slug)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await summaryService.generate(slug);
      setData(res.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        'Failed to generate summary. Please try again.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading summary...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            {data?.has_summary && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <FileText className="h-3 w-3" />
                {data.word_count || data.summary.split(' ').length} words
              </Badge>
            )}
            <svg
              className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-3">
          {data?.has_summary ? (
            <>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {data.summary}
              </p>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {data.generated_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Generated {new Date(data.generated_at).toLocaleDateString()}
                    </span>
                  )}
                  {data.source && data.source !== 'cached' && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      Source: {data.source.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Regenerate
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No summary generated yet for this note.
              </p>
              {isAuthenticated ? (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generating ? 'Generating...' : 'Generate Summary'}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Log in to generate an AI summary.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
