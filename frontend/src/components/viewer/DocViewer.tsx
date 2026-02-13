/**
 * Fallback viewer for non-PDF documents (doc, docx, ppt, pptx).
 * Uses Microsoft Office Online viewer for rendering.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocViewerProps {
  fileUrl: string;
  fileType: string;
  fileName?: string;
  onDownload?: () => void;
}

export default function DocViewer({ fileUrl, fileType, fileName, onDownload }: DocViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Build the full absolute URL for the Office viewer
  const absoluteUrl = fileUrl.startsWith('http')
    ? fileUrl
    : `${window.location.origin}${fileUrl}`;

  // Microsoft Office Online viewer URL
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;

  // Google Docs viewer as fallback
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;

  const isOfficeFile = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileType?.toLowerCase());

  if (!isOfficeFile) {
    return (
      <div className="border rounded-lg p-8 text-center space-y-4 bg-muted/30">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
        <div>
          <p className="font-medium">Preview not available</p>
          <p className="text-sm text-muted-foreground mt-1">
            This file format ({fileType?.toUpperCase()}) cannot be previewed in the browser.
          </p>
        </div>
        {onDownload && (
          <Button className="gap-2" onClick={onDownload}>
            <Download className="h-4 w-4" /> Download to View
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-background border-b">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{fileName || 'Document Preview'}</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded uppercase">{fileType}</span>
        </div>
        <div className="flex items-center gap-1">
          <a href={absoluteUrl} target="_blank" rel="noreferrer">
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

      {/* Iframe viewer */}
      <div className="relative h-[70vh]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document preview...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <FileText className="h-12 w-12" />
            <div className="text-center">
              <p className="font-medium">Preview failed to load</p>
              <p className="text-sm mt-1">The document may not be publicly accessible for preview.</p>
            </div>
            {onDownload && (
              <Button variant="outline" className="gap-2" onClick={onDownload}>
                <Download className="h-4 w-4" /> Download Instead
              </Button>
            )}
          </div>
        ) : (
          <iframe
            src={officeViewerUrl}
            className={cn('w-full h-full border-0', loading && 'invisible')}
            title="Document Preview"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        )}
      </div>
    </div>
  );
}
