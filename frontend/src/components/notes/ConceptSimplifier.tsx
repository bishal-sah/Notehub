/**
 * AI Concept Simplifier — "Explain This Like I'm 10"
 * Allows users to type or paste a concept and get a kid-friendly explanation + analogy.
 * Uses curated DB for instant answers, Gemini AI for everything else.
 */
import { useState } from 'react';
import { conceptSimplifierService } from '@/lib/services';
import type { ConceptSimplification } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, Lightbulb, X, ArrowRight, RefreshCw, Zap, BookOpen } from 'lucide-react';

interface Props {
  noteSlug?: string;
}

export default function ConceptSimplifier({ noteSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConceptSimplification | null>(null);
  const [error, setError] = useState('');

  const handleSimplify = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await conceptSimplifierService.simplify(input.trim(), noteSlug);
      if (res.data.success) {
        setResult(res.data);
      } else {
        setError(res.data.error || 'Could not simplify this concept.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setInput('');
    setError('');
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        AI Doubt Solver
      </Button>
    );
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/10">
      <CardContent className="pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Concept Simplifier</h3>
              <p className="text-xs text-muted-foreground">Explain any concept like I'm 10 years old</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpen(false); handleReset(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Input */}
        {!result && (
          <>
            <Textarea
              placeholder='Type or paste a concept, e.g. "Normalization", "What is a deadlock?", or paste a whole paragraph...'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              className="resize-none bg-white dark:bg-background text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSimplify();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Press Enter to simplify • Shift+Enter for new line</p>
              <Button
                size="sm"
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSimplify}
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {loading ? 'AI is thinking...' : 'Simplify'}
              </Button>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Result */}
        {result && result.success && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Original + source badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 line-clamp-2 flex-1">
                <span className="font-medium">You asked about:</span> "{result.original}"
              </div>
              {result.ai_powered ? (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] gap-1 shrink-0">
                  <Zap className="h-3 w-3" /> AI Powered
                </Badge>
              ) : result.matched_concept ? (
                <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                  <BookOpen className="h-3 w-3" /> Instant
                </Badge>
              ) : null}
            </div>

            {/* Simplified explanation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{result.emoji}</span>
                <h4 className="font-semibold text-sm text-purple-700 dark:text-purple-300">
                  Simple Explanation
                </h4>
              </div>
              <p className="text-sm leading-relaxed pl-7">
                {result.simplified}
              </p>
            </div>

            {/* Divider arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-purple-400 rotate-90" />
            </div>

            {/* Analogy */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-300">
                  Real-World Analogy
                </h4>
              </div>
              <p className="text-sm leading-relaxed italic text-amber-900 dark:text-amber-100/80">
                "{result.analogy}"
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleReset}>
                <RefreshCw className="h-3 w-3" />
                Try another concept
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
