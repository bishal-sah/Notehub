/**
 * Smart note viewer that selects the appropriate viewer based on file type.
 * - PDF files → PdfViewer (react-pdf with full controls + annotations)
 * - Image files → Inline image preview
 * - Office files → DocViewer (Microsoft Office Online embed)
 * - Other files → Download prompt
 */
import { useState } from 'react';
import PdfViewer from './PdfViewer';
import DocViewer from './DocViewer';
import AnnotationLayer from '@/components/collaboration/AnnotationLayer';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import type { NoteAnnotation } from '@/types';

interface NoteViewerProps {
  fileUrl: string;
  fileType: string;
  fileName?: string;
  onDownload?: () => void;
  noteId?: number;
  noteSlug?: string;
  annotations?: NoteAnnotation[];
  onAnnotationsChange?: () => void;
}

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

function ImageViewer({ fileUrl, fileName, onDownload }: { fileUrl: string; fileName?: string; onDownload?: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 bg-background border-b">
        <span className="text-sm text-muted-foreground truncate">{fileName || 'Image Preview'}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Zoom out" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Zoom in" onClick={() => setZoom(z => Math.min(4, z + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Rotate" onClick={() => setRotation(r => (r + 90) % 360)}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <a href={fileUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          {onDownload && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-auto h-[70vh] flex items-center justify-center bg-muted/20">
        <img
          src={fileUrl}
          alt={fileName || 'Note image'}
          className="max-w-full transition-transform duration-200"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          draggable={false}
        />
      </div>
    </div>
  );
}

export default function NoteViewer({
  fileUrl, fileType, fileName, onDownload,
  noteId, noteSlug, annotations, onAnnotationsChange,
}: NoteViewerProps) {
  const type = fileType?.toLowerCase();

  if (type === 'pdf') {
    return (
      <PdfViewer
        fileUrl={fileUrl}
        fileName={fileName}
        onDownload={onDownload}
        noteId={noteId}
        noteSlug={noteSlug}
        annotations={annotations}
        onAnnotationsChange={onAnnotationsChange}
        AnnotationLayerComponent={AnnotationLayer}
      />
    );
  }

  if (IMAGE_TYPES.includes(type)) {
    return <ImageViewer fileUrl={fileUrl} fileName={fileName} onDownload={onDownload} />;
  }

  return <DocViewer fileUrl={fileUrl} fileType={type} fileName={fileName} onDownload={onDownload} />;
}
