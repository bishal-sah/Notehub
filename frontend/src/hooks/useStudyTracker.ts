/**
 * Hook that silently tracks time spent viewing a note.
 * Sends a ping to the backend every INTERVAL seconds while the tab is active.
 * Uses Page Visibility API to pause when the tab is hidden.
 */
import { useEffect, useRef } from 'react';
import { learningService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';

const PING_INTERVAL = 30_000; // 30 seconds

export function useStudyTracker(noteId: number | undefined) {
  const { isAuthenticated } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (!noteId || !isAuthenticated) return;

    const handleVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const ping = () => {
      if (visibleRef.current) {
        learningService.ping(noteId, 30).catch(() => {});
      }
    };

    // Initial ping after a short delay (user actually started reading)
    const initialTimeout = setTimeout(() => {
      ping();
      intervalRef.current = setInterval(ping, PING_INTERVAL);
    }, 5_000); // wait 5s before first ping

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [noteId, isAuthenticated]);
}
