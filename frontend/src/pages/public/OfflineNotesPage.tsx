/**
 * Page that displays offline-cached notes when the user is offline.
 * Accessible from the main nav or automatically when network is unavailable.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllOfflineNotes, removeNoteOffline, type OfflineNote } from '@/lib/offlineCache';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { WifiOff, FileText, Trash2, HardDrive, Loader2 } from 'lucide-react';

export default function OfflineNotesPage() {
  const isOnline = useOnlineStatus();
  const [notes, setNotes] = useState<OfflineNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllOfflineNotes()
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (slug: string) => {
    await removeNoteOffline(slug);
    setNotes((prev) => prev.filter((n) => n.slug !== slug));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <HardDrive className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Offline Notes</h1>
          {!isOnline && (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" /> Offline
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          These notes have been saved for offline reading. You can access them anytime, even without internet.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HardDrive className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notes saved offline yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bookmark notes and they'll be automatically cached for offline reading.
              </p>
              {isOnline && (
                <Link to="/browse">
                  <Button variant="outline" size="sm" className="mt-4">Browse Notes</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.slug} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/notes/${note.slug}`}
                      className="flex items-start gap-3 min-w-0 flex-1"
                    >
                      {note.thumbnail ? (
                        <img
                          src={note.thumbnail}
                          alt=""
                          className="h-14 w-14 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{note.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {note.subject_name} &middot; {note.faculty_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {note.author_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {note.file_type.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            Cached {new Date(note.cached_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                      onClick={() => handleRemove(note.slug)}
                      title="Remove from offline cache"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
