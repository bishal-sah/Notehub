/**
 * NoteMaker — personal note-making tool with rich text editing,
 * sharing (Gmail, WhatsApp), and download support.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { personalNoteService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus, Search, Pin, PinOff, Trash2, Archive, Download, Share2,
  Mail, MessageCircle, MoreVertical, FileText, Bold, Italic, Underline,
  List, ListOrdered, Heading1, Heading2, Code, Quote, Undo2, Redo2,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, Link2, Loader2,
  StickyNote, Sparkles,
} from 'lucide-react';
import type { PersonalNoteListItem, PersonalNoteDetail } from '@/types';

export default function NoteMaker() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [notes, setNotes] = useState<PersonalNoteListItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [activeNote, setActiveNote] = useState<PersonalNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes list
  const loadNotes = async () => {
    try {
      const res = await personalNoteService.list();
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  // Load a single note
  const loadNote = async (id: number) => {
    try {
      const res = await personalNoteService.detail(id);
      setActiveNote(res.data);
      setActiveNoteId(id);
      setTitleInput(res.data.title);
      setTagsInput(res.data.tags);
      // Set editor content
      if (editorRef.current) {
        editorRef.current.innerHTML = res.data.content || '';
      }
    } catch {
      toast({ title: 'Error loading note', variant: 'destructive' });
    }
  };

  // Create new note
  const createNote = async () => {
    try {
      const res = await personalNoteService.create({ title: 'Untitled', content: '' });
      await loadNotes();
      loadNote(res.data.id);
    } catch {
      toast({ title: 'Error creating note', variant: 'destructive' });
    }
  };

  // Auto-save with debounce
  const autoSave = useCallback(() => {
    if (!activeNoteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const content = editorRef.current?.innerHTML || '';
        await personalNoteService.update(activeNoteId, {
          title: titleInput || 'Untitled',
          content,
          tags: tagsInput,
        });
        // Refresh sidebar
        const res = await personalNoteService.list();
        setNotes(Array.isArray(res.data) ? res.data : []);
      } catch { /* silent */ }
      finally { setSaving(false); }
    }, 800);
  }, [activeNoteId, titleInput, tagsInput]);

  useEffect(() => { loadNotes(); }, []);

  useEffect(() => {
    if (activeNoteId) autoSave();
  }, [titleInput, tagsInput]);

  // Editor input handler
  const handleEditorInput = () => {
    if (activeNoteId) autoSave();
  };

  // Toolbar commands
  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Delete note
  const handleDelete = async (id: number) => {
    try {
      await personalNoteService.delete(id);
      if (activeNoteId === id) {
        setActiveNoteId(null);
        setActiveNote(null);
        if (editorRef.current) editorRef.current.innerHTML = '';
      }
      await loadNotes();
      toast({ title: 'Note deleted' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Toggle pin
  const handlePin = async (id: number) => {
    try {
      await personalNoteService.togglePin(id);
      await loadNotes();
    } catch { /* silent */ }
  };

  // Share via Gmail
  const shareViaGmail = async () => {
    if (!activeNoteId) return;
    try {
      const res = await personalNoteService.export(activeNoteId);
      const subject = encodeURIComponent(res.data.title);
      const body = encodeURIComponent(res.data.text);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
    } catch {
      toast({ title: 'Error exporting note', variant: 'destructive' });
    }
  };

  // Share via WhatsApp
  const shareViaWhatsApp = async () => {
    if (!activeNoteId) return;
    try {
      const res = await personalNoteService.export(activeNoteId);
      const text = encodeURIComponent(`*${res.data.title}*\n\n${res.data.content}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch {
      toast({ title: 'Error exporting note', variant: 'destructive' });
    }
  };

  // Download as .txt
  const downloadAsText = async () => {
    if (!activeNoteId) return;
    try {
      const res = await personalNoteService.export(activeNoteId);
      const blob = new Blob([res.data.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.data.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error downloading note', variant: 'destructive' });
    }
  };

  // Download as .html
  const downloadAsHtml = async () => {
    if (!activeNoteId) return;
    try {
      const res = await personalNoteService.export(activeNoteId);
      const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${res.data.title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}
h1{border-bottom:2px solid #eee;padding-bottom:10px}</style></head>
<body><h1>${res.data.title}</h1>${res.data.html}
<hr><p style="color:#888;font-size:12px">Exported from NoteHub</p></body></html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.data.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error downloading note', variant: 'destructive' });
    }
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!activeNoteId) return;
    try {
      const res = await personalNoteService.export(activeNoteId);
      await navigator.clipboard.writeText(res.data.text);
      toast({ title: 'Copied to clipboard!' });
    } catch {
      toast({ title: 'Error copying', variant: 'destructive' });
    }
  };

  // Time ago
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Filtered notes
  const filteredNotes = search.trim()
    ? notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.preview.toLowerCase().includes(search.toLowerCase()) ||
        n.tags.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r flex flex-col shrink-0 bg-muted/20">
        {/* Sidebar Header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">My Notes</h2>
              <Badge variant="secondary" className="text-[10px] px-1.5">{notes.length}</Badge>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={createNote} title="New note">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>{search ? 'No notes match' : 'No notes yet'}</p>
              {!search && (
                <Button size="sm" variant="outline" className="mt-2 text-xs gap-1" onClick={createNote}>
                  <Plus className="h-3 w-3" /> Create Note
                </Button>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => loadNote(note.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all group relative ${
                  activeNoteId === note.id
                    ? 'bg-primary/10 border border-primary/20 shadow-sm'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {note.is_pinned && <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                      <p className="font-medium truncate">{note.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{note.preview || 'Empty note'}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(note.updated_at)}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => handlePin(note.id)}>
                        {note.is_pinned ? <PinOff className="h-3 w-3 mr-2" /> : <Pin className="h-3 w-3 mr-2" />}
                        {note.is_pinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(note.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <>
            {/* Title bar */}
            <div className="border-b px-4 py-2 flex items-center justify-between gap-2">
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Note title..."
                className="border-0 shadow-none text-lg font-semibold p-0 h-auto focus-visible:ring-0"
              />
              <div className="flex items-center gap-1 shrink-0">
                {saving && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </span>
                )}
                {!saving && activeNote && (
                  <span className="text-[10px] text-muted-foreground">Saved</span>
                )}

                {/* Share dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={shareViaGmail}>
                      <Mail className="h-3.5 w-3.5 mr-2 text-red-500" /> Share via Gmail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareViaWhatsApp}>
                      <MessageCircle className="h-3.5 w-3.5 mr-2 text-green-500" /> Share via WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyToClipboard}>
                      <FileText className="h-3.5 w-3.5 mr-2" /> Copy to Clipboard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Download dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={downloadAsText}>
                      <FileText className="h-3.5 w-3.5 mr-2" /> Download as .txt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadAsHtml}>
                      <Code className="h-3.5 w-3.5 mr-2" /> Download as .html
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. "{activeNote.title}" will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(activeNote.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Tags bar */}
            <div className="border-b px-4 py-1.5">
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Add tags (comma separated)..."
                className="border-0 shadow-none text-xs p-0 h-auto focus-visible:ring-0 text-muted-foreground"
              />
            </div>

            {/* Formatting toolbar */}
            <div className="border-b px-2 py-1.5 flex items-center gap-0.5 flex-wrap bg-muted/30">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('undo')} title="Undo">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('redo')} title="Redo">
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('formatBlock', '<h1>')} title="Heading 1">
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('formatBlock', '<h2>')} title="Heading 2">
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('bold')} title="Bold">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('italic')} title="Italic">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('underline')} title="Underline">
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('strikeThrough')} title="Strikethrough">
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('insertUnorderedList')} title="Bullet list">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('insertOrderedList')} title="Numbered list">
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('justifyLeft')} title="Align left">
                <AlignLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('justifyCenter')} title="Align center">
                <AlignCenter className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('justifyRight')} title="Align right">
                <AlignRight className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('formatBlock', '<blockquote>')} title="Quote">
                <Quote className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd('formatBlock', '<pre>')} title="Code block">
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                const url = prompt('Enter URL:');
                if (url) execCmd('createLink', url);
              }} title="Insert link">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Content editable area */}
            <div className="flex-1 overflow-y-auto">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                className="min-h-full p-6 prose prose-sm dark:prose-invert max-w-none focus:outline-none
                  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
                  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
                  [&_p]:my-1 [&_ul]:my-2 [&_ol]:my-2
                  [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic
                  [&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-xs [&_pre]:font-mono
                  [&_a]:text-primary [&_a]:underline"
                data-placeholder="Start writing..."
              />
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-10 w-10 text-primary/50" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Note Maker</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Create personal notes with rich formatting. Share via Gmail or WhatsApp, and download anytime.
              </p>
              <Button onClick={createNote} className="gap-2">
                <Plus className="h-4 w-4" /> Create Your First Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
