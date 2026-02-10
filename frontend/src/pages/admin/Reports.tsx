/**
 * Admin reports and logs page.
 */
import { useEffect, useState } from 'react';
import { adminNoteService } from '@/lib/services';
import type { NoteReport } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { FileWarning, Loader2, CheckCircle, Flag } from 'lucide-react';

export default function Reports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<NoteReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminNoteService.reports()
      .then((res) => setReports(res.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id: number) => {
    try {
      await adminNoteService.resolveReport(id);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, resolved: true } : r));
      toast({ title: 'Report resolved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve report.', variant: 'destructive' });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Logs</h1>
        <p className="text-muted-foreground">View and manage reported notes.</p>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No Reports</h3>
          <p className="text-muted-foreground text-sm">No notes have been reported.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Flag className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Note #{report.note} — {report.reason}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reported by User #{report.reported_by} &bull; {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {report.resolved ? (
                      <Badge>Resolved</Badge>
                    ) : (
                      <Button size="sm" className="gap-1" onClick={() => resolve(report.id)}>
                        <CheckCircle className="h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
