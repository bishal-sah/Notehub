/**
 * Time-Based Learning Tracker dashboard component.
 * Shows study time per subject, weak vs strong areas, weekly insights,
 * and a daily activity chart.
 */
import { useEffect, useState } from 'react';
import { learningService } from '@/lib/services';
import type { LearningStats, WeeklyLearningReport } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock, TrendingUp, TrendingDown, Brain, Lightbulb, BarChart3,
  ChevronRight, Loader2, Timer, Flame, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function formatTime(secs: number): string {
  if (secs === 0) return '0min';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatTimeShort(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function LearningTracker() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [report, setReport] = useState<WeeklyLearningReport | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      learningService.stats(period),
      learningService.weeklyReport(),
    ])
      .then(([statsRes, reportRes]) => {
        setStats(statsRes.data);
        setReport(reportRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || !report) return null;

  const maxSeconds = Math.max(...(stats.per_subject.map(s => s.total_seconds)), 1);

  // Prepare daily chart data
  const dailyChartData = stats.daily.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    minutes: Math.round(d.total_seconds / 60),
  }));

  // Subject pie data
  const pieData = stats.per_subject.slice(0, 8).map((s, i) => ({
    name: s.subject_name,
    value: Math.round(s.total_seconds / 60),
    color: COLORS[i % COLORS.length],
  }));

  const weekChange = report.prev_week_total > 0
    ? Math.round(((report.this_week_total - report.prev_week_total) / report.prev_week_total) * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Learning Tracker</h2>
        </div>
        <div className="flex gap-1">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPeriod('week')}
          >
            This Week
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPeriod('month')}
          >
            This Month
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Total Study Time</span>
            </div>
            <p className="text-xl font-bold">{formatTime(stats.total_seconds)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="text-xs">Subjects Studied</span>
            </div>
            <p className="text-xl font-bold">{stats.per_subject.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="h-3.5 w-3.5" />
              <span className="text-xs">Strongest</span>
            </div>
            <p className="text-sm font-bold truncate">
              {report.strongest ? report.strongest.subject_name : '—'}
            </p>
            {report.strongest && (
              <p className="text-xs text-muted-foreground">{formatTime(report.strongest.total_seconds)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-3.5 w-3.5" />
              <span className="text-xs">Needs Attention</span>
            </div>
            <p className="text-sm font-bold truncate">
              {report.weakest ? report.weakest.subject_name : '—'}
            </p>
            {report.weakest && (
              <p className="text-xs text-muted-foreground">{formatTime(report.weakest.total_seconds)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {report.insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                {report.insights.map((msg, i) => (
                  <p key={i} className="text-sm">{msg}</p>
                ))}
                {weekChange !== null && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {weekChange >= 0 ? (
                      <Badge variant="default" className="gap-1 text-xs bg-emerald-600">
                        <TrendingUp className="h-3 w-3" /> +{weekChange}% vs last week
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <TrendingDown className="h-3 w-3" /> {weekChange}% vs last week
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Daily Activity Bar Chart */}
        {dailyChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Study Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      tickFormatter={(v) => `${v}m`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} min`, 'Study Time']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--card-foreground))',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="minutes" radius={[4, 4, 0, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subject Distribution Pie */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time by Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] flex items-center">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value} min`, 'Time']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          color: 'hsl(var(--card-foreground))',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-1.5 pl-2">
                  {pieData.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="truncate flex-1">{s.name}</span>
                      <span className="text-muted-foreground shrink-0">{s.value}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subject Breakdown */}
      {stats.per_subject.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Subject Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.per_subject.map((s, i) => {
              const pct = Math.round((s.total_seconds / maxSeconds) * 100);
              const reportEntry = report.per_subject.find(r => r.subject_id === s.subject_id);
              const changePct = reportEntry?.change_pct;

              return (
                <div key={s.subject_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="font-medium">{s.subject_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{formatTime(s.total_seconds)}</span>
                      {changePct !== null && changePct !== undefined && (
                        <span className={`text-xs font-medium ${changePct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {changePct >= 0 ? '+' : ''}{changePct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {stats.per_subject.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Timer className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No study time recorded yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start reading notes and your learning time will be tracked automatically!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
