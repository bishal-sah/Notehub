/**
 * Public browse/search notes page with filters.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { noteService, academicService } from '@/lib/services';
import type { NoteListItem, Faculty, Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Search, FileText, Download, Eye, Loader2, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BrowseNotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const page = parseInt(searchParams.get('page') || '1');
  const faculty = searchParams.get('faculty') || '';
  const subject = searchParams.get('subject') || '';
  const search = searchParams.get('search') || '';
  const ordering = searchParams.get('ordering') || '-created_at';

  useEffect(() => {
    academicService.faculties().then((res) => setFaculties(res.data.results || res.data)).catch(() => {});
    academicService.subjects().then((res) => setSubjects(res.data.results || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number | undefined> = {
          page,
          ordering,
          search: search || undefined,
          subject__semester__faculty: faculty || undefined,
          subject: subject || undefined,
        };
        const res = await noteService.list(params);
        setNotes(res.data.results || []);
        setTotalPages(Math.ceil((res.data.count || 0) / 12));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, faculty, subject, search, ordering]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) { params.set(key, value); } else { params.delete(key); }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 py-12">
          <div className="container text-center space-y-4">
            <h1 className="text-4xl font-bold">Browse Notes</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Discover high-quality academic notes shared by students across all faculties.
            </p>
            {/* Search */}
            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes by title, description..."
                className="pl-10"
                defaultValue={search}
                onKeyDown={(e) => { if (e.key === 'Enter') updateParam('search', (e.target as HTMLInputElement).value); }}
              />
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="container">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Select value={faculty} onValueChange={(v) => updateParam('faculty', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Faculties" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculties</SelectItem>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subject} onValueChange={(v) => updateParam('subject', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ordering} onValueChange={(v) => updateParam('ordering', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">Newest First</SelectItem>
                  <SelectItem value="created_at">Oldest First</SelectItem>
                  <SelectItem value="-downloads_count">Most Downloaded</SelectItem>
                  <SelectItem value="-views_count">Most Viewed</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No notes found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {notes.map((note) => (
                    <Link key={note.id} to={`/notes/${note.slug}`}>
                      <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-semibold line-clamp-2">{note.title}</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-2">
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {note.description || 'No description provided.'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {note.subject_name && <Badge variant="outline" className="text-xs">{note.subject_name}</Badge>}
                            {note.file_type && <Badge variant="secondary" className="text-xs uppercase">{note.file_type}</Badge>}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2 border-t text-xs text-muted-foreground">
                          <div className="flex items-center gap-3 w-full">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{note.views_count}</span>
                            <span className="flex items-center gap-1"><Download className="h-3 w-3" />{note.downloads_count}</span>
                            <span className="ml-auto">{note.uploaded_by_name}</span>
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
