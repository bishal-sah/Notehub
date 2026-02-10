/**
 * Upload note page with file upload and metadata form.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService, academicService } from '@/lib/services';
import type { Faculty, Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Loader2, FileUp } from 'lucide-react';

export default function UploadNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', subject: '', faculty: '',
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    academicService.faculties().then((res) => setFaculties(res.data.results || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.faculty) {
      academicService.subjects(undefined, parseInt(form.faculty))
        .then((res) => setSubjects(res.data.results || res.data)).catch(() => {});
    } else {
      setSubjects([]);
    }
  }, [form.faculty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Error', description: 'Please select a file to upload.', variant: 'destructive' });
      return;
    }
    if (!form.subject) {
      toast({ title: 'Error', description: 'Please select a subject.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setProgress(0);

    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    data.append('subject', form.subject);
    data.append('file', file);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 300);

    try {
      await noteService.upload(data);
      setProgress(100);
      clearInterval(interval);
      toast({ title: 'Note uploaded!', description: 'Your note has been submitted for review.' });
      navigate('/dashboard/my-notes');
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      let message = 'Upload failed. Please try again.';
      const data = err?.response?.data;
      if (data) {
        if (typeof data === 'string') message = data;
        else if (data.detail) message = data.detail;
        else {
          const errors = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
          message = errors.join('; ');
        }
      }
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Notes</h1>
        <p className="text-muted-foreground">Share your notes with the community. They will be reviewed before publishing.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Note Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="e.g., Data Structures Chapter 5 Notes" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Briefly describe the content of your notes..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Faculty *</Label>
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
                <Label>Subject *</Label>
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
              <Label htmlFor="file">File (PDF, DOC, DOCX, PPT, PPTX) *</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  {file ? file.name : 'Drag & drop or click to select a file'}
                </p>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="max-w-xs mx-auto"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            {progress > 0 && (
              <div className="space-y-1">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">{progress}% uploaded</p>
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Uploading...' : 'Upload Note'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
