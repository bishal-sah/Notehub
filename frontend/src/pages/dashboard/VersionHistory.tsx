/**
 * Version History page — timeline of note versions with diff viewer and restore.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { versionService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { NoteVersion, VersionDiffChange } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Loader2, GitBranch, RotateCcw, FileText,
  ArrowRight, Clock, Edit3, Upload, History, ChevronDown, ChevronUp,
} from 'lucide-react';

const CHANGE_ICONS: Record<string, typeof Edit3> = {
  created: Upload,
  edited: Edit3,
  file_replaced: FileText,
  restored: RotateCcw,
};

const CHANGE_COLORS: Record<string, string> = {
  created: 'bg-green-500',
  edited: 'bg-blue-500',
  file_replaced: 'bg-orange-500',
  restored: 'bg-purple-500',
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function VersionHistory() {
  const { noteId } = useParams<{ noteId: string }>();
  const nId = Number(noteId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Diff state
  const [diffA, setDiffA] = useState<number | null>(null);
  const [diffB, setDiffB] = useState<number | null>(null);
  const [diffChanges, setDiffChanges] = useState<VersionDiffChange[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const res = await versionService.list(nId);
      setVersions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast({ title: 'Error', description: 'Could not load versions.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [nId]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const handleDiff = async () => {
    if (!diffA || !diffB) return;
    setDiffLoading(true);
    setDiffChanges(null);
    try {
      const res = await versionService.diff(nId, diffA, diffB);
      setDiffChanges(res.data.changes);
    } catch {
      toast({ title: 'Error', description: 'Could not load diff.', variant: 'destructive' });
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRestore = async (versionId: number, versionNum: number) => {
    if (!confirm(`Restore note to version ${versionNum}? Current state will be saved as a new version.`)) return;
    try {
      await versionService.restore(nId, versionId);
      toast({ title: `Restored to version ${versionNum}` });
      loadVersions();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Restore failed.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Version History
          </h1>
          <p className="text-sm text-muted-foreground">Note #{nId} · {versions.length} version{versions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-16">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No version history</h3>
          <p className="text-muted-foreground text-sm">Versions are created automatically when you edit a note.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-3 space-y-0">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Timeline</h2>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              {versions.map((v, idx) => {
                const Icon = CHANGE_ICONS[v.change_type] || Edit3;
                const dotColor = CHANGE_COLORS[v.change_type] || 'bg-gray-500';
                const isExpanded = expandedVersion === v.id;

                return (
                  <div key={v.id} className="relative pl-10 pb-6 last:pb-0">
                    {/* Dot */}
                    <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-background ${dotColor}`} />

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                              <Icon className="h-2.5 w-2.5" /> v{v.version_number}
                            </Badge>
                            <Badge
                              variant={v.change_type === 'restored' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {v.change_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-1">{v.title}</p>
                          {v.change_summary && (
                            <p className="text-xs text-muted-foreground">{v.change_summary}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(v.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Expandable details */}
                      <button
                        onClick={() => setExpandedVersion(isExpanded ? null : v.id)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? 'Hide details' : 'Show details'}
                      </button>

                      {isExpanded && (
                        <Card className="bg-muted/50">
                          <CardContent className="p-3 space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-muted-foreground">File type:</span>{' '}
                                <span className="font-medium uppercase">{v.file_type || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">File size:</span>{' '}
                                <span className="font-medium">{formatBytes(v.file_size)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Subject:</span>{' '}
                                <span className="font-medium">{v.subject_name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">By:</span>{' '}
                                <span className="font-medium">{v.created_by_name || 'System'}</span>
                              </div>
                            </div>
                            {v.description && (
                              <div>
                                <span className="text-muted-foreground">Description:</span>
                                <p className="mt-0.5 text-foreground whitespace-pre-wrap line-clamp-4">{v.description}</p>
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleRestore(v.id, v.version_number)}
                              >
                                <RotateCcw className="h-3 w-3" /> Restore
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diff Panel */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Compare Versions</h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Version A (older)</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={diffA ?? ''}
                    onChange={e => setDiffA(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select…</option>
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>v{v.version_number} — {v.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Version B (newer)</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={diffB ?? ''}
                    onChange={e => setDiffB(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select…</option>
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>v{v.version_number} — {v.title}</option>
                    ))}
                  </select>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleDiff}
                  disabled={!diffA || !diffB || diffA === diffB || diffLoading}
                >
                  {diffLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
                  Compare
                </Button>
              </CardContent>
            </Card>

            {/* Diff Results */}
            {diffChanges !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Diff Results</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {diffChanges.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No differences found.</p>
                  ) : (
                    diffChanges.map((change, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">{change.field}</Badge>
                        </div>
                        {change.diff ? (
                          // Unified diff view for description
                          <div className="bg-muted rounded-md p-2 text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                            {change.diff.map((line, i) => {
                              let lineClass = 'text-muted-foreground';
                              if (line.startsWith('+') && !line.startsWith('+++')) lineClass = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30';
                              else if (line.startsWith('-') && !line.startsWith('---')) lineClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30';
                              else if (line.startsWith('@@')) lineClass = 'text-blue-600 dark:text-blue-400';
                              return (
                                <div key={i} className={`px-1 ${lineClass}`}>
                                  {line || '\u00A0'}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Simple value diff
                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded line-through">
                              {String(change.old_value ?? '(empty)')}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                              {String(change.new_value ?? '(empty)')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
