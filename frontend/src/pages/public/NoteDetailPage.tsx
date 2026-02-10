/**
 * Public note detail page with download and report functionality.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { noteService } from '@/lib/services';
import type { NoteDetail } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  FileText, Download, Eye, Calendar, User, GraduationCap,
  BookOpen, Loader2, ArrowLeft, Flag,
} from 'lucide-react';

export default function NoteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState({ reason: '', description: '' });
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const res = await noteService.detail(slug);
        setNote(res.data);
      } catch {
        toast({ title: 'Error', description: 'Note not found.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const handleDownload = async () => {
    if (!slug || !isAuthenticated) {
      toast({ title: 'Login required', description: 'Please log in to download notes.', variant: 'destructive' });
      return;
    }
    setDownloading(true);
    try {
      const res = await noteService.download(slug);
      window.open(res.data.file_url, '_blank');
      setNote((prev) => prev ? { ...prev, downloads_count: res.data.downloads_count } : prev);
    } catch {
      toast({ title: 'Error', description: 'Failed to download.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleReport = async () => {
    if (!note) return;
    setReporting(true);
    try {
      await noteService.report({ note: note.id, reason: reportData.reason, description: reportData.description });
      toast({ title: 'Report submitted', description: 'Thank you for your report.' });
      setReportOpen(false);
      setReportData({ reason: '', description: '' });
    } catch {
      toast({ title: 'Error', description: 'Failed to submit report.', variant: 'destructive' });
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Note not found</h2>
            <Link to="/notes"><Button variant="outline">Browse Notes</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Back link */}
          <Link to="/notes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Notes
          </Link>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-3">{note.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.subject_name && <Badge variant="outline">{note.subject_name}</Badge>}
                  {note.file_type && <Badge variant="secondary" className="uppercase">{note.file_type}</Badge>}
                  <Badge variant={note.status === 'approved' ? 'default' : 'secondary'}>{note.status}</Badge>
                </div>
                <p className="text-muted-foreground">{note.description || 'No description provided.'}</p>
              </div>

              <Separator />

              {/* Details */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Uploaded by</p>
                    <p className="text-sm font-medium">{note.uploaded_by_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Uploaded on</p>
                    <p className="text-sm font-medium">{new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Faculty / Semester</p>
                    <p className="text-sm font-medium">{note.faculty_name || 'N/A'} / {note.semester_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">File</p>
                    <p className="text-sm font-medium">{note.file_type?.toUpperCase()} &bull; {note.file_size ? `${(note.file_size / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Eye className="h-4 w-4" />Views</span>
                    <span className="font-medium">{note.views_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Download className="h-4 w-4" />Downloads</span>
                    <span className="font-medium">{note.downloads_count}</span>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full gap-2" onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Note
              </Button>

              {isAuthenticated && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4" /> Report Note
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input placeholder="e.g., Inappropriate content" value={reportData.reason} onChange={(e) => setReportData({ ...reportData, reason: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Provide more details..." rows={4} value={reportData.description} onChange={(e) => setReportData({ ...reportData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={handleReport} disabled={reporting || !reportData.reason}>
              {reporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
