/**
 * Focus / Exam Mode — fullscreen distraction-free reading environment.
 *
 * Features:
 * - Fullscreen overlay that hides navbar, sidebar, footer, ads, comments
 * - Stopwatch timer (counts up) or Countdown timer (configurable)
 * - Ambient background with minimal chrome
 * - Keyboard shortcuts (Esc to exit, Space to pause timer)
 * - Progress awareness bar
 * - Embedded note viewer (PDF / Image / Doc)
 * - Session stats on exit
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import NoteViewer from '@/components/viewer/NoteViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, Play, Pause, Timer, TimerReset, Clock, Maximize2,
  Minimize2, Moon, Sun, BookOpen, Target, Volume2, VolumeX,
  ChevronUp, Settings2, RotateCcw,
} from 'lucide-react';

interface FocusModeProps {
  noteTitle: string;
  noteSlug: string;
  fileUrl: string;
  fileType: string;
  subjectName?: string;
  onExit: () => void;
}

type TimerMode = 'stopwatch' | 'countdown';

const COUNTDOWN_PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
  { label: '90 min', seconds: 90 * 60 },
  { label: '120 min', seconds: 120 * 60 },
];

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FocusMode({
  noteTitle, noteSlug, fileUrl, fileType, subjectName, onExit,
}: FocusModeProps) {
  // Timer state
  const [timerMode, setTimerMode] = useState<TimerMode>('stopwatch');
  const [countdownTotal, setCountdownTotal] = useState(25 * 60); // default 25 min Pomodoro
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(true);
  const [timerDone, setTimerDone] = useState(false);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [darkOverlay, setDarkOverlay] = useState(true);
  const [ambientSound, setAmbientSound] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Session tracking
  const sessionStart = useRef(Date.now());
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide controls after 3s of inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (!showSettings) setShowControls(false);
    }, 3000);
  }, [showSettings]);

  // Timer tick
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
      if (timerMode === 'countdown') {
        setRemaining((prev) => {
          if (prev <= 1) {
            setTimerDone(true);
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [running, timerMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setRunning((r) => !r);
        resetControlsTimer();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit, resetControlsTimer]);

  // Mouse movement shows controls
  useEffect(() => {
    const handleMouse = () => resetControlsTimer();
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [resetControlsTimer]);

  // Lock scroll on body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // fullscreen not supported
    }
  };

  const handleResetTimer = () => {
    setElapsed(0);
    setRemaining(countdownTotal);
    setTimerDone(false);
    setRunning(true);
  };

  const switchTimerMode = (mode: TimerMode) => {
    setTimerMode(mode);
    setElapsed(0);
    setRemaining(countdownTotal);
    setTimerDone(false);
    setRunning(true);
    setShowSettings(false);
  };

  const selectCountdown = (seconds: number) => {
    setCountdownTotal(seconds);
    setRemaining(seconds);
    setElapsed(0);
    setTimerDone(false);
    setRunning(true);
    setShowSettings(false);
  };

  const sessionMinutes = Math.floor((Date.now() - sessionStart.current) / 60000);

  // Progress for countdown
  const countdownProgress = timerMode === 'countdown'
    ? ((countdownTotal - remaining) / countdownTotal) * 100
    : 0;

  const displayTime = timerMode === 'stopwatch'
    ? formatTime(elapsed)
    : formatTime(remaining);

  const overlay = (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col ${
        darkOverlay
          ? 'bg-gray-950 text-gray-100'
          : 'bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100'
      }`}
      onMouseMove={resetControlsTimer}
    >
      {/* ── Top bar (auto-hides) ── */}
      <div
        className={`shrink-0 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        {/* Progress bar for countdown */}
        {timerMode === 'countdown' && (
          <div className="h-1 bg-gray-800">
            <div
              className={`h-full transition-all duration-1000 ${
                timerDone ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${countdownProgress}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 backdrop-blur-sm">
          {/* Left: note info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-amber-600/20 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate max-w-[300px]">{noteTitle}</h2>
              <div className="flex items-center gap-2">
                {subjectName && (
                  <span className="text-[10px] text-gray-400">{subjectName}</span>
                )}
                <Badge className="bg-amber-600/30 text-amber-300 text-[10px] border-0 px-1.5 py-0 gap-1">
                  <Target className="h-2.5 w-2.5" />
                  Focus Mode
                </Badge>
              </div>
            </div>
          </div>

          {/* Center: timer */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => setRunning(!running)}
              title={running ? 'Pause (Space)' : 'Resume (Space)'}
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="flex items-center gap-1.5 bg-black/50 rounded-lg px-3 py-1.5 min-w-[100px] justify-center">
              {timerMode === 'stopwatch' ? (
                <Clock className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Timer className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className={`font-mono text-lg font-bold tracking-wider ${
                timerDone ? 'text-green-400 animate-pulse' : 'text-white'
              }`}>
                {displayTime}
              </span>
            </div>

            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={handleResetTimer}
              title="Reset timer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => setShowSettings(!showSettings)}
              title="Timer settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => setDarkOverlay(!darkOverlay)}
              title="Toggle theme"
            >
              {darkOverlay ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={toggleFullscreen}
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <div className="w-px h-5 bg-gray-600 mx-1" />
            <Button
              variant="ghost" size="sm"
              className="h-8 px-2 text-gray-300 hover:text-red-400 hover:bg-red-950/30 gap-1 text-xs"
              onClick={onExit}
              title="Exit Focus Mode (Esc)"
            >
              <X className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </div>

        {/* Settings dropdown */}
        {showSettings && (
          <div className="bg-black/60 backdrop-blur-md border-t border-gray-800 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4 max-w-3xl mx-auto">
              {/* Timer mode */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Timer Mode</p>
                <div className="flex gap-1">
                  <Button
                    variant={timerMode === 'stopwatch' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-xs gap-1 ${timerMode === 'stopwatch' ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                    onClick={() => switchTimerMode('stopwatch')}
                  >
                    <Clock className="h-3 w-3" /> Stopwatch
                  </Button>
                  <Button
                    variant={timerMode === 'countdown' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-xs gap-1 ${timerMode === 'countdown' ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                    onClick={() => switchTimerMode('countdown')}
                  >
                    <Timer className="h-3 w-3" /> Countdown
                  </Button>
                </div>
              </div>

              {/* Countdown presets */}
              {timerMode === 'countdown' && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Duration</p>
                  <div className="flex gap-1 flex-wrap">
                    {COUNTDOWN_PRESETS.map((p) => (
                      <Button
                        key={p.seconds}
                        variant="outline"
                        size="sm"
                        className={`h-7 text-xs ${
                          countdownTotal === p.seconds
                            ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700'
                            : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                        }`}
                        onClick={() => selectCountdown(p.seconds)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Session info */}
              <div className="ml-auto text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Session</p>
                <p className="text-xs text-gray-300">{sessionMinutes} min elapsed</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main reading area ── */}
      <div className="flex-1 overflow-hidden relative">
        {/* Timer done celebration */}
        {timerDone && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 rounded-full bg-green-600/20 flex items-center justify-center mx-auto">
                <Target className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Time's Up!</h2>
              <p className="text-gray-300">
                You studied for <span className="text-amber-400 font-semibold">{formatTime(countdownTotal)}</span>. Great focus!
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-200 hover:bg-gray-800"
                  onClick={onExit}
                >
                  <X className="h-4 w-4 mr-1.5" /> Exit
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                  onClick={handleResetTimer}
                >
                  <RotateCcw className="h-4 w-4" /> Continue Studying
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={`h-full overflow-auto ${darkOverlay ? 'focus-dark-viewer' : ''}`}>
          <div className="max-w-5xl mx-auto py-4 px-4">
            <NoteViewer
              fileUrl={fileUrl}
              fileType={fileType || 'pdf'}
              fileName={noteTitle}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom hint bar (auto-hides with controls) ── */}
      <div
        className={`shrink-0 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-center gap-4 px-4 py-1.5 bg-black/30 backdrop-blur-sm text-[10px] text-gray-500">
          <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Esc</kbd> Exit</span>
          <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Space</kbd> Pause / Resume</span>
          <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">F</kbd> Fullscreen</span>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
