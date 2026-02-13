/**
 * Bookmark toggle button — bookmarks/unbookmarks a note.
 * Shows filled icon when bookmarked, outline when not.
 */
import { useEffect, useState } from 'react';
import { bookmarkService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cacheNoteForOffline, removeNoteOffline } from '@/lib/offlineCache';

interface BookmarkNoteData {
  slug: string;
  title: string;
  description: string;
  subject_name: string;
  faculty_name: string;
  author_name: string;
  file_type: string;
  file?: string;
  thumbnail: string | null;
  created_at: string;
}

interface BookmarkButtonProps {
  noteId: number;
  noteData?: BookmarkNoteData;
  variant?: 'icon' | 'button';
  className?: string;
  onToggle?: (bookmarked: boolean) => void;
}

export default function BookmarkButton({
  noteId,
  noteData,
  variant = 'icon',
  className,
  onToggle,
}: BookmarkButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }
    bookmarkService.status(noteId)
      .then(res => setIsBookmarked(res.data.is_bookmarked))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [noteId, isAuthenticated]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({ title: 'Login required', description: 'Please log in to bookmark notes.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await bookmarkService.toggle(noteId);
      setIsBookmarked(res.data.bookmarked);
      // Cache/uncache note for offline reading
      if (res.data.bookmarked && noteData) {
        cacheNoteForOffline(noteData).catch(() => {});
      } else if (!res.data.bookmarked && noteData) {
        removeNoteOffline(noteData.slug).catch(() => {});
      }
      toast({
        title: res.data.bookmarked ? 'Bookmarked' : 'Bookmark removed',
        description: res.data.bookmarked ? 'Saved for offline reading.' : 'Removed from your library.',
      });
      onToggle?.(res.data.bookmarked);
    } catch {
      toast({ title: 'Error', description: 'Could not update bookmark.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'p-1.5 rounded-md transition-colors hover:bg-muted',
          className
        )}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this note'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isBookmarked ? (
          <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
        ) : (
          <Bookmark className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    );
  }

  return (
    <Button
      variant={isBookmarked ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={cn('gap-2', className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isBookmarked ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
    </Button>
  );
}
