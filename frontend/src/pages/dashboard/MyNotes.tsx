/**
 * User's uploaded notes listing with edit/delete actions.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { noteService } from '@/lib/services';
import type { NoteListItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Edit, Trash2, Loader2, Eye, Download, BookOpen } from 'lucide-react';

export default function MyNotes() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const res = await noteService.myNotes();
      setNotes(res.data.results || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await noteService.delete(deleteId);
      setNotes((prev) => prev.filter((n) => n.id !== deleteId));
      toast({ title: 'Note deleted', description: 'Your note has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteId(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Notes</h1>
          <p className="text-muted-foreground">Manage your uploaded notes.</p>
        </div>
        <Link to="/dashboard/upload">
          <Button className="gap-2"><FileText className="h-4 w-4" /> Upload New</Button>
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No notes yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Start sharing by uploading your first note.</p>
          <Link to="/dashboard/upload"><Button>Upload Notes</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <Link to={`/notes/${note.slug}`} className="font-medium text-sm hover:underline line-clamp-1">
                        {note.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{note.subject_name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{note.views_count}</span>
                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{note.downloads_count}</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={note.status === 'approved' ? 'default' : note.status === 'pending' ? 'secondary' : 'destructive'}>
                      {note.status}
                    </Badge>
                    <Link to={`/dashboard/edit/${note.id}`}>
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(note.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this note? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
