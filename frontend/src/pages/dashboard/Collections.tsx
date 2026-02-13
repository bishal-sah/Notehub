/**
 * Smart Bookmark + Offline Vault — a mini Notion inside NoteHub.
 *
 * Features:
 * - Custom folders (collections) with CRUD
 * - Personal notes & highlights on each bookmark
 * - Highlight color tags (yellow, green, blue, red, purple)
 * - Offline vault — view & manage IndexedDB-cached notes
 * - Tab-based layout: My Library | Offline Vault
 * - Inline note editing on bookmark cards
 * - Search/filter within bookmarks
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collectionService, bookmarkService } from '@/lib/services';
import { useToast } from '@/components/ui/use-toast';
import { getAllOfflineNotes, removeNoteOffline, getOfflineCacheSize, type OfflineNote } from '@/lib/offlineCache';
import type { Collection, Bookmark } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  FolderOpen, Plus, Pencil, Trash2, Loader2, BookOpen,
  FileText, Eye, Download, BookmarkX, Folder, Search,
  StickyNote, Palette, Save, X, WifiOff, HardDrive,
  ExternalLink, MoreVertical, FolderInput, CheckCircle2,
} from 'lucide-react';

const HIGHLIGHT_COLORS = [
  { value: '', label: 'None', class: '' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700' },
  { value: 'green', label: 'Green', class: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' },
  { value: 'red', label: 'Red', class: 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700' },
];

function getHighlightClass(color: string) {
  return HIGHLIGHT_COLORS.find(c => c.value === color)?.class || '';
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Collections() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('library');

  // ─── Library state ───
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Collection dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogName, setDialogName] = useState('');
  const [dialogDesc, setDialogDesc] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Bookmark note editor
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editColor, setEditColor] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Move bookmark dialog
  const [moveBookmark, setMoveBookmark] = useState<Bookmark | null>(null);
  const [moveTarget, setMoveTarget] = useState<number | null>(null);

  // ─── Offline Vault state ───
  const [offlineNotes, setOfflineNotes] = useState<OfflineNote[]>([]);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [offlineSearch, setOfflineSearch] = useState('');

  // ─── Load helpers ───
  const loadCollections = useCallback(async () => {
    try {
      const res = await collectionService.list();
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results ?? [];
      setCollections(data);
      if (!selectedCollection && data.length > 0) {
        selectCollection(data[0]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const selectCollection = async (col: Collection) => {
    setSelectedCollection(col);
    setLoadingBookmarks(true);
    setSearchQuery('');
    try {
      const res = await collectionService.bookmarks(col.id);
      setBookmarks(Array.isArray(res.data) ? res.data : (res.data as any)?.results ?? []);
    } catch {
      setBookmarks([]);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  const loadOfflineNotes = async () => {
    setOfflineLoading(true);
    try {
      const [notes, size] = await Promise.all([getAllOfflineNotes(), getOfflineCacheSize()]);
      setOfflineNotes(notes);
      setCacheSize(size);
    } catch {
      setOfflineNotes([]);
    } finally {
      setOfflineLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (activeTab === 'offline') loadOfflineNotes();
  }, [activeTab]);

  // ─── Collection CRUD ───
  const handleSave = async () => {
    if (!dialogName.trim()) return;
    setSaving(true);
    try {
      if (dialogMode === 'create') {
        await collectionService.create({ name: dialogName, description: dialogDesc });
        toast({ title: 'Folder created!' });
      } else if (editingId) {
        await collectionService.update(editingId, { name: dialogName, description: dialogDesc });
        toast({ title: 'Folder updated' });
      }
      setDialogOpen(false);
      setDialogName('');
      setDialogDesc('');
      loadCollections();
    } catch (err: any) {
      const msg = err?.response?.data?.name?.[0] || 'Could not save folder.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (col: Collection) => {
    if (!confirm(`Delete "${col.name}"? All bookmarks inside will be removed.`)) return;
    try {
      await collectionService.delete(col.id);
      toast({ title: 'Folder deleted' });
      if (selectedCollection?.id === col.id) {
        setSelectedCollection(null);
        setBookmarks([]);
      }
      loadCollections();
    } catch {
      toast({ title: 'Error', description: 'Could not delete folder.', variant: 'destructive' });
    }
  };

  const handleRemoveBookmark = async (bookmark: Bookmark) => {
    try {
      await bookmarkService.toggle(bookmark.note, selectedCollection?.id ?? null);
      toast({ title: 'Bookmark removed' });
      if (selectedCollection) selectCollection(selectedCollection);
      loadCollections();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // ─── Personal Notes / Highlights ───
  const openNoteEditor = (bm: Bookmark) => {
    setEditingBookmark(bm);
    setEditNote(bm.personal_note || '');
    setEditColor(bm.highlight_color || '');
  };

  const handleSaveNote = async () => {
    if (!editingBookmark) return;
    setSavingNote(true);
    try {
      await bookmarkService.update(editingBookmark.id, {
        personal_note: editNote,
        highlight_color: editColor,
      });
      toast({ title: 'Notes saved!' });
      setEditingBookmark(null);
      if (selectedCollection) selectCollection(selectedCollection);
    } catch {
      toast({ title: 'Error', description: 'Could not save notes.', variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  // ─── Move Bookmark ───
  const handleMoveBookmark = async () => {
    if (!moveBookmark) return;
    try {
      await bookmarkService.move([moveBookmark.id], moveTarget);
      toast({ title: 'Bookmark moved!' });
      setMoveBookmark(null);
      if (selectedCollection) selectCollection(selectedCollection);
      loadCollections();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // ─── Offline vault ───
  const handleRemoveOffline = async (slug: string) => {
    try {
      await removeNoteOffline(slug);
      toast({ title: 'Removed from offline vault' });
      loadOfflineNotes();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // ─── Helpers ───
  const openCreate = () => {
    setDialogMode('create');
    setDialogName('');
    setDialogDesc('');
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (col: Collection) => {
    setDialogMode('edit');
    setDialogName(col.name);
    setDialogDesc(col.description);
    setEditingId(col.id);
    setDialogOpen(true);
  };

  const filteredBookmarks = bookmarks.filter(bm => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      bm.note_detail.title.toLowerCase().includes(q) ||
      bm.note_detail.subject_name.toLowerCase().includes(q) ||
      bm.note_detail.author_name.toLowerCase().includes(q) ||
      (bm.personal_note || '').toLowerCase().includes(q)
    );
  });

  const filteredOffline = offlineNotes.filter(n => {
    if (!offlineSearch) return true;
    const q = offlineSearch.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.subject_name.toLowerCase().includes(q);
  });

  const totalBookmarks = collections.reduce((s, c) => s + c.note_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Smart Library
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Bookmark notes, add personal highlights, organize into folders, and save for offline reading.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Folder className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{collections.length}</p>
              <p className="text-[10px] text-muted-foreground">Folders</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalBookmarks}</p>
              <p className="text-[10px] text-muted-foreground">Bookmarks</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <StickyNote className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{bookmarks.filter(b => b.personal_note).length}</p>
              <p className="text-[10px] text-muted-foreground">With Notes</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <WifiOff className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{offlineNotes.length}</p>
              <p className="text-[10px] text-muted-foreground">Offline</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> My Library
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-1.5">
            <WifiOff className="h-3.5 w-3.5" /> Offline Vault
          </TabsTrigger>
        </TabsList>

        {/* ══════════════ LIBRARY TAB ══════════════ */}
        <TabsContent value="library" className="mt-4">
          <div className="grid lg:grid-cols-[260px_1fr] gap-5">
            {/* Sidebar: folders */}
            <div className="space-y-2">
              <Button onClick={openCreate} variant="outline" className="w-full gap-2 mb-2 border-dashed">
                <Plus className="h-4 w-4" /> New Folder
              </Button>
              {collections.map(col => (
                <button
                  key={col.id}
                  onClick={() => selectCollection(col)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedCollection?.id === col.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted'
                  }`}
                >
                  <FolderOpen className={`h-4 w-4 shrink-0 ${selectedCollection?.id === col.id ? '' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{col.name}</p>
                    <p className={`text-xs ${selectedCollection?.id === col.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {col.note_count} note{col.note_count !== 1 ? 's' : ''}
                      {col.description && ` · ${col.description.slice(0, 20)}${col.description.length > 20 ? '...' : ''}`}
                    </p>
                  </div>
                  {!col.is_default && selectedCollection?.id === col.id && (
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(col); }} className="p-1 rounded hover:bg-primary-foreground/20" title="Edit">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(col); }} className="p-1 rounded hover:bg-primary-foreground/20" title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Main: bookmarks */}
            <div>
              {!selectedCollection ? (
                <div className="text-center py-20">
                  <Folder className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">Select a folder</h3>
                  <p className="text-muted-foreground text-sm">Choose a folder from the left to view its notes.</p>
                </div>
              ) : loadingBookmarks ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : bookmarks.length === 0 ? (
                <div className="text-center py-20">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">No bookmarks yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Browse notes and click the bookmark icon to add them here.
                  </p>
                  <Link to="/notes">
                    <Button variant="outline" className="mt-4 gap-2">
                      <FileText className="h-4 w-4" /> Browse Notes
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search bookmarks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {filteredBookmarks.length} note{filteredBookmarks.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Bookmark cards */}
                  {filteredBookmarks.map(bm => (
                    <div
                      key={bm.id}
                      className={`rounded-lg border bg-card transition-shadow hover:shadow-sm overflow-hidden ${
                        bm.highlight_color ? getHighlightClass(bm.highlight_color) : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 p-3">
                        {/* Left: color indicator */}
                        {bm.highlight_color && (
                          <div className={`w-1 self-stretch rounded-full shrink-0 ${
                            bm.highlight_color === 'yellow' ? 'bg-yellow-400' :
                            bm.highlight_color === 'green' ? 'bg-green-400' :
                            bm.highlight_color === 'blue' ? 'bg-blue-400' :
                            bm.highlight_color === 'red' ? 'bg-red-400' :
                            bm.highlight_color === 'purple' ? 'bg-purple-400' : ''
                          }`} />
                        )}

                        <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />

                        <div className="flex-1 min-w-0">
                          <Link to={`/notes/${bm.note_detail.slug}`}>
                            <p className="text-sm font-semibold truncate hover:underline">{bm.note_detail.title}</p>
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            <span>{bm.note_detail.subject_name}</span>
                            <span>·</span>
                            <span>{bm.note_detail.author_name}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{bm.note_detail.views_count}</span>
                            <Badge variant="secondary" className="text-[10px] uppercase px-1 py-0">{bm.note_detail.file_type}</Badge>
                          </div>

                          {/* Personal note */}
                          {bm.personal_note && (
                            <div className="mt-2 bg-muted/60 rounded px-2.5 py-1.5 text-xs text-muted-foreground italic">
                              <StickyNote className="h-3 w-3 inline mr-1 text-amber-500" />
                              {bm.personal_note}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => openNoteEditor(bm)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Add personal notes / highlight"
                          >
                            <StickyNote className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setMoveBookmark(bm); setMoveTarget(null); }}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Move to another folder"
                          >
                            <FolderInput className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveBookmark(bm)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove bookmark"
                          >
                            <BookmarkX className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ══════════════ OFFLINE VAULT TAB ══════════════ */}
        <TabsContent value="offline" className="mt-4">
          <div className="space-y-4">
            {/* Vault header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  Offline Vault
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notes cached locally for offline reading. Available even without internet.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatBytes(cacheSize)} used
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {offlineNotes.length} note{offlineNotes.length !== 1 ? 's' : ''} cached
                </Badge>
              </div>
            </div>

            {offlineLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : offlineNotes.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <WifiOff className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No offline notes</h3>
                <p className="text-sm text-muted-foreground">
                  Bookmark any note to automatically cache it for offline reading.
                </p>
                <Link to="/notes">
                  <Button variant="outline" className="mt-4 gap-2">
                    <FileText className="h-4 w-4" /> Browse Notes
                  </Button>
                </Link>
              </Card>
            ) : (
              <>
                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search offline notes..."
                    value={offlineSearch}
                    onChange={e => setOfflineSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                {/* Offline note cards */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredOffline.map(note => (
                    <Card key={note.slug} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {note.thumbnail ? (
                            <img
                              src={note.thumbnail}
                              alt=""
                              className="w-12 h-16 object-cover rounded border shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-16 rounded border bg-muted flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link to={`/notes/${note.slug}`}>
                              <p className="text-sm font-semibold truncate hover:underline">{note.title}</p>
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5">{note.subject_name}</p>
                            <p className="text-xs text-muted-foreground">{note.author_name}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="secondary" className="text-[10px] uppercase px-1 py-0">{note.file_type}</Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Cached {new Date(note.cached_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Link to={`/notes/${note.slug}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Open note">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveOffline(note.slug)}
                              title="Remove from offline vault"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Folder Create / Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              {dialogMode === 'create' ? 'Create Folder' : 'Edit Folder'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Folder Name</label>
              <Input
                placeholder='e.g., "Exam Prep 7th Sem", "Important Formulas"'
                value={dialogName}
                onChange={e => setDialogName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="What is this folder for?"
                rows={3}
                value={dialogDesc}
                onChange={e => setDialogDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !dialogName.trim()} className="gap-1.5">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === 'create' ? 'Create Folder' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Personal Notes / Highlight Dialog ═══ */}
      <Dialog open={!!editingBookmark} onOpenChange={(open) => !open && setEditingBookmark(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              Personal Notes & Highlight
            </DialogTitle>
          </DialogHeader>
          {editingBookmark && (
            <div className="space-y-4">
              {/* Note info */}
              <div className="bg-muted rounded-lg p-3">
                <p className="font-semibold text-sm truncate">{editingBookmark.note_detail.title}</p>
                <p className="text-xs text-muted-foreground">{editingBookmark.note_detail.subject_name} · {editingBookmark.note_detail.author_name}</p>
              </div>

              {/* Highlight color picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Palette className="h-3.5 w-3.5" /> Highlight Color
                </label>
                <div className="flex gap-2">
                  {HIGHLIGHT_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setEditColor(color.value)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        color.value === ''
                          ? 'bg-gray-200 dark:bg-gray-700'
                          : color.value === 'yellow' ? 'bg-yellow-400'
                          : color.value === 'green' ? 'bg-green-400'
                          : color.value === 'blue' ? 'bg-blue-400'
                          : color.value === 'red' ? 'bg-red-400'
                          : 'bg-purple-400'
                      } ${editColor === color.value
                        ? 'border-foreground scale-110 ring-2 ring-primary ring-offset-2'
                        : 'border-transparent hover:scale-105'
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Personal notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <StickyNote className="h-3.5 w-3.5" /> Personal Notes
                </label>
                <Textarea
                  placeholder="Add your thoughts, summaries, key takeaways, reminders..."
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  className="min-h-[100px]"
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">{editNote.length}/2000</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBookmark(null)}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={savingNote} className="gap-1.5">
              {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Move Bookmark Dialog ═══ */}
      <Dialog open={!!moveBookmark} onOpenChange={(open) => !open && setMoveBookmark(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderInput className="h-5 w-5 text-primary" />
              Move Bookmark
            </DialogTitle>
          </DialogHeader>
          {moveBookmark && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Move "<span className="font-medium text-foreground">{moveBookmark.note_detail.title}</span>" to:
              </p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {collections.map(col => (
                  <button
                    key={col.id}
                    onClick={() => setMoveTarget(col.id)}
                    className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                      moveTarget === col.id
                        ? 'bg-primary text-primary-foreground'
                        : col.id === moveBookmark.collection
                        ? 'bg-muted text-muted-foreground'
                        : 'hover:bg-muted'
                    }`}
                    disabled={col.id === moveBookmark.collection}
                  >
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    <span className="truncate">{col.name}</span>
                    {col.id === moveBookmark.collection && (
                      <Badge variant="outline" className="text-[10px] ml-auto">Current</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveBookmark(null)}>Cancel</Button>
            <Button onClick={handleMoveBookmark} disabled={!moveTarget} className="gap-1.5">
              <FolderInput className="h-3.5 w-3.5" /> Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
