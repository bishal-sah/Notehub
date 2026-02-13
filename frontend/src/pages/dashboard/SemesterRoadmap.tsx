/**
 * Semester Roadmap Planner — productivity tool for tracking syllabus progress.
 *
 * After selecting faculty + semester:
 * - Shows all subjects with credit hours
 * - Suggested study timeline (week allocation)
 * - Progress tracking per subject (slider + status)
 * - Overall semester completion %
 * - Visual timeline bar
 */
import { useEffect, useState, useCallback } from 'react';
import { academicService, roadmapService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type {
  Faculty,
  SemesterListItem,
  SemesterRoadmapResponse,
  RoadmapSubject,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Map, GraduationCap, BookOpen, Clock, Target, CheckCircle2,
  Loader2, Calendar, FileText, ChevronRight, TrendingUp,
  CircleDot, Save, StickyNote,
} from 'lucide-react';

export default function SemesterRoadmap() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Selectors
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [semesters, setSemesters] = useState<SemesterListItem[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  // Roadmap data
  const [roadmap, setRoadmap] = useState<SemesterRoadmapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);

  // Progress edit dialog
  const [editSubject, setEditSubject] = useState<RoadmapSubject | null>(null);
  const [editPercent, setEditPercent] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Load faculties on mount
  useEffect(() => {
    academicService.faculties().then((res) => {
      const data = res.data;
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setFaculties(list);
    }).catch(() => {});
  }, []);

  // Load semesters when faculty changes
  useEffect(() => {
    if (!selectedFaculty) {
      setSemesters([]);
      setSelectedSemester('');
      return;
    }
    setLoadingSemesters(true);
    setSelectedSemester('');
    setRoadmap(null);
    academicService.semesters(Number(selectedFaculty)).then((res) => {
      const data = res.data;
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setSemesters(list);
    }).catch(() => {}).finally(() => setLoadingSemesters(false));
  }, [selectedFaculty]);

  // Load roadmap when semester changes
  const fetchRoadmap = useCallback(async () => {
    if (!selectedSemester) return;
    setLoading(true);
    try {
      const res = await roadmapService.getRoadmap(Number(selectedSemester));
      setRoadmap(res.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load roadmap.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedSemester, toast]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const openEditDialog = (subj: RoadmapSubject) => {
    setEditSubject(subj);
    setEditPercent(subj.progress?.percent_complete ?? 0);
    setEditNotes(subj.progress?.notes_text ?? '');
    setEditTargetDate(subj.progress?.target_date ?? '');
  };

  const handleSaveProgress = async () => {
    if (!editSubject) return;
    setSaving(true);
    try {
      await roadmapService.updateProgress({
        subject_id: editSubject.id,
        percent_complete: editPercent,
        notes_text: editNotes,
        target_date: editTargetDate || null,
      });
      toast({ title: 'Progress saved!', description: `${editSubject.name} updated to ${editPercent}%.` });
      setEditSubject(null);
      fetchRoadmap();
    } catch {
      toast({ title: 'Error', description: 'Failed to save progress.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'in_progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      default: return 'Not Started';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'in_progress': return <TrendingUp className="h-3.5 w-3.5" />;
      default: return <CircleDot className="h-3.5 w-3.5" />;
    }
  };

  const getProgressBarColor = (percent: number) => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 60) return 'bg-blue-500';
    if (percent >= 30) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const stats = roadmap?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Map className="h-6 w-6 text-primary" />
          Semester Roadmap Planner
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your syllabus progress, plan your study timeline, and stay on top of every subject.
        </p>
      </div>

      {/* Faculty + Semester selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Faculty</label>
          <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
            <SelectTrigger>
              <SelectValue placeholder="Select Faculty" />
            </SelectTrigger>
            <SelectContent>
              {faculties.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    {f.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Semester</label>
          <Select
            value={selectedSemester}
            onValueChange={setSelectedSemester}
            disabled={!selectedFaculty || loadingSemesters}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingSemesters ? 'Loading...' : 'Select Semester'} />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name} ({s.subject_count} subjects)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !roadmap && selectedSemester && (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No data found</h3>
          <p className="text-sm text-muted-foreground">This semester has no active subjects.</p>
        </Card>
      )}

      {/* No selection yet */}
      {!loading && !roadmap && !selectedSemester && (
        <Card className="p-8 text-center border-dashed">
          <Map className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Select Faculty & Semester</h3>
          <p className="text-sm text-muted-foreground">
            Choose your faculty and semester above to see your study roadmap.
          </p>
        </Card>
      )}

      {/* ── Roadmap Content ── */}
      {!loading && roadmap && (
        <>
          {/* Semester header + overall stats */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {roadmap.semester.faculty_name} — {roadmap.semester.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {stats?.total_subjects} subjects · {stats?.total_notes} notes available
                  </p>
                </div>
                {isAuthenticated && stats && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{stats.overall_percent}%</p>
                      <p className="text-[10px] text-muted-foreground">Syllabus Complete</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall progress bar */}
              {isAuthenticated && stats && (
                <div className="mt-3 space-y-1.5">
                  <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(stats.overall_percent)}`}
                      style={{ width: `${stats.overall_percent}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {stats.completed} Completed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {stats.in_progress} In Progress
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      {stats.not_started} Not Started
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Visual Timeline ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Suggested Study Timeline (16-week semester)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roadmap.subjects.map((subj) => {
                  const pct = subj.progress?.percent_complete ?? 0;
                  const status = subj.progress?.status;
                  return (
                    <div key={subj.id} className="flex items-center gap-2 text-xs">
                      <span className="w-[120px] sm:w-[160px] truncate font-medium text-right shrink-0">
                        {subj.name}
                      </span>
                      <div className="flex-1 relative h-6 bg-gray-100 dark:bg-gray-800 rounded">
                        {/* Timeline bar */}
                        <div
                          className={`absolute top-0 h-full rounded flex items-center justify-center text-[10px] font-medium text-white transition-all ${
                            status === 'completed'
                              ? 'bg-green-500'
                              : status === 'in_progress'
                              ? 'bg-blue-500'
                              : 'bg-gray-400 dark:bg-gray-600'
                          }`}
                          style={{
                            left: `${((subj.timeline.start_week - 1) / 16) * 100}%`,
                            width: `${(subj.timeline.weeks / 16) * 100}%`,
                          }}
                        >
                          W{subj.timeline.start_week}-{subj.timeline.end_week}
                        </div>
                        {/* Progress overlay */}
                        {pct > 0 && pct < 100 && (
                          <div
                            className="absolute top-0 h-full bg-green-500/30 rounded-l"
                            style={{
                              left: `${((subj.timeline.start_week - 1) / 16) * 100}%`,
                              width: `${((subj.timeline.weeks / 16) * (pct / 100)) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      <span className="w-10 text-right text-muted-foreground shrink-0">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
                {/* Week labels */}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                  <span className="w-[120px] sm:w-[160px] shrink-0" />
                  <div className="flex-1 flex justify-between px-1">
                    {[1, 4, 8, 12, 16].map((w) => (
                      <span key={w}>W{w}</span>
                    ))}
                  </div>
                  <span className="w-10 shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Subject Cards ── */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Subjects ({roadmap.subjects.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {roadmap.subjects.map((subj) => {
                const pct = subj.progress?.percent_complete ?? 0;
                const status = subj.progress?.status;

                return (
                  <Card
                    key={subj.id}
                    className={`overflow-hidden transition-shadow hover:shadow-md cursor-pointer border-l-4 ${
                      status === 'completed'
                        ? 'border-l-green-500'
                        : status === 'in_progress'
                        ? 'border-l-blue-500'
                        : 'border-l-gray-300 dark:border-l-gray-600'
                    }`}
                    onClick={() => isAuthenticated && openEditDialog(subj)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm truncate">{subj.name}</h4>
                            {subj.code && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                {subj.code}
                              </Badge>
                            )}
                          </div>
                          {subj.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subj.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {subj.credit_hours} credits
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {subj.note_count} notes
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Week {subj.timeline.start_week}-{subj.timeline.end_week}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <Badge className={`text-[10px] gap-1 shrink-0 border ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          {getStatusLabel(status)}
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* User notes */}
                      {subj.progress?.notes_text && (
                        <p className="text-[11px] text-muted-foreground mt-2 bg-muted rounded px-2 py-1 italic line-clamp-1">
                          <StickyNote className="h-3 w-3 inline mr-1" />
                          {subj.progress.notes_text}
                        </p>
                      )}

                      {/* Target date */}
                      {subj.progress?.target_date && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Target: {new Date(subj.progress.target_date).toLocaleDateString()}
                        </p>
                      )}

                      {isAuthenticated && (
                        <p className="text-[10px] text-primary mt-2 flex items-center gap-0.5">
                          Click to update progress <ChevronRight className="h-3 w-3" />
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {!isAuthenticated && (
            <Card className="border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Target className="h-4 w-4 inline mr-1" />
                Log in to track your progress and set study goals for each subject.
              </p>
            </Card>
          )}
        </>
      )}

      {/* ── Progress Edit Dialog ── */}
      <Dialog open={!!editSubject} onOpenChange={(open) => !open && setEditSubject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Update Progress
            </DialogTitle>
          </DialogHeader>
          {editSubject && (
            <div className="space-y-4">
              {/* Subject info */}
              <div className="bg-muted rounded-lg p-3">
                <p className="font-semibold text-sm">{editSubject.name}</p>
                <p className="text-xs text-muted-foreground">
                  {editSubject.credit_hours} credits · {editSubject.note_count} notes · Week {editSubject.timeline.start_week}-{editSubject.timeline.end_week}
                </p>
              </div>

              {/* Progress slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Syllabus Completed</label>
                  <span className="text-lg font-bold text-primary">{editPercent}%</span>
                </div>
                <Slider
                  value={[editPercent]}
                  onValueChange={([v]: number[]) => setEditPercent(v)}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Quick set buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {[0, 25, 50, 75, 100].map((v) => (
                  <Button
                    key={v}
                    variant={editPercent === v ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEditPercent(v)}
                  >
                    {v}%
                  </Button>
                ))}
              </div>

              {/* Target date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Target Completion Date
                </label>
                <Input
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <StickyNote className="h-3.5 w-3.5" /> Personal Notes
                </label>
                <Textarea
                  placeholder="e.g., Focus on chapters 3-5, revise formulas..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="min-h-[60px]"
                  maxLength={500}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubject(null)}>Cancel</Button>
            <Button onClick={handleSaveProgress} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
