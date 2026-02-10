/**
 * Admin pending note approvals page with approve/reject actions.
 */
import { useEffect, useState } from 'react';
import { adminNoteService } from '@/lib/services';
import type { NoteListItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Loader2, FileText, Clock, Eye } from 'lucide-react';

export default function PendingApprovals() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNote, setActionNote] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    try {
      const res = await adminNoteService.pending();
      setNotes(res.data.results || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async () => {
    if (!actionNote) return;
    setProcessing(true);
    try {
      if (actionNote.action === 'approve') {
        await adminNoteService.approve(actionNote.id, reason);
      } else {
        await adminNoteService.reject(actionNote.id, reason);
      }
      setNotes((prev) => prev.filter((n) => n.id !== actionNote.id));
      toast({ title: `Note ${actionNote.action === 'approve' ? 'approved' : 'rejected'}` });
    } catch {
      toast({ title: 'Error', description: 'Action failed.', variant: 'destructive' });
    } finally {
      setProcessing(false);
      setActionNote(null);
      setReason('');
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
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground">{notes.length} note{notes.length !== 1 ? 's' : ''} awaiting review.</p>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
          <p className="text-muted-foreground text-sm">No pending notes to review.</p>
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
                      <p className="font-medium text-sm">{note.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {note.uploaded_by_name} &bull; {note.subject_name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(note.created_at).toLocaleDateString()}</span>
                        {note.file_type && <Badge variant="secondary" className="text-xs uppercase">{note.file_type}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`/notes/${note.slug}`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    </a>
                    <Button size="sm" className="gap-1" onClick={() => setActionNote({ id: note.id, action: 'approve' })}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => setActionNote({ id: note.id, action: 'reject' })}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionNote !== null} onOpenChange={() => { setActionNote(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionNote?.action === 'approve' ? 'Approve' : 'Reject'} Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason (optional for approval, required for rejection)</Label>
            <Textarea placeholder="Provide a reason..." rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionNote(null); setReason(''); }}>Cancel</Button>
            <Button
              variant={actionNote?.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={processing || (actionNote?.action === 'reject' && !reason.trim())}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionNote?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
