/**
 * Instant Test Generator — generates MCQs, short and long questions from a note
 * using OpenAI. Students can practice immediately with interactive MCQs and
 * reveal-able answers for written questions.
 */
import { useState, useCallback } from 'react';
import { testGeneratorService } from '@/lib/services';
import type { GeneratedTest, TestMCQ } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles, Loader2, X, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, RotateCcw, ClipboardList,
  FileQuestion, FileText, Trophy, Minus, Plus, Zap,
} from 'lucide-react';

interface Props {
  slug: string;
}

/* ─── Number stepper ─────────────────────────────────── */

function Stepper({ label, value, onChange, max = 200 }: {
  label: string; value: number; onChange: (v: number) => void; max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline" size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums">{value}</span>
        <Button
          variant="outline" size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/* ─── MCQ Card ───────────────────────────────────────── */

function MCQCard({ q, index, selected, onSelect, revealed }: {
  q: TestMCQ; index: number; selected: string | null;
  onSelect: (opt: string) => void; revealed: boolean;
}) {
  const options = Object.entries(q.options) as [string, string][];

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm leading-relaxed">
        <span className="text-primary font-bold mr-1.5">Q{index + 1}.</span>
        {q.question}
      </p>
      <div className="grid gap-2">
        {options.map(([key, text]) => {
          const isCorrect = key === q.correct;
          const isSelected = selected === key;
          let cls = 'border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 flex items-start gap-2';

          if (revealed) {
            if (isCorrect) {
              cls += ' bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
            } else if (isSelected && !isCorrect) {
              cls += ' bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
            } else {
              cls += ' border-border/50 opacity-50';
            }
          } else if (isSelected) {
            cls += ' bg-primary/10 border-primary/50 ring-1 ring-primary/30';
          } else {
            cls += ' border-border/50 hover:border-primary/30 hover:bg-muted/40';
          }

          return (
            <div
              key={key}
              className={cls}
              onClick={() => !revealed && onSelect(key)}
            >
              <span className="font-semibold text-xs mt-0.5 shrink-0 w-5">{key}.</span>
              <span className="flex-1">{text}</span>
              {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
              {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
            </div>
          );
        })}
      </div>
      {revealed && q.explanation && (
        <div className="text-xs bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-blue-800 dark:text-blue-200">
          <span className="font-semibold">Explanation:</span> {q.explanation}
        </div>
      )}
    </div>
  );
}

/* ─── Written Question Card ──────────────────────────── */

function WrittenQuestionCard({ question, answer, index, type }: {
  question: string; answer: string; index: number; type: 'short' | 'long';
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="space-y-2">
      <p className="font-medium text-sm leading-relaxed">
        <span className="text-primary font-bold mr-1.5">Q{index + 1}.</span>
        {question}
      </p>
      <Button
        variant="ghost" size="sm"
        className="text-xs gap-1 h-7 text-muted-foreground"
        onClick={() => setShowAnswer(!showAnswer)}
      >
        {showAnswer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {showAnswer ? 'Hide Answer' : 'Show Answer'}
      </Button>
      {showAnswer && (
        <div className={`text-sm leading-relaxed rounded-lg p-3 border ${
          type === 'short'
            ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-100'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
        }`}>
          {answer}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────── */

export default function TestGenerator({ slug }: Props) {
  const [open, setOpen] = useState(false);
  const [numMcqs, setNumMcqs] = useState(5);
  const [numShort, setNumShort] = useState(3);
  const [numLong, setNumLong] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [test, setTest] = useState<GeneratedTest | null>(null);

  // MCQ practice state
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [mcqRevealed, setMcqRevealed] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'mcqs' | 'short' | 'long'>('mcqs');

  const handleGenerate = useCallback(async () => {
    const total = numMcqs + numShort + numLong;
    if (total <= 0) return;
    setLoading(true);
    setError('');
    setTest(null);
    setMcqAnswers({});
    setMcqRevealed(false);
    try {
      const res = await testGeneratorService.generate(slug, numMcqs, numShort, numLong);
      if (res.data.success) {
        setTest(res.data);
        // Auto-select tab based on what was generated
        if (res.data.mcqs.length > 0) setActiveTab('mcqs');
        else if (res.data.short_questions.length > 0) setActiveTab('short');
        else if (res.data.long_questions.length > 0) setActiveTab('long');
      } else {
        setError(res.data.error || 'Could not generate test.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [slug, numMcqs, numShort, numLong]);

  const handleSelectMcq = (qId: number, opt: string) => {
    setMcqAnswers((prev) => ({ ...prev, [qId]: opt }));
  };

  const handleSubmitMcqs = () => {
    setMcqRevealed(true);
  };

  const mcqScore = test?.mcqs.reduce((acc, q) => {
    return acc + (mcqAnswers[q.id] === q.correct ? 1 : 0);
  }, 0) ?? 0;

  const mcqTotal = test?.mcqs.length ?? 0;
  const mcqAllAnswered = mcqTotal > 0 && Object.keys(mcqAnswers).length >= mcqTotal;

  const handleReset = () => {
    setTest(null);
    setMcqAnswers({});
    setMcqRevealed(false);
    setError('');
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        onClick={() => setOpen(true)}
      >
        <ClipboardList className="h-4 w-4" />
        Instant Test Generator
      </Button>
    );
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-cyan-50/30 dark:from-emerald-950/20 dark:to-cyan-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Instant Test Generator</CardTitle>
              <p className="text-xs text-muted-foreground">AI-powered practice questions from this note</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpen(false); handleReset(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Config panel (before generation) ── */}
        {!test && !loading && (
          <div className="space-y-4">
            <div className="bg-background/60 rounded-lg p-4 space-y-3 border border-border/50">
              <Stepper label="MCQs (Multiple Choice)" value={numMcqs} onChange={setNumMcqs} />
              <Separator />
              <Stepper label="Short Questions" value={numShort} onChange={setNumShort} />
              <Separator />
              <Stepper label="Long Questions" value={numLong} onChange={setNumLong} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{numMcqs + numShort + numLong}</span> questions
                {numMcqs + numShort + numLong > 50 && (
                  <span className="text-amber-500 ml-1">(may take a moment)</span>
                )}
              </p>
              <Button
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={numMcqs + numShort + numLong <= 0}
                onClick={handleGenerate}
              >
                <Zap className="h-3.5 w-3.5" />
                Generate Test
              </Button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              AI is generating {numMcqs + numShort + numLong} questions...
            </p>
            <p className="text-xs text-muted-foreground/60">This may take 10-30 seconds</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
            {error}
            <Button variant="ghost" size="sm" className="ml-2 h-6 text-xs" onClick={handleReset}>
              Try again
            </Button>
          </div>
        )}

        {/* ── Results ── */}
        {test && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 text-[10px] gap-1">
                <Sparkles className="h-3 w-3" /> AI Generated
              </Badge>
              {test.stats.mcqs > 0 && (
                <Badge variant="outline" className="text-[10px]">{test.stats.mcqs} MCQs</Badge>
              )}
              {test.stats.short_questions > 0 && (
                <Badge variant="outline" className="text-[10px]">{test.stats.short_questions} Short</Badge>
              )}
              {test.stats.long_questions > 0 && (
                <Badge variant="outline" className="text-[10px]">{test.stats.long_questions} Long</Badge>
              )}
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {test.stats.total} total
              </Badge>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              {test.mcqs.length > 0 && (
                <button
                  className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'mcqs' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab('mcqs')}
                >
                  <FileQuestion className="h-3.5 w-3.5" />
                  MCQs ({test.mcqs.length})
                </button>
              )}
              {test.short_questions.length > 0 && (
                <button
                  className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'short' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab('short')}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Short ({test.short_questions.length})
                </button>
              )}
              {test.long_questions.length > 0 && (
                <button
                  className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'long' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab('long')}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Long ({test.long_questions.length})
                </button>
              )}
            </div>

            {/* MCQ tab */}
            {activeTab === 'mcqs' && test.mcqs.length > 0 && (
              <div className="space-y-5">
                {/* Score display (after submit) */}
                {mcqRevealed && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                    mcqScore === mcqTotal
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                      : mcqScore >= mcqTotal * 0.7
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                  }`}>
                    <Trophy className={`h-8 w-8 ${
                      mcqScore === mcqTotal ? 'text-emerald-500' : mcqScore >= mcqTotal * 0.7 ? 'text-blue-500' : 'text-amber-500'
                    }`} />
                    <div>
                      <p className="font-bold text-lg">{mcqScore}/{mcqTotal}</p>
                      <p className="text-xs text-muted-foreground">
                        {mcqScore === mcqTotal ? 'Perfect score!' :
                         mcqScore >= mcqTotal * 0.7 ? 'Great job!' :
                         mcqScore >= mcqTotal * 0.5 ? 'Good effort!' : 'Keep practicing!'}
                      </p>
                    </div>
                  </div>
                )}

                {test.mcqs.map((q, i) => (
                  <div key={q.id}>
                    <MCQCard
                      q={q}
                      index={i}
                      selected={mcqAnswers[q.id] || null}
                      onSelect={(opt) => handleSelectMcq(q.id, opt)}
                      revealed={mcqRevealed}
                    />
                    {i < test.mcqs.length - 1 && <Separator className="mt-5" />}
                  </div>
                ))}

                {/* Submit / Retry buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {!mcqRevealed ? (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!mcqAllAnswered}
                      onClick={handleSubmitMcqs}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Submit Answers ({Object.keys(mcqAnswers).length}/{mcqTotal})
                    </Button>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="gap-1.5"
                      onClick={() => { setMcqAnswers({}); setMcqRevealed(false); }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry MCQs
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Short questions tab */}
            {activeTab === 'short' && test.short_questions.length > 0 && (
              <div className="space-y-4">
                {test.short_questions.map((q, i) => (
                  <div key={q.id}>
                    <WrittenQuestionCard
                      question={q.question}
                      answer={q.answer}
                      index={i}
                      type="short"
                    />
                    {i < test.short_questions.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            )}

            {/* Long questions tab */}
            {activeTab === 'long' && test.long_questions.length > 0 && (
              <div className="space-y-4">
                {test.long_questions.map((q, i) => (
                  <div key={q.id}>
                    <WrittenQuestionCard
                      question={q.question}
                      answer={q.answer}
                      index={i}
                      type="long"
                    />
                    {i < test.long_questions.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            )}

            {/* Footer actions */}
            <Separator />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" />
                Generate New Test
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
