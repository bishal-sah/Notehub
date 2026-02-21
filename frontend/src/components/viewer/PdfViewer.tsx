/**
 * In-browser PDF viewer — continuous scroll with all pages rendered.
 * Supports zoom, rotation, fullscreen, page navigation (scroll-to), and keyboard shortcuts.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize,
  Loader2,
  FileWarning,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NoteAnnotation } from '@/types';

// Configure pdf.js worker for react-pdf v10 (pdfjs-dist v5.x uses .mjs)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  fileUrl: string;
  fileName?: string;
  onDownload?: () => void;
  noteId?: number;
  noteSlug?: string;
  annotations?: NoteAnnotation[];
  onAnnotationsChange?: () => void;
  AnnotationLayerComponent?: React.ComponentType<{
    noteId: number;
    noteSlug: string;
    pageNumber: number;
    annotations: NoteAnnotation[];
    onAnnotationsChange: () => void;
  }>;
}

const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_PRESETS = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
];

export default function PdfViewer({
  fileUrl, fileName, onDownload,
  noteId, noteSlug, annotations, onAnnotationsChange, AnnotationLayerComponent,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  // Memoize the file prop so react-pdf Document doesn't remount on every render
  const pdfFile = useMemo(() => pdfData ? { data: new Uint8Array(pdfData) } : null, [pdfData]);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isScrollingToPage = useRef(false);

  // Pre-fetch PDF as binary data to bypass proxy/CORS issues
  useEffect(() => {
    if (!fileUrl) return;
    setLoading(true);
    setError(false);
    setPdfData(null);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => {
        // Store as Uint8Array so the underlying buffer isn't detached on re-render
        setPdfData(new Uint8Array(buf));
      })
      .catch((err) => {
        console.error('PDF fetch error:', err, 'URL:', fileUrl);
        setError(true);
        setLoading(false);
      });
  }, [fileUrl]);

  // Measure container width for responsive scaling
  useEffect(() => {
    const measure = () => {
      if (viewerRef.current) {
        setContainerWidth(viewerRef.current.clientWidth - 48);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isFullscreen]);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setCurrentPage(1);
    setPageInputValue('1');
    setLoading(false);
    setError(false);
  }, []);

  const onDocumentLoadError = useCallback((err: any) => {
    console.error('PDF parse error:', err);
    setError(true);
    setLoading(false);
  }, []);

  // Track current page based on scroll position
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || numPages === 0) return;

    const handleScroll = () => {
      if (isScrollingToPage.current) return;
      const viewerRect = viewer.getBoundingClientRect();
      const viewerMid = viewerRect.top + viewerRect.height / 3;

      let closestPage = 1;
      let closestDist = Infinity;

      pageRefs.current.forEach((el, pageNum) => {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - viewerMid);
        if (dist < closestDist) {
          closestDist = dist;
          closestPage = pageNum;
        }
      });

      if (closestPage !== currentPage) {
        setCurrentPage(closestPage);
        setPageInputValue(String(closestPage));
      }
    };

    viewer.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewer.removeEventListener('scroll', handleScroll);
  }, [numPages, currentPage]);

  // Scroll to a specific page
  const scrollToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, numPages));
    const el = pageRefs.current.get(p);
    if (el && viewerRef.current) {
      isScrollingToPage.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(p);
      setPageInputValue(String(p));
      setTimeout(() => { isScrollingToPage.current = false; }, 800);
    }
  };

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseInt(pageInputValue);
      if (!isNaN(val)) scrollToPage(val);
    }
  };

  // Zoom
  const zoomIn = () => setScale((s) => Math.min(s + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setScale((s) => Math.max(s - ZOOM_STEP, MIN_ZOOM));
  const setZoomPreset = (value: number) => setScale(value);

  // Rotation
  const rotate = () => setRotation((r) => (r + 90) % 360);

  // Fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case 'r':
          e.preventDefault();
          rotate();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Store page ref callback
  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(pageNum, el);
    else pageRefs.current.delete(pageNum);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col border rounded-lg overflow-hidden',
        isFullscreen ? 'bg-background fixed inset-0 z-50' : 'bg-muted/30'
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-background border-b flex-wrap">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous page"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 text-sm">
            <Input
              className="h-7 w-12 text-center text-xs px-1"
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onKeyDown={handlePageInput}
              onBlur={() => {
                const val = parseInt(pageInputValue);
                if (!isNaN(val)) scrollToPage(val);
                else setPageInputValue(String(currentPage));
              }}
            />
            <span className="text-muted-foreground text-xs">/ {numPages}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            title="Next page"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut} disabled={scale <= MIN_ZOOM}>
            <ZoomOut className="h-4 w-4" />
          </Button>

          <select
            className="h-7 text-xs bg-background border rounded px-1.5 cursor-pointer"
            value={scale}
            onChange={(e) => setZoomPreset(parseFloat(e.target.value))}
          >
            {ZOOM_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn} disabled={scale >= MAX_ZOOM}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={rotate} title="Rotate (R)">
            <RotateCw className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title="Fullscreen (F)">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          {onDownload && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Scrollable Viewer Area — all pages rendered ── */}
      <div
        ref={viewerRef}
        className={cn(
          'flex-1 overflow-auto',
          isFullscreen ? 'h-[calc(100vh-48px)]' : 'h-[80vh]'
        )}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <FileWarning className="h-12 w-12" />
            <div className="text-center">
              <p className="font-medium">Unable to load PDF</p>
              <p className="text-sm mt-1">The file may be corrupted or in an unsupported format.</p>
              {onDownload && (
                <Button variant="outline" className="mt-4 gap-2" onClick={onDownload}>
                  <Download className="h-4 w-4" /> Download Instead
                </Button>
              )}
            </div>
          </div>
        ) : !pdfData ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Downloading PDF...</p>
            </div>
          </div>
        ) : (
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Rendering pages...</p>
                </div>
              </div>
            }
          >
            <div className="flex flex-col items-center gap-4 py-4">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  ref={(el) => setPageRef(pageNum, el)}
                  className="relative"
                >
                  <Page
                    pageNumber={pageNum}
                    scale={scale}
                    rotate={rotation}
                    width={containerWidth > 0 && scale === 1.0 ? Math.min(containerWidth, 900) : undefined}
                    loading={
                      <div className="flex items-center justify-center py-20 w-[600px]">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    }
                    className="shadow-lg"
                  />
                  {/* Annotation overlay */}
                  {AnnotationLayerComponent && noteId && noteSlug && annotations && onAnnotationsChange && (
                    <AnnotationLayerComponent
                      noteId={noteId}
                      noteSlug={noteSlug}
                      pageNumber={pageNum}
                      annotations={annotations}
                      onAnnotationsChange={onAnnotationsChange}
                    />
                  )}
                  <div className="absolute bottom-2 right-3 bg-background/80 backdrop-blur-sm text-[10px] text-muted-foreground px-2 py-0.5 rounded">
                    {pageNum} / {numPages}
                  </div>
                </div>
              ))}
            </div>
          </Document>
        )}
      </div>

      {/* ── Bottom bar ── */}
      {!error && numPages > 0 && (
        <div className="px-3 py-1.5 bg-background border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            <span className="hidden sm:inline">
              Scroll to read &nbsp;|&nbsp; + − Zoom &nbsp;|&nbsp; R Rotate &nbsp;|&nbsp; F Fullscreen &nbsp;|&nbsp; Enter page number to jump
            </span>
            <span className="sm:hidden">
              Page {currentPage} of {numPages} &bull; {Math.round(scale * 100)}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
