/**
 * Exam Mode — one-click rapid revision toggle.
 * Extracts and displays key definitions, formulas, key points, diagrams,
 * and code syntax in a distraction-free revision format.
 */
import { useState } from 'react';
import { examModeService } from '@/lib/services';
import type { ExamModeData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Zap, Loader2, BookOpen, Calculator, ListChecks, Image,
  Code2, AlertCircle, CalendarClock, X, ChevronDown, ChevronUp,
} from 'lucide-react';

interface ExamModeProps {
  slug: string;
  noteTitle: string;
}

export default function ExamMode({ slug, noteTitle }: ExamModeProps) {
  const [active, setActive] = useState(false);
  const [data, setData] = useState<ExamModeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Section collapse states
  const [showDefs, setShowDefs] = useState(true);
  const [showFormulas, setShowFormulas] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showDiagrams, setShowDiagrams] = useState(true);
  const [showSyntax, setShowSyntax] = useState(true);

  const handleActivate = async () => {
    if (data) {
      setActive(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await examModeService.generate(slug);
      setData(res.data);
      setActive(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to generate exam mode content.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Inactive: Show the activation banner ─────────────

  if (!active) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  Exam Mode
                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">
                    Rapid Revision
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <CalendarClock className="h-3 w-3 inline mr-1" />
                  Exam coming up? Get key definitions, formulas & points — fast.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              onClick={handleActivate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {loading ? 'Generating...' : 'Enter Exam Mode'}
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── Active: Render the revision content ──────────────

  const stats = data?.stats;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-amber-600 text-white rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-sm">Exam Mode Active</h3>
            <p className="text-amber-100 text-xs">{noteTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <span className="text-xs text-amber-100 hidden sm:inline">
              {stats.total} items extracted
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-amber-700 h-7 w-7 p-0"
            onClick={() => setActive(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {stats.definitions > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.definitions}</p>
                <p className="text-[10px] text-muted-foreground">Definitions</p>
              </div>
            </div>
          )}
          {stats.formulas > 0 && (
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg px-3 py-2">
              <Calculator className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.formulas}</p>
                <p className="text-[10px] text-muted-foreground">Formulas</p>
              </div>
            </div>
          )}
          {stats.key_points > 0 && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2">
              <ListChecks className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.key_points}</p>
                <p className="text-[10px] text-muted-foreground">Key Points</p>
              </div>
            </div>
          )}
          {stats.diagrams > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg px-3 py-2">
              <Image className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.diagrams}</p>
                <p className="text-[10px] text-muted-foreground">Diagrams</p>
              </div>
            </div>
          )}
          {stats.syntax > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/40 rounded-lg px-3 py-2">
              <Code2 className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.syntax}</p>
                <p className="text-[10px] text-muted-foreground">Code Blocks</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Definitions ── */}
      {data && data.definitions.length > 0 && (
        <Card>
          <CardHeader
            className="py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setShowDefs(!showDefs)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                Definitions ({data.definitions.length})
              </CardTitle>
              {showDefs ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {showDefs && (
            <CardContent className="pt-0 space-y-3">
              {data.definitions.map((def, i) => (
                <div key={i} className="border-l-2 border-blue-400 pl-3 py-1">
                  <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">{def.term}</p>
                  <p className="text-sm text-foreground/80 mt-0.5">{def.definition}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Formulas ── */}
      {data && data.formulas.length > 0 && (
        <Card>
          <CardHeader
            className="py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setShowFormulas(!showFormulas)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-purple-500" />
                Formulas ({data.formulas.length})
              </CardTitle>
              {showFormulas ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {showFormulas && (
            <CardContent className="pt-0 space-y-2">
              {data.formulas.map((f, i) => (
                <div key={i} className="bg-purple-50 dark:bg-purple-950/20 rounded-lg px-4 py-2.5">
                  {f.label && (
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mb-1">{f.label}</p>
                  )}
                  <p className="font-mono text-sm font-semibold">{f.formula}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Key Points ── */}
      {data && data.key_points.length > 0 && (
        <Card>
          <CardHeader
            className="py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setShowPoints(!showPoints)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-500" />
                Key Points ({data.key_points.length})
              </CardTitle>
              {showPoints ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {showPoints && (
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {data.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground/85">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Diagram References ── */}
      {data && data.diagrams.length > 0 && (
        <Card>
          <CardHeader
            className="py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setShowDiagrams(!showDiagrams)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4 text-orange-500" />
                Diagrams & Figures ({data.diagrams.length})
              </CardTitle>
              {showDiagrams ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {showDiagrams && (
            <CardContent className="pt-0 space-y-2">
              {data.diagrams.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm bg-orange-50 dark:bg-orange-950/20 rounded-lg px-3 py-2">
                  <Image className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                  <span>{d}</span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Code Syntax ── */}
      {data && data.syntax.length > 0 && (
        <Card>
          <CardHeader
            className="py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setShowSyntax(!showSyntax)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Code2 className="h-4 w-4 text-slate-500" />
                Code Syntax ({data.syntax.length})
              </CardTitle>
              {showSyntax ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {showSyntax && (
            <CardContent className="pt-0 space-y-3">
              {data.syntax.map((s, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{s.label}</p>
                  <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-4 overflow-x-auto">
                    <pre className="text-sm text-green-400 font-mono whitespace-pre leading-relaxed">
                      {s.code}
                    </pre>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* No content fallback */}
      {data && !data.success && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{data.error || 'No exam-ready content could be extracted from this note.'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
