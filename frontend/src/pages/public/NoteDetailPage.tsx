/**
 * Public note detail page with download and report functionality.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { noteService, annotationService } from '@/lib/services';
import type { NoteDetail, NoteAnnotation } from '@/types';
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
import NoteViewer from '@/components/viewer/NoteViewer';
import CommentThread from '@/components/collaboration/CommentThread';
import CommunityLayers from '@/components/collaboration/CommunityLayers';
import ReviewSection from '@/components/ratings/ReviewSection';
import StarRating from '@/components/ratings/StarRating';
import BookmarkButton from '@/components/bookmarks/BookmarkButton';
import AISummary from '@/components/notes/AISummary';
import ExamMode from '@/components/notes/ExamMode';
import ConceptSimplifier from '@/components/notes/ConceptSimplifier';
import TestGenerator from '@/components/notes/TestGenerator';
import TopperBadge from '@/components/notes/TopperBadge';
import FocusMode from '@/components/notes/FocusMode';
import { useStudyTracker } from '@/hooks/useStudyTracker';
import {
  FileText, Download, Eye, Calendar, User, GraduationCap,
  BookOpen, Loader2, ArrowLeft, Flag, BookOpenCheck, History, Target,
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [annotations, setAnnotations] = useState<NoteAnnotation[]>([]);
  const [focusMode, setFocusMode] = useState(false);

  // Silently track study time while viewing this note
  useStudyTracker(note?.id);

  const loadAnnotations = async () => {
    if (!slug) return;
    try {
      const res = await annotationService.list(slug);
      const data = res.data;
      setAnnotations(Array.isArray(data) ? data : (data as any)?.results ?? []);
    } catch {
      // silent
    }
  };

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
        <div className={viewerOpen ? 'container max-w-6xl' : 'container max-w-4xl'}>
          {/* Back link */}
          <Link to="/notes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Notes
          </Link>

          <div className={viewerOpen ? 'space-y-6' : 'grid lg:grid-cols-3 gap-6'}>
            {/* Main Content */}
            <div className={viewerOpen ? 'space-y-6' : 'lg:col-span-2 space-y-6'}>
              <div>
                <h1 className="text-3xl font-bold mb-3">{note.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.subject_name && <Badge variant="outline">{note.subject_name}</Badge>}
                  {note.file_type && <Badge variant="secondary" className="uppercase">{note.file_type}</Badge>}
                  <Badge variant={note.status === 'approved' ? 'default' : 'secondary'}>{note.status}</Badge>
                </div>
                {/* Topper Verification Badge */}
                <TopperBadge slug={note.slug} />
                <p className="text-muted-foreground">{note.description || 'No description provided.'}</p>
              </div>

              {/* AI Summary */}
              <AISummary slug={note.slug} />

              {/* Exam Mode */}
              <ExamMode slug={note.slug} noteTitle={note.title} />

              {/* AI Concept Simplifier */}
              <ConceptSimplifier noteSlug={note.slug} />

              {/* Instant Test Generator */}
              <TestGenerator slug={note.slug} />

              <Separator />

              {/* Details */}
              <div className={viewerOpen ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-4' : 'grid sm:grid-cols-2 gap-4'}>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Uploaded by</p>
                    <p className="text-sm font-medium">{note.author_name}</p>
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
                    <p className="text-sm font-medium">{note.faculty_name || 'N/A'} / Sem {note.semester_number || 'N/A'}</p>
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
            <div className={viewerOpen ? 'flex flex-wrap gap-3' : 'space-y-4'}>
              {!viewerOpen && (
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
              )}

              <Button
                className={viewerOpen ? 'gap-2' : 'w-full gap-2'}
                variant={viewerOpen ? 'outline' : 'secondary'}
                onClick={() => {
                  const next = !viewerOpen;
                  setViewerOpen(next);
                  if (next) loadAnnotations();
                }}
              >
                <BookOpenCheck className="h-4 w-4" />
                {viewerOpen ? 'Hide Viewer' : 'Read Online'}
              </Button>

              <Button
                className={viewerOpen ? 'gap-2 bg-amber-600 hover:bg-amber-700 text-white' : 'w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white'}
                onClick={() => setFocusMode(true)}
              >
                <Target className="h-4 w-4" />
                Focus Mode
              </Button>

              <Button className={viewerOpen ? 'gap-2' : 'w-full gap-2'} onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Note
              </Button>

              <BookmarkButton
                noteId={note.id}
                noteData={{
                  slug: note.slug,
                  title: note.title,
                  description: note.description,
                  subject_name: note.subject_name,
                  faculty_name: note.faculty_name,
                  author_name: note.author_name,
                  file_type: note.file_type,
                  file: note.file,
                  thumbnail: note.thumbnail,
                  created_at: note.created_at,
                }}
                variant="button"
                className={viewerOpen ? '' : 'w-full'}
              />

              {isAuthenticated && (
                <Link to={`/dashboard/versions/${note.id}`}>
                  <Button variant="outline" className={viewerOpen ? 'gap-2' : 'w-full gap-2'}>
                    <History className="h-4 w-4" /> Version History
                  </Button>
                </Link>
              )}

              {isAuthenticated && (
                <Button variant="outline" className={viewerOpen ? 'gap-2' : 'w-full gap-2'} onClick={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4" /> Report Note
                </Button>
              )}

              {viewerOpen && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{note.views_count} views</span>
                  <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{note.downloads_count} downloads</span>
                </div>
              )}
            </div>
          </div>

          {/* ── In-Browser Document Viewer ── */}
          {viewerOpen && note.slug && (
            <div className="mt-6">
              <NoteViewer
                fileUrl={noteService.previewUrl(note.slug)}
                fileType={note.file_type || 'pdf'}
                fileName={note.title}
                onDownload={handleDownload}
                noteId={note.id}
                noteSlug={note.slug}
                annotations={annotations}
                onAnnotationsChange={loadAnnotations}
              />
            </div>
          )}

          {/* ── Community Layers ── */}
          <div className="mt-8">
            <CommunityLayers noteSlug={note.slug} noteAuthorId={note.author} />
          </div>

          {/* ── Ratings & Reviews ── */}
          <ReviewSection
            noteId={note.id}
            noteSlug={note.slug}
            onRatingChange={() => {
              // Reload note to update average_rating display
              noteService.detail(note.slug).then(res => setNote(res.data)).catch(() => {});
            }}
          />

          {/* ── Discussion / Comments ── */}
          <div className="mt-8">
            <CommentThread noteId={note.id} noteSlug={note.slug} noteAuthorId={note.author} />
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

      {/* Fullscreen Focus / Exam Mode */}
      {focusMode && note && (
        <FocusMode
          noteTitle={note.title}
          noteSlug={note.slug}
          fileType={note.file_type}
          subjectName={note.subject_name}
          onExit={() => setFocusMode(false)}
        />
      )}
    </div>
  );
}
