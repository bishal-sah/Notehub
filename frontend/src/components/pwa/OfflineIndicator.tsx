/**
 * Small banner that appears when the user goes offline.
 * Auto-hides when back online.
 */
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You're offline — cached notes are still available</span>
      </div>
    </div>
  );
}
