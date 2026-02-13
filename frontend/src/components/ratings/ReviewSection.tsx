/**
 * Review section for NoteDetailPage — shows all reviews and lets authenticated users rate/review.
 */
import { useEffect, useState } from 'react';
import { ratingService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { NoteRating } from '@/types';
import StarRating from '@/components/ratings/StarRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Star, Loader2, Trash2, Send } from 'lucide-react';

interface ReviewSectionProps {
  noteId: number;
  noteSlug: string;
  onRatingChange?: () => void;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ReviewSection({ noteId, noteSlug, onRatingChange }: ReviewSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [ratings, setRatings] = useState<NoteRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState<number>(0);
  const [myReview, setMyReview] = useState('');
  const [myExistingId, setMyExistingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRatings = async () => {
    try {
      const res = await ratingService.list(noteSlug);
      const data = res.data;
      setRatings(Array.isArray(data) ? data : (data as any)?.results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadMyRating = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await ratingService.myRating(noteSlug);
      if (res.status === 200 && res.data) {
        setMyRating(res.data.rating);
        setMyReview(res.data.review || '');
        setMyExistingId(res.data.id);
      }
    } catch {
      // 204 or error — no existing rating
    }
  };

  useEffect(() => {
    loadRatings();
    loadMyRating();
  }, [noteSlug]);

  const handleSubmit = async () => {
    if (myRating === 0) {
      toast({ title: 'Select a rating', description: 'Please select 1-5 stars.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await ratingService.create({ note: noteId, rating: myRating, review: myReview });
      setMyExistingId(res.data.id);
      toast({ title: 'Rating submitted', description: 'Thanks for your review!' });
      loadRatings();
      onRatingChange?.();
    } catch {
      toast({ title: 'Error', description: 'Could not submit rating.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myExistingId) return;
    setSubmitting(true);
    try {
      await ratingService.delete(myExistingId);
      setMyRating(0);
      setMyReview('');
      setMyExistingId(null);
      toast({ title: 'Rating removed' });
      loadRatings();
      onRatingChange?.();
    } catch {
      toast({ title: 'Error', description: 'Could not delete rating.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Compute average
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : 0;

  // Distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => r.rating === star).length,
    pct: ratings.length > 0 ? (ratings.filter(r => r.rating === star).length / ratings.length) * 100 : 0,
  }));

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-yellow-500" />
          Ratings & Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Average */}
              <div className="text-center sm:text-left">
                <p className="text-4xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
                <StarRating value={avgRating} readonly size="md" />
                <p className="text-sm text-muted-foreground mt-1">
                  {ratings.length} rating{ratings.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Distribution bars */}
              <div className="flex-1 space-y-1">
                {dist.map(d => (
                  <div key={d.star} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-right">{d.star}</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full rounded-full transition-all"
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Submit rating form */}
            {isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  {myExistingId ? 'Update your rating' : 'Rate this note'}
                </p>
                <StarRating value={myRating} onChange={setMyRating} size="lg" />
                <Textarea
                  placeholder="Write a review (optional)..."
                  value={myReview}
                  onChange={e => setMyReview(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={submitting || myRating === 0} className="gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {myExistingId ? 'Update' : 'Submit'}
                  </Button>
                  {myExistingId && (
                    <Button variant="outline" onClick={handleDelete} disabled={submitting} className="gap-2">
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <a href="/login" className="text-primary underline">Log in</a> to rate this note.
              </p>
            )}

            {/* Review list */}
            {ratings.filter(r => r.review).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <p className="text-sm font-medium">Reviews</p>
                  {ratings.filter(r => r.review).map(r => (
                    <div key={r.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={r.user_avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {initials(r.user_name || r.user_username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.user_name || r.user_username}</span>
                          <StarRating value={r.rating} readonly size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{r.review}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
