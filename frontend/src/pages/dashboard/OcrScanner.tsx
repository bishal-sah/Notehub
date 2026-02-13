/**
 * OCR Scanner page — upload scanned/handwritten notes, extract text via OCR,
 * preview results, search through extracted text.
 */
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ocrService } from '@/lib/services';
import { academicService } from '@/lib/services';
import { useToast } from '@/components/ui/use-toast';
import type { OcrResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Upload, ScanLine, FileText, CheckCircle2, XCircle,
  Search, Image, Copy, RotateCcw, Sparkles, AlertCircle,
} from 'lucide-react';

interface SubjectOption {
  id: number;
  name: string;
}

export default function OcrScanner() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Result
  const [result, setResult] = useState<OcrResult | null>(null);

  // Subjects
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    academicService.subjects().then(res => {
      setSubjects(Array.isArray(res.data) ? res.data.map((s: any) => ({ id: s.id, name: s.name })) : []);
    }).catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      toast({ title: 'Invalid file', description: 'Upload JPG, PNG, or scanned PDF.', variant: 'destructive' });
      return;
    }

    setFile(f);
    setResult(null);

    // Preview for images
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !subjectId) {
      toast({ title: 'Missing fields', description: 'Title, subject, and file are required.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description);
    formData.append('file', file);
    formData.append('subject', subjectId);
    formData.append('is_handwritten', 'true');

    try {
      const res = await ocrService.upload(formData);
      setResult(res.data);
      if (res.data.ocr_status === 'completed') {
        toast({ title: 'OCR Complete', description: `Extracted text with ${res.data.ocr_confidence}% confidence.` });
      } else {
        toast({ title: 'OCR Issue', description: res.data.message, variant: 'destructive' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Upload failed.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async () => {
    if (!result?.note_id) return;
    setUploading(true);
    try {
      const res = await ocrService.retry(result.note_id);
      setResult(res.data);
      toast({ title: res.data.ocr_status === 'completed' ? 'OCR Complete' : 'OCR Failed', description: res.data.message });
    } catch {
      toast({ title: 'Retry failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleCopyText = () => {
    if (result?.ocr_text) {
      navigator.clipboard.writeText(result.ocr_text);
      toast({ title: 'Copied to clipboard' });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await ocrService.search(searchQuery.trim());
      setSearchResults(res.data.results || []);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setSubjectId('');
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" /> OCR Scanner
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload scanned or photographed handwritten notes — we'll extract the text and make them searchable.
        </p>
      </div>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Upload & Extract</TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5"><Search className="h-3.5 w-3.5" /> Search Handwritten</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Upload Form */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Upload Handwritten Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File drop zone */}
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {preview ? (
                      <div className="space-y-2">
                        <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-md shadow-sm" />
                        <p className="text-xs text-muted-foreground">{file?.name} · {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}</p>
                      </div>
                    ) : file ? (
                      <div className="space-y-2">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">Click to upload or drag & drop</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, or scanned PDF</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      placeholder="e.g. Chapter 3 – Thermodynamics notes"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject *</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={subjectId}
                      onChange={e => setSubjectId(e.target.value)}
                    >
                      <option value="">Select subject…</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Optional description…"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || !file || !title.trim() || !subjectId}
                      className="flex-1 gap-2"
                    >
                      {uploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Upload & Extract Text</>
                      )}
                    </Button>
                    {(file || result) && (
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" /> Tips for best results
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use good lighting when photographing notes</li>
                    <li>• Keep the camera steady and parallel to the paper</li>
                    <li>• Write clearly with dark ink on white paper</li>
                    <li>• Avoid shadows and wrinkles on the paper</li>
                    <li>• Higher resolution images produce better results</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Right: OCR Result */}
            <div className="space-y-4">
              {result ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {result.ocr_status === 'completed' ? (
                          <><CheckCircle2 className="h-4 w-4 text-green-600" /> Extracted Text</>
                        ) : (
                          <><XCircle className="h-4 w-4 text-destructive" /> Extraction Failed</>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {result.ocr_status === 'completed' && (
                          <Badge variant="outline" className="text-[10px]">
                            {result.ocr_confidence}% confidence
                          </Badge>
                        )}
                        <Badge
                          variant={result.ocr_status === 'completed' ? 'default' : 'destructive'}
                          className="text-[10px]"
                        >
                          {result.ocr_status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.ocr_status === 'completed' && result.ocr_text ? (
                      <>
                        <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                            {result.ocr_text}
                          </pre>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCopyText} className="gap-1.5">
                            <Copy className="h-3.5 w-3.5" /> Copy Text
                          </Button>
                          <Link to={`/notes/${result.note_slug}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> View Note
                            </Button>
                          </Link>
                        </div>
                        {result.ocr_confidence < 60 && (
                          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-xs text-orange-700 dark:text-orange-300">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p>Low confidence score. The extracted text may contain errors. Try uploading a clearer image.</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 space-y-3">
                        <XCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                        <Button variant="outline" size="sm" onClick={handleRetry} disabled={uploading} className="gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5" /> Retry OCR
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <ScanLine className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-1">Ready to scan</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a handwritten note and the OCR engine will extract the text automatically.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Confidence meter */}
              {result?.ocr_status === 'completed' && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">OCR Confidence</h4>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          result.ocr_confidence >= 80 ? 'bg-green-500' :
                          result.ocr_confidence >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, result.ocr_confidence)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>0%</span>
                      <span className="font-medium">{result.ocr_confidence}%</span>
                      <span>100%</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search through handwritten notes…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={searching || searchQuery.trim().length < 2} className="gap-2">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {searchResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
              {searchResults.map((note: any) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link to={`/notes/${note.slug}`} className="font-medium text-sm hover:underline">
                          {note.title}
                        </Link>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {note.subject_name && <Badge variant="outline" className="text-[10px]">{note.subject_name}</Badge>}
                          <Badge variant="secondary" className="text-[10px]">Handwritten</Badge>
                          <Badge variant="secondary" className="text-[10px] uppercase">{note.file_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          by {note.author_name} · {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchQuery && !searching ? (
            <div className="text-center py-12">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No handwritten notes found matching your query.</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
