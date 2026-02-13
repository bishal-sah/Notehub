/**
 * Flashcards page — list decks, generate new decks from notes, navigate to review.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { flashcardService, noteService } from '@/lib/services';
import { useToast } from '@/components/ui/use-toast';
import type { FlashcardDeck } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2, Plus, Layers, Trash2, Play, Brain, FileText, AlertCircle, Search, Check,
} from 'lucide-react';

interface SimpleNote {
  id: number;
  title: string;
  subject_name: string;
  file_type: string;
  slug: string;
}

export default function Flashcards() {
  const { toast } = useToast();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate dialog
  const [genOpen, setGenOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SimpleNote | null>(null);
  const [maxCards, setMaxCards] = useState('20');
  const [generating, setGenerating] = useState(false);

  // Note picker
  const [myNotes, setMyNotes] = useState<SimpleNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');

  const loadDecks = async () => {
    try {
      const res = await flashcardService.myDecks();
      setDecks(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDecks(); }, []);

  // Load user's notes when dialog opens
  useEffect(() => {
    if (!genOpen || myNotes.length > 0) return;
    setNotesLoading(true);
    noteService.myNotes()
      .then(res => {
        const notes = (res.data?.results || res.data || []) as any[];
        setMyNotes(notes.map((n: any) => ({
          id: n.id,
          title: n.title,
          subject_name: n.subject_name || '',
          file_type: n.file_type || '',
          slug: n.slug || '',
        })));
      })
      .catch(() => {})
      .finally(() => setNotesLoading(false));
  }, [genOpen]);

  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return myNotes;
    const q = noteSearch.toLowerCase();
    return myNotes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.subject_name.toLowerCase().includes(q)
    );
  }, [myNotes, noteSearch]);

  const handleGenerate = async () => {
    if (!selectedNote) return;
    setGenerating(true);
    try {
      const res = await flashcardService.generate(selectedNote.id, parseInt(maxCards) || 20);
      toast({ title: `Generated ${res.data.card_count} flashcards!` });
      setGenOpen(false);
      setSelectedNote(null);
      setNoteSearch('');
      loadDecks();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Could not generate flashcards.';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this deck and all its cards?')) return;
    try {
      await flashcardService.deleteDeck(id);
      setDecks(prev => prev.filter(d => d.id !== id));
      toast({ title: 'Deck deleted' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'ready') return <Badge variant="default" className="text-[10px]">Ready</Badge>;
    if (s === 'pending') return <Badge variant="secondary" className="text-[10px]">Generating…</Badge>;
    return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Flashcards
          </h1>
          <p className="text-muted-foreground text-sm">Auto-generated Q&A cards from your notes with spaced repetition.</p>
        </div>
        <Button onClick={() => setGenOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Generate Deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-20">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No flashcard decks yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Generate flashcards from any approved note to start studying.
          </p>
          <Button onClick={() => setGenOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Generate from Note
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map(deck => (
            <Card key={deck.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate text-sm">{deck.title}</h3>
                    <Link
                      to={`/notes/${deck.note_slug}`}
                      className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <FileText className="h-3 w-3" /> {deck.note_title}
                    </Link>
                  </div>
                  {statusBadge(deck.status)}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                  </span>
                  <span>{new Date(deck.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  {deck.status === 'ready' && (
                    <Link to={`/dashboard/flashcards/${deck.id}/review`} className="flex-1">
                      <Button size="sm" className="w-full gap-1.5">
                        <Play className="h-3.5 w-3.5" /> Study
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(deck.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Deck Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Flashcards from Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                The system will parse the note's file and auto-generate Q&A flashcards using keyword extraction.
                Works best with text-heavy PDFs and documents.
              </p>
            </div>

            {/* Note Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select a Note</label>
              {selectedNote ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedNote.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedNote.subject_name} &middot; {selectedNote.file_type.toUpperCase()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)} className="shrink-0 text-xs">
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search your notes..."
                      value={noteSearch}
                      onChange={e => setNoteSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-48 border rounded-lg">
                    {notesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : filteredNotes.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {myNotes.length === 0 ? 'You have no uploaded notes yet.' : 'No notes match your search.'}
                      </div>
                    ) : (
                      <div className="p-1">
                        {filteredNotes.map(note => (
                          <button
                            key={note.id}
                            onClick={() => setSelectedNote(note)}
                            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted transition-colors flex items-center gap-3"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{note.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {note.subject_name} &middot; {note.file_type.toUpperCase()}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Cards</label>
              <Input
                type="number"
                min={5}
                max={50}
                value={maxCards}
                onChange={e => setMaxCards(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating || !selectedNote}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" /> Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
