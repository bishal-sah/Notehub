/**
 * "Verified by Topper" badge + verification UI.
 * Shows a gold badge on notes verified by high-scoring students.
 * Toppers can verify/unverify notes from this component.
 */
import { useEffect, useState, useCallback } from 'react';
import { topperService } from '@/lib/services';
import type { TopperStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ShieldCheck, Award, Loader2, ChevronDown,
} from 'lucide-react';

interface Props {
  slug: string;
  /** Compact mode — only shows the badge, no verify button */
  compact?: boolean;
}

export default function TopperBadge({ slug, compact = false }: Props) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<TopperStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [showVerifiers, setShowVerifiers] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await topperService.status(slug);
      setStatus(res.data);
    } catch {
      // silent — feature degrades gracefully
    }
  }, [slug]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await topperService.verify(slug, comment);
      toast({ title: 'Note verified!', description: 'Your topper verification badge has been added.' });
      setShowDialog(false);
      setComment('');
      fetchStatus();
    } catch (err: any) {
      toast({
        title: 'Cannot verify',
        description: err?.response?.data?.error || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnverify = async () => {
    setVerifying(true);
    try {
      await topperService.unverify(slug);
      toast({ title: 'Verification removed' });
      fetchStatus();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.error || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  if (!status) return null;

  /* ─── Compact badge (for note cards) ─── */
  if (compact) {
    if (!status.topper_verified) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] gap-0.5 px-1.5 py-0 border-0 shadow-sm cursor-default">
              <ShieldCheck className="h-3 w-3" />
              Topper Verified
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            Verified by {status.verification_count} top student{status.verification_count !== 1 ? 's' : ''}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  /* ─── Full badge (for note detail page) ─── */
  return (
    <div className="space-y-2">
      {/* Main badge row */}
      <div className="flex items-center gap-2 flex-wrap">
        {status.topper_verified ? (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white gap-1 px-2.5 py-1 border-0 shadow-md text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified by Topper{status.verification_count > 1 ? 's' : ''}
            <span className="bg-white/20 rounded-full px-1.5 ml-0.5 text-[10px]">
              {status.verification_count}
            </span>
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
            <Award className="h-3 w-3" />
            Not yet verified by toppers
          </Badge>
        )}

        {/* Verify/Unverify button for toppers */}
        {isAuthenticated && status.current_user_is_topper && !compact && (
          <>
            {status.current_user_has_verified ? (
              <Button
                variant="ghost" size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleUnverify}
                disabled={verifying}
              >
                {verifying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Remove my verification
              </Button>
            ) : (
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs gap-1 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => setShowDialog(true)}
                disabled={verifying}
              >
                <ShieldCheck className="h-3 w-3" />
                Verify as Topper
              </Button>
            )}
          </>
        )}
      </div>

      {/* Verifiers list (expandable) */}
      {status.topper_verified && status.verifiers.length > 0 && (
        <div>
          <button
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => setShowVerifiers(!showVerifiers)}
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showVerifiers ? 'rotate-180' : ''}`} />
            {showVerifiers ? 'Hide' : 'Show'} verifiers
          </button>
          {showVerifiers && (
            <div className="mt-2 space-y-2">
              {status.verifiers.map((v) => (
                <div key={v.username} className="flex items-start gap-2 text-xs bg-amber-50/50 dark:bg-amber-950/10 rounded-lg p-2 border border-amber-100 dark:border-amber-900/30">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                    {(v.full_name || v.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{v.full_name || v.username}</p>
                    {v.comment && <p className="text-muted-foreground mt-0.5">{v.comment}</p>}
                    <p className="text-muted-foreground/60 text-[10px] mt-0.5">
                      {new Date(v.verified_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verify dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Verify This Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              As a top student, your verification badge helps other students trust this note's quality.
            </p>
            <Textarea
              placeholder="Optional: Why is this note good? (e.g., accurate content, clear explanations...)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px]"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleVerify}
              disabled={verifying}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
            >
              {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <ShieldCheck className="h-3.5 w-3.5" />
              Verify Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
