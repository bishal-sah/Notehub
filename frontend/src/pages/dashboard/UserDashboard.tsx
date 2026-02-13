/**
 * User dashboard overview with stats, gamification, charts, and recent uploads.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService, gamificationService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import type { NoteListItem, UserDashboardResponse, MyGamification, Badge as BadgeType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BadgeCard from '@/components/gamification/BadgeCard';
import { FileText, Upload, Eye, Download, Loader2, ArrowRight, Star, Trophy, Award } from 'lucide-react';
import { UploadTrendChart, StatusDonutChart, VerticalBarChart } from '@/components/charts/AnalyticsCharts';
import LearningTracker from '@/components/learning/LearningTracker';

export default function UserDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<UserDashboardResponse | null>(null);
  const [recentNotes, setRecentNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState<MyGamification | null>(null);
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, gamRes, badgesRes] = await Promise.allSettled([
          dashboardService.user(),
          gamificationService.me(),
          gamificationService.badges(),
        ]);
        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value.data);
          setRecentNotes(dashRes.value.data.recent_uploads || []);
        }
        if (gamRes.status === 'fulfilled') {
          setGamification(gamRes.value.data);
        }
        if (badgesRes.status === 'fulfilled') {
          const bd = badgesRes.value.data;
          setAllBadges(Array.isArray(bd) ? bd : (bd as any)?.results ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.stats;
  const charts = data?.charts;

  const statCards = [
    { label: 'Total Notes', value: stats?.total_notes || 0, icon: <FileText className="h-5 w-5" />, color: 'text-blue-600' },
    { label: 'Approved', value: stats?.approved_notes || 0, icon: <FileText className="h-5 w-5" />, color: 'text-green-600' },
    { label: 'Total Views', value: stats?.total_views || 0, icon: <Eye className="h-5 w-5" />, color: 'text-purple-600' },
    { label: 'Total Downloads', value: stats?.total_downloads || 0, icon: <Download className="h-5 w-5" />, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || user?.username}!</h1>
        <p className="text-muted-foreground">Here&apos;s an overview of your activity on NoteHub.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={stat.color}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts */}
      {charts && (
        <div className="grid md:grid-cols-2 gap-4">
          {charts.upload_trends?.length > 0 && (
            <UploadTrendChart data={charts.upload_trends} title="Your Upload Activity (Last 90 Days)" />
          )}
          {charts.status_distribution && (
            <StatusDonutChart data={charts.status_distribution} title="Notes by Status" />
          )}
          {charts.top_subjects?.length > 0 && (
            <VerticalBarChart
              data={charts.top_subjects}
              dataKey="count"
              title="Your Top Subjects"
              color="#8b5cf6"
              nameKey="name"
            />
          )}
          {charts.views_downloads?.length > 0 && (
            <VerticalBarChart
              data={charts.views_downloads.map(d => ({
                name: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
                views: d.views,
                downloads: d.downloads,
              }))}
              dataKey="views"
              title="Monthly Views"
              color="#6366f1"
              nameKey="name"
            />
          )}
        </div>
      )}

      {/* Gamification Summary */}
      {gamification && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="border-yellow-200 bg-yellow-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-2xl font-bold">{gamification.total_points}</p>
                </div>
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Global Rank</p>
                  <p className="text-2xl font-bold">#{gamification.rank}</p>
                </div>
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Badges Earned</p>
                  <p className="text-2xl font-bold">{gamification.badges.length}</p>
                </div>
                <Award className="h-5 w-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Badges */}
      {allBadges.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Your Badges</CardTitle>
            <Link to="/leaderboard">
              <Button variant="ghost" size="sm" className="gap-1">Leaderboard <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {allBadges.map((badge) => {
                const earned = gamification?.badges.find(ub => ub.badge.id === badge.id) || null;
                return <BadgeCard key={badge.id} badge={badge} earned={earned} size="sm" />;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Tracker */}
      <LearningTracker />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/dashboard/upload">
          <Button className="gap-2"><Upload className="h-4 w-4" /> Upload Notes</Button>
        </Link>
        <Link to="/dashboard/my-notes">
          <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" /> My Notes</Button>
        </Link>
        <Link to="/leaderboard">
          <Button variant="outline" className="gap-2"><Trophy className="h-4 w-4" /> Leaderboard</Button>
        </Link>
      </div>

      {/* Recent Uploads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Uploads</CardTitle>
          <Link to="/dashboard/my-notes">
            <Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="h-3 w-3" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              You haven&apos;t uploaded any notes yet. Start sharing!
            </p>
          ) : (
            <div className="space-y-3">
              {recentNotes.slice(0, 5).map((note) => (
                <div key={note.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground">{note.subject_name}</p>
                    </div>
                  </div>
                  <Badge variant={note.status === 'approved' ? 'default' : note.status === 'pending' ? 'secondary' : 'destructive'}>
                    {note.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
