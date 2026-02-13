/**
 * A dismissible banner prompting users to install NoteHub as a PWA.
 * Shows only when the browser supports installation and the user hasn't dismissed it.
 */
import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';

const DISMISSED_KEY = 'notehub-pwa-banner-dismissed';

export default function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISSED_KEY);
    if (!wasDismissed) {
      setDismissed(false);
    }
  }, []);

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      setDismissed(true);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-card border shadow-xl rounded-xl p-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install NoteHub</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get the app for quick access, offline reading &amp; push notifications.
          </p>
          <div className="flex gap-2 mt-2.5">
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleInstall}>
              <Download className="h-3 w-3" /> Install App
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
