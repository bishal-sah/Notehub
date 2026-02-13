/**
 * Study Buddy Matching page.
 * Matches users by faculty, semester, and subjects.
 * Users can browse matches, send requests, accept/reject incoming, and manage buddies.
 */
import { useEffect, useState, useCallback } from 'react';
import { studyBuddyService } from '@/lib/services';
import type { BuddyMatch, BuddyConnection, BuddyListResponse } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Users, UserPlus, Search, Loader2, Heart, Check, X,
  GraduationCap, BookOpen, Sparkles, Send, Clock, UserCheck,
} from 'lucide-react';

export default function StudyBuddies() {
  const { toast } = useToast();
  const [tab, setTab] = useState<string>('find');
  const [matches, setMatches] = useState<BuddyMatch[]>([]);
  const [buddyData, setBuddyData] = useState<BuddyListResponse | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);

  // Dialog state for sending request
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<BuddyMatch | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const res = await studyBuddyService.matches();
      setMatches(res.data.matches);
    } catch {
      toast({ title: 'Error', description: 'Failed to load matches.', variant: 'destructive' });
    } finally {
      setLoadingMatches(false);
    }
  }, [toast]);

  const fetchBuddyList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await studyBuddyService.list();
      setBuddyData(res.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load buddy list.', variant: 'destructive' });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMatches();
    fetchBuddyList();
  }, [fetchMatches, fetchBuddyList]);

  const openSendDialog = (match: BuddyMatch) => {
    setSelectedMatch(match);
    setRequestMessage('');
    setShowSendDialog(true);
  };

  const handleSendRequest = async () => {
    if (!selectedMatch) return;
    setSendingTo(selectedMatch.user.id);
    try {
      await studyBuddyService.sendRequest(selectedMatch.user.id, requestMessage);
      toast({ title: 'Request sent!', description: `Study buddy request sent to ${selectedMatch.user.full_name}.` });
      setShowSendDialog(false);
      // Remove from matches list, refresh buddy list
      setMatches((prev) => prev.filter((m) => m.user.id !== selectedMatch.user.id));
      fetchBuddyList();
    } catch (err: any) {
      toast({
        title: 'Failed',
        description: err?.response?.data?.error || 'Could not send request.',
        variant: 'destructive',
      });
    } finally {
      setSendingTo(null);
    }
  };

  const handleRespond = async (requestId: number, action: 'accept' | 'reject') => {
    setRespondingTo(requestId);
    try {
      await studyBuddyService.respond(requestId, action);
      toast({
        title: action === 'accept' ? 'Buddy added!' : 'Request declined',
        description: action === 'accept' ? 'You are now study buddies!' : 'Request has been declined.',
      });
      fetchBuddyList();
      fetchMatches();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.error || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setRespondingTo(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400';
    if (score >= 50) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400';
    return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400';
  };

  const incomingCount = buddyData?.incoming_requests.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Study Buddy Matching
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Find your perfect study partner — matched by faculty, semester, and shared subjects.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{buddyData?.total_buddies || 0}</p>
              <p className="text-xs text-muted-foreground">Buddies</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{incomingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{matches.length}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="find" className="gap-1.5">
            <Search className="h-3.5 w-3.5" /> Find Buddies
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5 relative">
            <UserPlus className="h-3.5 w-3.5" /> Requests
            {incomingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {incomingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="buddies" className="gap-1.5">
            <Heart className="h-3.5 w-3.5" /> My Buddies
          </TabsTrigger>
        </TabsList>

        {/* ── Find Buddies Tab ── */}
        <TabsContent value="find" className="mt-4 space-y-3">
          {loadingMatches ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : matches.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No matches yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload notes to subjects you study, and we'll find study partners in the same faculty, semester, and subjects.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {matches.map((match) => (
                <Card key={match.user.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={match.user.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-bold">
                          {getInitials(match.user.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{match.user.full_name}</h3>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getScoreColor(match.score)}`}>
                            {match.score}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">@{match.user.username}</p>

                        {match.user.faculty_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <GraduationCap className="h-3 w-3" />
                            {match.user.faculty_name}
                          </p>
                        )}

                        {match.user.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                            "{match.user.bio}"
                          </p>
                        )}

                        {/* Reasons / shared subjects */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {match.shared_subjects.map((subj) => (
                            <Badge key={subj} variant="outline" className="text-[10px] gap-0.5">
                              <BookOpen className="h-2.5 w-2.5" />
                              {subj}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {match.reasons.map((r, i) => (
                            <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        className="gap-1.5 h-8"
                        onClick={() => openSendDialog(match)}
                        disabled={sendingTo === match.user.id}
                      >
                        {sendingTo === match.user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Requests Tab ── */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          {loadingList ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Incoming */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Incoming Requests ({buddyData?.incoming_requests.length || 0})
                </h3>
                {!buddyData?.incoming_requests.length ? (
                  <p className="text-sm text-muted-foreground pl-6">No pending incoming requests.</p>
                ) : (
                  <div className="space-y-2">
                    {buddyData.incoming_requests.map((req) => (
                      <RequestCard
                        key={req.request_id}
                        connection={req}
                        type="incoming"
                        respondingTo={respondingTo}
                        onRespond={handleRespond}
                        getInitials={getInitials}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <Send className="h-4 w-4" />
                  Sent Requests ({buddyData?.outgoing_requests.length || 0})
                </h3>
                {!buddyData?.outgoing_requests.length ? (
                  <p className="text-sm text-muted-foreground pl-6">No pending sent requests.</p>
                ) : (
                  <div className="space-y-2">
                    {buddyData.outgoing_requests.map((req) => (
                      <RequestCard
                        key={req.request_id}
                        connection={req}
                        type="outgoing"
                        respondingTo={respondingTo}
                        onRespond={handleRespond}
                        getInitials={getInitials}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── My Buddies Tab ── */}
        <TabsContent value="buddies" className="mt-4">
          {loadingList ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !buddyData?.buddies.length ? (
            <Card className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No study buddies yet</h3>
              <p className="text-sm text-muted-foreground">
                Go to "Find Buddies" to discover study partners and send connection requests!
              </p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setTab('find')}>
                <Search className="h-3.5 w-3.5" /> Find Buddies
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {buddyData.buddies.map((buddy) => (
                <Card key={buddy.request_id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 border-2 border-green-200 dark:border-green-800">
                        <AvatarImage src={buddy.user.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-950/20 text-green-700 dark:text-green-400 text-sm font-bold">
                          {getInitials(buddy.user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{buddy.user.full_name}</h3>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px] px-1.5 py-0 border-0">
                            <UserCheck className="h-2.5 w-2.5 mr-0.5" /> Buddy
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">@{buddy.user.username}</p>
                        {buddy.user.faculty_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <GraduationCap className="h-3 w-3" />
                            {buddy.user.faculty_name}
                          </p>
                        )}
                        {buddy.subject_name && (
                          <Badge variant="outline" className="text-[10px] mt-1 gap-0.5">
                            <BookOpen className="h-2.5 w-2.5" />
                            {buddy.subject_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {buddy.message && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-md p-2 italic">
                        "{buddy.message}"
                      </p>
                    )}
                    {buddy.connected_at && (
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        Connected {new Date(buddy.connected_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Request Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Study Buddy Request
            </DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-muted rounded-lg p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedMatch.user.avatar || undefined} />
                  <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                    {getInitials(selectedMatch.user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{selectedMatch.user.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedMatch.user.faculty_name || 'No faculty'}
                    {selectedMatch.shared_subjects.length > 0 && ` · ${selectedMatch.shared_subjects.join(', ')}`}
                  </p>
                </div>
              </div>
              <Textarea
                placeholder="Introduce yourself! (optional, max 300 chars)"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="min-h-[80px]"
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground">
                They'll receive a notification and can accept or decline.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSendRequest}
              disabled={sendingTo !== null}
              className="gap-1.5"
            >
              {sendingTo !== null && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Send className="h-3.5 w-3.5" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/* ─── Request Card sub-component ─── */
interface RequestCardProps {
  connection: BuddyConnection;
  type: 'incoming' | 'outgoing';
  respondingTo: number | null;
  onRespond: (id: number, action: 'accept' | 'reject') => void;
  getInitials: (name: string) => string;
}

function RequestCard({ connection, type, respondingTo, onRespond, getInitials }: RequestCardProps) {
  const isResponding = respondingTo === connection.request_id;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={connection.user.avatar || undefined} />
            <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
              {getInitials(connection.user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{connection.user.full_name}</h4>
            <p className="text-xs text-muted-foreground">
              @{connection.user.username}
              {connection.user.faculty_name && ` · ${connection.user.faculty_name}`}
            </p>
            {connection.subject_name && (
              <Badge variant="outline" className="text-[10px] mt-0.5 gap-0.5">
                <BookOpen className="h-2.5 w-2.5" />
                {connection.subject_name}
              </Badge>
            )}
          </div>

          {/* Actions */}
          {type === 'incoming' && (
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm" variant="outline"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => onRespond(connection.request_id, 'reject')}
                disabled={isResponding}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                onClick={() => onRespond(connection.request_id, 'accept')}
                disabled={isResponding}
              >
                {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {type === 'outgoing' && (
            <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
              <Clock className="h-3 w-3" /> Pending
            </Badge>
          )}
        </div>

        {connection.message && (
          <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-md p-2 italic">
            "{connection.message}"
          </p>
        )}
        {connection.sent_at && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {type === 'incoming' ? 'Received' : 'Sent'} {new Date(connection.sent_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
