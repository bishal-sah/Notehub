/**
 * Admin dashboard overview with platform statistics and analytics charts.
 */
import { useEffect, useState } from 'react';
import { dashboardService } from '@/lib/services';
import type { AdminDashboardResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, FileText, CheckSquare, Clock, Download, Eye, AlertTriangle, TrendingUp, BookOpen } from 'lucide-react';
import {
  UploadTrendChart,
  UserGrowthChart,
  FacultyBarChart,
  SubjectPieChart,
  StatusDonutChart,
  MultiLineChart,
} from '@/components/charts/AnalyticsCharts';

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.admin()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
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

  const cards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: <Users className="h-5 w-5" />, color: 'text-blue-600', sub: `+${stats?.new_users_month || 0} this month` },
    { label: 'Total Notes', value: stats?.total_notes || 0, icon: <FileText className="h-5 w-5" />, color: 'text-green-600', sub: `+${stats?.new_notes_month || 0} this month` },
    { label: 'Pending Approvals', value: stats?.pending_notes || 0, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-600', sub: '' },
    { label: 'Approved Notes', value: stats?.approved_notes || 0, icon: <CheckSquare className="h-5 w-5" />, color: 'text-emerald-600', sub: '' },
    { label: 'Total Views', value: stats?.total_views || 0, icon: <Eye className="h-5 w-5" />, color: 'text-purple-600', sub: '' },
    { label: 'Total Downloads', value: stats?.total_downloads || 0, icon: <Download className="h-5 w-5" />, color: 'text-orange-600', sub: '' },
    { label: 'Faculties', value: stats?.total_faculties || 0, icon: <BookOpen className="h-5 w-5" />, color: 'text-indigo-600', sub: `${stats?.total_subjects || 0} subjects` },
    { label: 'Unresolved Reports', value: stats?.unresolved_reports || 0, icon: <AlertTriangle className="h-5 w-5" />, color: stats?.unresolved_reports ? 'text-red-600' : 'text-muted-foreground', sub: '' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview, analytics, and key metrics.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                  {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
                </div>
                <div className={card.color}>{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Upload Trends + User Growth */}
      {charts && (
        <div className="grid md:grid-cols-2 gap-4">
          {charts.uploads_over_time?.length > 0 && (
            <UploadTrendChart data={charts.uploads_over_time} title="Upload Trends (Last 30 Days)" />
          )}
          {charts.registrations_over_time?.length > 0 && (
            <UserGrowthChart data={charts.registrations_over_time} title="User Registrations (Last 30 Days)" />
          )}
        </div>
      )}

      {/* Row 2: Downloads per Faculty + Top Subjects */}
      {charts && (
        <div className="grid md:grid-cols-2 gap-4">
          {charts.downloads_per_faculty?.length > 0 && (
            <FacultyBarChart
              data={charts.downloads_per_faculty}
              dataKey="total_downloads"
              title="Downloads per Faculty"
              color="#3b82f6"
            />
          )}
          {charts.top_subjects?.length > 0 && (
            <SubjectPieChart data={charts.top_subjects} title="Top Subjects (by Notes)" />
          )}
        </div>
      )}

      {/* Row 3: Status Distribution + Monthly Trends */}
      {charts && (
        <div className="grid md:grid-cols-2 gap-4">
          {charts.status_distribution && (
            <StatusDonutChart data={charts.status_distribution} title="Note Status Distribution" />
          )}
          {charts.monthly_trends?.length > 0 && (
            <MultiLineChart
              data={charts.monthly_trends}
              xKey="month"
              title="Monthly Platform Trends (6 Months)"
              lines={[
                { key: 'uploads', color: '#6366f1', name: 'Uploads' },
                { key: 'views', color: '#10b981', name: 'Views' },
                { key: 'downloads', color: '#f59e0b', name: 'Downloads' },
              ]}
            />
          )}
        </div>
      )}

      {/* Notes per Faculty */}
      {charts && charts.notes_per_faculty?.length > 0 && (
        <FacultyBarChart
          data={charts.notes_per_faculty}
          dataKey="note_count"
          title="Notes per Faculty"
          color="#8b5cf6"
        />
      )}

      {/* Top Uploaders */}
      {data?.top_uploaders && data.top_uploaders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Top Uploaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_uploaders.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{u.note_count} notes</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Approvals */}
      {data?.recent_approvals && data.recent_approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Approval Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent_approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.note__title}</p>
                    <p className="text-xs text-muted-foreground">
                      by {a.admin__username} &bull; {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={a.action === 'approved' ? 'default' : 'destructive'}>
                    {a.action}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
