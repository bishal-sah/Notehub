/**
 * User dashboard overview with stats and recent uploads.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import type { NoteListItem, UserDashboardStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Eye, Download, Loader2, ArrowRight } from 'lucide-react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [recentNotes, setRecentNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await dashboardService.user();
        setStats(res.data.stats);
        setRecentNotes(res.data.recent_uploads || []);
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/dashboard/upload">
          <Button className="gap-2"><Upload className="h-4 w-4" /> Upload Notes</Button>
        </Link>
        <Link to="/dashboard/my-notes">
          <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" /> My Notes</Button>
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
