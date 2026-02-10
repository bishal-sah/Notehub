/**
 * Edit note page - update title, description, subject, or file.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { noteService, academicService } from '@/lib/services';
import type { Faculty, Subject, NoteDetail } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EditNote() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', subject: '', faculty: '' });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [noteRes, facRes] = await Promise.all([
          noteService.detail(id!),
          academicService.faculties(),
        ]);
        const note: NoteDetail = noteRes.data;
        const facs = facRes.data.results || facRes.data;
        setFaculties(facs);
        setForm({
          title: note.title,
          description: note.description || '',
          subject: String(note.subject || ''),
          faculty: String(note.faculty || ''),
        });
        if (note.faculty) {
          const subRes = await academicService.subjects(undefined, Number(note.faculty));
          setSubjects(subRes.data.results || subRes.data);
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load note.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  useEffect(() => {
    if (form.faculty && !loading) {
      academicService.subjects(undefined, parseInt(form.faculty))
        .then((res) => setSubjects(res.data.results || res.data)).catch(() => {});
    }
  }, [form.faculty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    if (form.subject) data.append('subject', form.subject);
    if (file) data.append('file', file);

    try {
      await noteService.update(parseInt(id!), data);
      toast({ title: 'Note updated', description: 'Your changes have been saved.' });
      navigate('/dashboard/my-notes');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.detail || 'Failed to update note.', variant: 'destructive' });
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/dashboard/my-notes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to My Notes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Edit Note</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Faculty</Label>
                <Select value={form.faculty} onValueChange={(v) => setForm({ ...form, faculty: v, subject: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })} disabled={!form.faculty}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Replace File (optional)</Label>
              <Input id="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="gap-2" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/my-notes')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
