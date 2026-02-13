/**
 * Flashcard Review page — spaced-repetition study UI with card flip and quality rating.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { flashcardService } from '@/lib/services';
import { useToast } from '@/components/ui/use-toast';
import type { FlashcardDeck, Flashcard } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, RotateCcw, Brain, CheckCircle2, XCircle,
  Loader2, Layers, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';

export default function FlashcardReview() {
  const { id } = useParams<{ id: string }>();
  const deckId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const loadDeck = useCallback(async () => {
    try {
      const [deckRes, dueRes] = await Promise.all([
        flashcardService.deckDetail(deckId),
        flashcardService.dueCards(deckId),
      ]);
      setDeck(deckRes.data);
      const dueCards = Array.isArray(dueRes.data) ? dueRes.data : [];
      if (dueCards.length === 0 && deckRes.data.cards && deckRes.data.cards.length > 0) {
        // No due cards, show all cards for browsing
        setCards(deckRes.data.cards);
      } else {
        setCards(dueCards);
      }
    } catch {
      toast({ title: 'Error', description: 'Could not load deck.', variant: 'destructive' });
      navigate('/dashboard/flashcards');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { loadDeck(); }, [loadDeck]);

  const currentCard = cards[currentIndex] || null;
  const totalCards = cards.length;
  const progress = totalCards > 0 ? ((completed) / totalCards) * 100 : 0;

  const handleRate = async (quality: 0 | 3 | 4 | 5) => {
    if (!currentCard || reviewing) return;
    setReviewing(true);
    try {
      await flashcardService.reviewCard(currentCard.id, quality);
      setCompleted(prev => prev + 1);
      setFlipped(false);

      if (currentIndex + 1 >= totalCards) {
        setSessionDone(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } catch {
      toast({ title: 'Error', description: 'Could not submit review.', variant: 'destructive' });
    } finally {
      setReviewing(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCompleted(0);
    setSessionDone(false);
    setFlipped(false);
    loadDeck();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deck) return null;

  // Session complete screen
  if (sessionDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <p className="text-muted-foreground">
          You reviewed <span className="font-semibold">{completed}</span> card{completed !== 1 ? 's' : ''} from <span className="font-semibold">{deck.title}</span>.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={handleRestart} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Study Again
          </Button>
          <Link to="/dashboard/flashcards">
            <Button className="gap-2">
              <Layers className="h-4 w-4" /> All Decks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // No cards
  if (totalCards === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">No cards to review</h2>
        <p className="text-muted-foreground text-sm">This deck has no cards, or all cards have been reviewed and are not yet due.</p>
        <Link to="/dashboard/flashcards">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Decks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/flashcards">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{deck.title}</h1>
          <p className="text-xs text-muted-foreground">
            Card {currentIndex + 1} of {totalCards} · {completed} reviewed
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Layers className="h-3 w-3 mr-1" /> {deck.card_count} total
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Flashcard */}
      <div
        className="relative cursor-pointer select-none"
        onClick={() => setFlipped(!flipped)}
      >
        <Card className={`min-h-[280px] flex items-center justify-center transition-all duration-300 ${flipped ? 'bg-primary/5 border-primary/30' : ''}`}>
          <CardContent className="p-8 text-center w-full">
            {!flipped ? (
              <>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Question</div>
                <p className="text-lg font-medium leading-relaxed">{currentCard?.question}</p>
                <p className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" /> Tap to reveal answer
                </p>
              </>
            ) : (
              <>
                <div className="text-xs font-medium text-primary uppercase tracking-wider mb-4">Answer</div>
                {currentCard?.answer.includes('\nSyntax:\n') ? (
                  <div className="text-left space-y-3">
                    <p className="text-lg leading-relaxed text-center">
                      {currentCard.answer.split('\nSyntax:\n')[0]}
                    </p>
                    <div className="mt-3 rounded-lg bg-slate-900 dark:bg-slate-950 p-4 text-left overflow-x-auto">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-medium">Syntax</div>
                      <pre className="text-sm text-green-400 font-mono whitespace-pre leading-relaxed">
                        {currentCard.answer.split('\nSyntax:\n').slice(1).join('\nSyntax:\n')}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-lg leading-relaxed whitespace-pre-line">{currentCard?.answer}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rating Buttons — visible after flip */}
      {flipped && (
        <div className="space-y-3">
          <p className="text-sm text-center text-muted-foreground">How well did you know this?</p>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="destructive"
              onClick={() => handleRate(0)}
              disabled={reviewing}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <XCircle className="h-5 w-5" />
              <span className="text-xs">Wrong</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRate(3)}
              disabled={reviewing}
              className="flex flex-col items-center gap-1 h-auto py-3 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-xs">Hard</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRate(4)}
              disabled={reviewing}
              className="flex flex-col items-center gap-1 h-auto py-3 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              <ChevronRight className="h-5 w-5" />
              <span className="text-xs">Good</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRate(5)}
              disabled={reviewing}
              className="flex flex-col items-center gap-1 h-auto py-3 border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xs">Easy</span>
            </Button>
          </div>
          {reviewing && (
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-center text-xs text-muted-foreground">
        Click the card to flip · Rate to advance
      </p>
    </div>
  );
}
