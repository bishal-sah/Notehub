/**
 * Admin dashboard overview with platform statistics.
 */
import { useEffect, useState } from 'react';
import { dashboardService } from '@/lib/services';
import type { AdminDashboardResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, FileText, CheckSquare, Clock, Download, Eye } from 'lucide-react';

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
  const cards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: <Users className="h-5 w-5" />, color: 'text-blue-600' },
    { label: 'Total Notes', value: stats?.total_notes || 0, icon: <FileText className="h-5 w-5" />, color: 'text-green-600' },
    { label: 'Pending Approvals', value: stats?.pending_notes || 0, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-600' },
    { label: 'Approved Notes', value: stats?.approved_notes || 0, icon: <CheckSquare className="h-5 w-5" />, color: 'text-emerald-600' },
    { label: 'Total Views', value: stats?.total_views || 0, icon: <Eye className="h-5 w-5" />, color: 'text-purple-600' },
    { label: 'Total Downloads', value: stats?.total_downloads || 0, icon: <Download className="h-5 w-5" />, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and statistics.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <div className={card.color}>{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      {data?.recent_notes && data.recent_notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recent_notes.slice(0, 10).map((note: any) => (
                <div key={note.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground">by {note.uploaded_by_name} &bull; {note.subject_name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
