/**
 * Annotation overlay for PDF pages — highlight-based annotations with popover discussion.
 * Renders colored highlight rectangles on top of PDF pages and shows annotation details on click.
 */
import { useState } from 'react';
import { annotationService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Highlighter, X, Check, Trash2, Loader2, Plus,
} from 'lucide-react';
import type { NoteAnnotation } from '@/types';

const ANNOTATION_COLORS = [
  { label: 'Yellow', value: '#FBBF24' },
  { label: 'Green', value: '#34D399' },
  { label: 'Blue', value: '#60A5FA' },
  { label: 'Pink', value: '#F472B6' },
  { label: 'Purple', value: '#A78BFA' },
];

interface AnnotationLayerProps {
  noteId: number;
  noteSlug: string;
  pageNumber: number;
  annotations: NoteAnnotation[];
  onAnnotationsChange: () => void;
}

export default function AnnotationLayer({
  noteId,
  noteSlug,
  pageNumber,
  annotations,
  onAnnotationsChange,
}: AnnotationLayerProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRect, setNewRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [newBody, setNewBody] = useState('');
  const [newColor, setNewColor] = useState('#FBBF24');
  const [submitting, setSubmitting] = useState(false);

  const pageAnnotations = annotations.filter(a => a.page_number === pageNumber);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!creating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDrawStart({ x, y });
    setNewRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!creating || !drawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewRect({
      x: Math.min(drawStart.x, x),
      y: Math.min(drawStart.y, y),
      w: Math.abs(x - drawStart.x),
      h: Math.abs(y - drawStart.y),
    });
  };

  const handleMouseUp = () => {
    if (!creating || !drawStart) return;
    setDrawStart(null);
    // Minimum size to count as a valid highlight
    if (newRect && newRect.w > 1 && newRect.h > 0.5) {
      // Keep the rectangle, show form
    } else {
      setNewRect(null);
    }
  };

  const handleCreate = async () => {
    if (!newRect || !newBody.trim()) return;
    setSubmitting(true);
    try {
      await annotationService.create({
        note: noteId,
        page_number: pageNumber,
        x: Math.round(newRect.x * 100) / 100,
        y: Math.round(newRect.y * 100) / 100,
        width: Math.round(newRect.w * 100) / 100,
        height: Math.round(newRect.h * 100) / 100,
        body: newBody.trim(),
        color: newColor,
      });
      setNewRect(null);
      setNewBody('');
      setCreating(false);
      onAnnotationsChange();
    } catch {
      toast({ title: 'Error', description: 'Failed to create annotation.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await annotationService.delete(id);
      setActiveAnnotation(null);
      onAnnotationsChange();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete annotation.', variant: 'destructive' });
    }
  };

  const handleResolve = async (id: number, resolved: boolean) => {
    try {
      await annotationService.update(id, { is_resolved: resolved });
      onAnnotationsChange();
    } catch {
      toast({ title: 'Error', description: 'Failed to update annotation.', variant: 'destructive' });
    }
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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

  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: creating ? 'auto' : 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Existing annotations */}
      {pageAnnotations.map((ann) => (
        <div key={ann.id}>
          {/* Highlight rectangle */}
          <div
            className="absolute cursor-pointer transition-opacity hover:opacity-90"
            style={{
              left: `${ann.x}%`,
              top: `${ann.y}%`,
              width: `${ann.width}%`,
              height: `${ann.height}%`,
              backgroundColor: ann.color || '#FBBF24',
              opacity: ann.is_resolved ? 0.15 : 0.3,
              borderRadius: 2,
              border: activeAnnotation === ann.id ? `2px solid ${ann.color || '#FBBF24'}` : 'none',
              pointerEvents: 'auto',
              zIndex: activeAnnotation === ann.id ? 20 : 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveAnnotation(activeAnnotation === ann.id ? null : ann.id);
            }}
          />

          {/* Annotation popover */}
          {activeAnnotation === ann.id && (
            <div
              className="absolute z-30 bg-background border rounded-lg shadow-xl p-3 w-72"
              style={{
                left: `${Math.min(ann.x + ann.width, 70)}%`,
                top: `${ann.y}%`,
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={ann.author_avatar || undefined} />
                  <AvatarFallback className="text-[10px]">{initials(ann.author_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{ann.author_name}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(ann.created_at)}</span>
                  </div>
                  <p className="text-xs mt-1">{ann.body}</p>
                  {ann.selected_text && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic border-l-2 pl-1.5">
                      "{ann.selected_text}"
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => setActiveAnnotation(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => handleResolve(ann.id, !ann.is_resolved)}
                >
                  <Check className="h-3 w-3" />
                  {ann.is_resolved ? 'Reopen' : 'Resolve'}
                </Button>
                {user?.id === ann.author && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(ann.id)}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* New annotation being drawn */}
      {newRect && (
        <div
          className="absolute border-2 border-dashed"
          style={{
            left: `${newRect.x}%`,
            top: `${newRect.y}%`,
            width: `${newRect.w}%`,
            height: `${newRect.h}%`,
            backgroundColor: newColor,
            opacity: 0.3,
            borderColor: newColor,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* New annotation form (shown after drawing) */}
      {newRect && !drawStart && (
        <div
          className="absolute z-30 bg-background border rounded-lg shadow-xl p-3 w-72"
          style={{
            left: `${Math.min(newRect.x + newRect.w, 70)}%`,
            top: `${newRect.y}%`,
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium mb-2">Add Annotation</p>
          <Textarea
            placeholder="What do you want to say about this section?"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={2}
            className="text-xs mb-2"
            autoFocus
          />
          <div className="flex items-center gap-1 mb-2">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c.value}
                className="h-5 w-5 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c.value,
                  borderColor: newColor === c.value ? '#000' : 'transparent',
                  transform: newColor === c.value ? 'scale(1.2)' : 'scale(1)',
                }}
                onClick={() => setNewColor(c.value)}
                title={c.label}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleCreate}
              disabled={submitting || !newBody.trim()}
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setNewRect(null); setCreating(false); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Toggle annotation mode button */}
      {isAuthenticated && !creating && (
        <div className="absolute top-2 right-2 z-20" style={{ pointerEvents: 'auto' }}>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs gap-1 opacity-60 hover:opacity-100 shadow-sm"
            onClick={(e) => { e.stopPropagation(); setCreating(true); setActiveAnnotation(null); }}
          >
            <Plus className="h-3 w-3" />
            <Highlighter className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Creating mode indicator */}
      {creating && !newRect && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ pointerEvents: 'none' }}>
          <div className="bg-background/90 backdrop-blur-sm border rounded-lg px-4 py-2 shadow-lg" style={{ pointerEvents: 'auto' }}>
            <p className="text-sm font-medium flex items-center gap-2">
              <Highlighter className="h-4 w-4 text-yellow-500" />
              Click and drag to highlight a region
            </p>
            <div className="flex justify-center mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
