/**
 * Per-Note Discussion Section — community-driven knowledge.
 *
 * Features:
 * - Ask doubts (questions) and clarify topics
 * - Threaded replies with nested answers
 * - Upvote/downvote answers (toggle)
 * - Mark best answer (note author only)
 * - Sort by newest / most voted / questions only
 * - Question badge and best answer highlight
 */
import { useState, useEffect } from 'react';
import { commentService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare, Send, Reply, Pencil, Trash2, Loader2, CornerDownRight,
  ThumbsUp, HelpCircle, CheckCircle2, ArrowUpDown, Flame,
} from 'lucide-react';
import type { NoteComment, NoteCommentReply } from '@/types';

type SortMode = 'newest' | 'votes' | 'questions';

interface CommentThreadProps {
  noteId: number;
  noteSlug: string;
  noteAuthorId?: number;
}

export default function CommentThread({ noteId, noteSlug, noteAuthorId }: CommentThreadProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const loadComments = async () => {
    try {
      const res = await commentService.list(noteSlug);
      const data = res.data;
      setComments(Array.isArray(data) ? data : (data as any)?.results ?? []);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [noteSlug]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await commentService.create({
        note: noteId,
        body: newComment.trim(),
        is_question: isQuestion,
      });
      setNewComment('');
      setIsQuestion(false);
      await loadComments();
    } catch {
      toast({ title: 'Error', description: 'Failed to post comment.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      await commentService.create({ note: noteId, parent: parentId, body: replyBody.trim() });
      setReplyingTo(null);
      setReplyBody('');
      await loadComments();
    } catch {
      toast({ title: 'Error', description: 'Failed to post reply.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: number) => {
    if (!editBody.trim()) return;
    try {
      await commentService.update(id, editBody.trim());
      setEditingId(null);
      setEditBody('');
      await loadComments();
    } catch {
      toast({ title: 'Error', description: 'Failed to edit comment.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await commentService.delete(id);
      await loadComments();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete comment.', variant: 'destructive' });
    }
  };

  const handleVote = async (id: number) => {
    if (!isAuthenticated) {
      toast({ title: 'Please log in to upvote', variant: 'destructive' });
      return;
    }
    try {
      await commentService.vote(id);
      await loadComments();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleBestAnswer = async (id: number) => {
    try {
      await commentService.bestAnswer(id);
      await loadComments();
    } catch {
      toast({ title: 'Error', description: 'Could not mark best answer.', variant: 'destructive' });
    }
  };

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

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isNoteAuthor = user?.id === noteAuthorId;

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (sortMode === 'votes') return (b.vote_count || 0) - (a.vote_count || 0);
    if (sortMode === 'questions') {
      if (a.is_question && !b.is_question) return -1;
      if (!a.is_question && b.is_question) return 1;
      return 0;
    }
    return 0; // newest is default from API
  });

  const questionCount = comments.filter(c => c.is_question).length;
  const totalReplies = comments.reduce((s, c) => s + (c.reply_count || 0), 0);

  const renderComment = (
    comment: NoteComment | NoteCommentReply,
    isReply = false
  ) => {
    const isOwner = user?.id === comment.author;
    const isEditing = editingId === comment.id;
    const hasVoted = comment.user_has_voted;
    const voteCount = comment.vote_count || 0;

    return (
      <div
        key={comment.id}
        className={`${isReply ? 'ml-8 pl-4 border-l-2' : ''} ${
          comment.is_best_answer
            ? isReply ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10 rounded-r-lg' : ''
            : isReply ? 'border-muted' : ''
        }`}
      >
        <div className="flex gap-3 py-3">
          {/* Upvote column */}
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <button
              onClick={() => handleVote(comment.id)}
              className={`p-1 rounded transition-colors ${
                hasVoted
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              }`}
              title={hasVoted ? 'Remove upvote' : 'Upvote'}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <span className={`text-xs font-semibold ${voteCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {voteCount}
            </span>
          </div>

          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={comment.author_avatar || undefined} />
            <AvatarFallback className="text-xs">{initials(comment.author_name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{comment.author_name}</span>
              <span className="text-xs text-muted-foreground">@{comment.author_username}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
              {comment.is_edited && (
                <span className="text-xs text-muted-foreground italic">(edited)</span>
              )}
              {comment.is_question && (
                <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-300 text-amber-600 dark:text-amber-400 px-1.5 py-0">
                  <HelpCircle className="h-2.5 w-2.5" /> Question
                </Badge>
              )}
              {comment.is_best_answer && (
                <Badge className="text-[10px] gap-0.5 bg-green-600 text-white px-1.5 py-0">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Best Answer
                </Badge>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(comment.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className={`text-sm mt-1 whitespace-pre-wrap ${comment.is_deleted ? 'italic text-muted-foreground' : ''}`}>
                {comment.body}
              </p>
            )}

            {/* Actions */}
            {!comment.is_deleted && !isEditing && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {isAuthenticated && !isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                      setReplyBody('');
                    }}
                  >
                    <Reply className="h-3 w-3 mr-1" /> Reply
                  </Button>
                )}
                {/* Best answer toggle (note author can mark replies as best answer) */}
                {isNoteAuthor && isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 px-2 text-xs ${
                      comment.is_best_answer
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => handleBestAnswer(comment.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {comment.is_best_answer ? 'Unmark Best' : 'Best Answer'}
                  </Button>
                )}
                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="ml-14 mb-3 flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Write a reply or answer..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(comment.id);
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                className="h-8"
                onClick={() => handleReply(comment.id)}
                disabled={submitting || !replyBody.trim()}
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setReplyingTo(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies — sort best answers to top */}
        {'replies' in comment && (comment as NoteComment).replies?.length > 0 && (
          <div>
            {[...(comment as NoteComment).replies]
              .sort((a, b) => {
                if (a.is_best_answer && !b.is_best_answer) return -1;
                if (!a.is_best_answer && b.is_best_answer) return 1;
                return (b.vote_count || 0) - (a.vote_count || 0);
              })
              .map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Discussion</h3>
          <Badge variant="secondary" className="text-xs">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </Badge>
          {questionCount > 0 && (
            <Badge variant="outline" className="text-xs gap-0.5 border-amber-300 text-amber-600">
              <HelpCircle className="h-3 w-3" /> {questionCount} question{questionCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {totalReplies > 0 && (
            <Badge variant="outline" className="text-xs gap-0.5">
              <Reply className="h-3 w-3" /> {totalReplies} repl{totalReplies !== 1 ? 'ies' : 'y'}
            </Badge>
          )}
        </div>

        {/* Sort controls */}
        {comments.length > 1 && (
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            {(['newest', 'votes', 'questions'] as SortMode[]).map((mode) => (
              <Button
                key={mode}
                variant={sortMode === mode ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs capitalize"
                onClick={() => setSortMode(mode)}
              >
                {mode === 'votes' && <Flame className="h-3 w-3 mr-0.5" />}
                {mode === 'questions' && <HelpCircle className="h-3 w-3 mr-0.5" />}
                {mode}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* New comment form */}
      {isAuthenticated ? (
        <div className="flex gap-3 bg-muted/30 rounded-lg p-3 border border-dashed">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user?.avatar || undefined} />
            <AvatarFallback className="text-xs">{user ? initials(user.full_name || user.username) : '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder={isQuestion ? 'Ask a doubt or question about this note...' : 'Add a comment, share insights, or help others...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="text-sm bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={isQuestion ? 'default' : 'outline'}
                  size="sm"
                  className={`h-7 text-xs gap-1 ${isQuestion ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                  onClick={() => setIsQuestion(!isQuestion)}
                >
                  <HelpCircle className="h-3 w-3" />
                  {isQuestion ? 'Posting as Question' : 'Ask a Question'}
                </Button>
                <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {isQuestion ? 'Post Question' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center border border-dashed">
          <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
          Please <a href="/login" className="underline font-medium text-primary">log in</a> to join the discussion, ask doubts, or upvote answers.
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CornerDownRight className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No discussions yet</p>
          <p className="text-xs mt-0.5">Be the first to start the conversation! Ask a doubt or share your insights.</p>
        </div>
      ) : (
        <div className="divide-y">
          {sortedComments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
