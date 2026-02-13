/**
 * Collaborative Note Layers — community-contributed clarifications,
 * examples, and alternate explanations layered on top of the original note.
 * The original note stays completely untouched.
 */
import { useEffect, useState, useCallback } from 'react';
import { layerService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import type { NoteLayer, LayerType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Layers, Plus, ThumbsUp, ThumbsDown, Pin, Trash2, ChevronDown,
  ChevronUp, Lightbulb, BookOpen, FileText, CheckCircle, AlertCircle, Link2, X,
} from 'lucide-react';

interface CommunityLayersProps {
  noteSlug: string;
  noteAuthorId?: number;
}

const LAYER_TYPE_CONFIG: Record<LayerType, { label: string; icon: React.ReactNode; color: string }> = {
  clarification: { label: 'Clarification', icon: <Lightbulb className="h-3.5 w-3.5" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  example: { label: 'Example', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  explanation: { label: 'Alternate Explanation', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  summary: { label: 'Summary', icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  correction: { label: 'Correction', icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  resource: { label: 'Additional Resource', icon: <Link2 className="h-3.5 w-3.5" />, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
};

export default function CommunityLayers({ noteSlug, noteAuthorId }: CommunityLayersProps) {
  const { user, isAuthenticated } = useAuth();
  const [layers, setLayers] = useState<NoteLayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Form state
  const [formType, setFormType] = useState<LayerType>('clarification');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchLayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await layerService.list(noteSlug);
      setLayers(res.data.layers);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [noteSlug]);

  useEffect(() => {
    if (showLayers) fetchLayers();
  }, [showLayers, fetchLayers]);

  const handleSubmit = async () => {
    if (!formTitle.trim() || formContent.trim().length < 10) {
      setError('Title is required and content must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await layerService.create(noteSlug, {
        layer_type: formType,
        title: formTitle.trim(),
        content: formContent.trim(),
      });
      setLayers(prev => [res.data, ...prev]);
      setFormTitle('');
      setFormContent('');
      setShowForm(false);
    } catch {
      setError('Failed to add layer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (layerId: number, voteType: 'up' | 'down') => {
    try {
      const res = await layerService.vote(layerId, voteType);
      setLayers(prev => prev.map(l => l.id === layerId ? res.data : l));
    } catch {
      // silent
    }
  };

  const handlePin = async (layerId: number) => {
    try {
      const res = await layerService.pin(layerId);
      setLayers(prev => prev.map(l => l.id === layerId ? res.data : l));
    } catch {
      // silent
    }
  };

  const handleDelete = async (layerId: number) => {
    try {
      await layerService.delete(layerId);
      setLayers(prev => prev.filter(l => l.id !== layerId));
    } catch {
      // silent
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isNoteAuthor = user?.id === noteAuthorId;

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <Button
        variant={showLayers ? 'default' : 'outline'}
        className="gap-2 w-full sm:w-auto"
        onClick={() => setShowLayers(!showLayers)}
      >
        <Layers className="h-4 w-4" />
        {showLayers ? 'Hide Community Layers' : 'Show Community Layers'}
        {!showLayers && layers.length > 0 && (
          <Badge variant="secondary" className="ml-1">{layers.length}</Badge>
        )}
      </Button>

      {/* Layers Panel */}
      {showLayers && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Community Layers
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Knowledge evolves — add clarifications, examples, or alternate explanations without editing the original note.
              </p>
            </div>
            {isAuthenticated && (
              <Button
                size="sm"
                variant={showForm ? 'secondary' : 'default'}
                className="gap-1.5 shrink-0"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showForm ? 'Cancel' : 'Add Layer'}
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Add Layer Form */}
            {showForm && isAuthenticated && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Layer title (e.g., 'Simplified explanation of Chapter 3')"
                        value={formTitle}
                        onChange={e => setFormTitle(e.target.value)}
                        maxLength={200}
                      />
                    </div>
                    <Select value={formType} onValueChange={v => setFormType(v as LayerType)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LAYER_TYPE_CONFIG).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {cfg.icon} {cfg.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Write your contribution... (min 10 characters)"
                    value={formContent}
                    onChange={e => setFormContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? 'Adding...' : 'Add Layer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading community layers...
              </div>
            )}

            {/* Empty State */}
            {!loading && layers.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">No community layers yet.</p>
                {isAuthenticated && (
                  <p className="text-xs text-muted-foreground">
                    Be the first to add a clarification, example, or explanation!
                  </p>
                )}
              </div>
            )}

            {/* Layer Cards */}
            {!loading && layers.map(layer => {
              const cfg = LAYER_TYPE_CONFIG[layer.layer_type] || LAYER_TYPE_CONFIG.clarification;
              const isExpanded = expandedIds.has(layer.id);
              const isLong = layer.content.length > 300;
              const canDelete = user?.id === layer.author || (user as any)?.is_admin;

              return (
                <div
                  key={layer.id}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    layer.is_pinned ? 'border-primary/40 bg-primary/5' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={layer.author_avatar || ''} />
                        <AvatarFallback className="text-xs">{layer.author_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{layer.author_name}</span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {layer.is_pinned && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                              <Pin className="h-3 w-3" /> Pinned
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(layer.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Title + Content */}
                  <div>
                    <h4 className="text-sm font-semibold">{layer.title}</h4>
                    <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                      {isLong && !isExpanded
                        ? layer.content.slice(0, 300) + '...'
                        : layer.content
                      }
                    </div>
                    {isLong && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-7 text-xs gap-1 px-2"
                        onClick={() => toggleExpand(layer.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? 'Show less' : 'Read more'}
                      </Button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 gap-1.5 text-xs ${layer.user_vote === 'up' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
                      onClick={() => isAuthenticated && handleVote(layer.id, 'up')}
                      disabled={!isAuthenticated}
                      title={isAuthenticated ? 'Upvote' : 'Log in to vote'}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> {layer.upvotes}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 gap-1.5 text-xs ${layer.user_vote === 'down' ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}
                      onClick={() => isAuthenticated && handleVote(layer.id, 'down')}
                      disabled={!isAuthenticated}
                      title={isAuthenticated ? 'Downvote' : 'Log in to vote'}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> {layer.downvotes}
                    </Button>
                    <span className="text-xs text-muted-foreground ml-1">
                      Score: {layer.score}
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                      {(isNoteAuthor || (user as any)?.is_admin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 text-xs gap-1 ${layer.is_pinned ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={() => handlePin(layer.id)}
                          title={layer.is_pinned ? 'Unpin' : 'Pin this layer'}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(layer.id)}
                          title="Delete layer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
