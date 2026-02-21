/** 
 * Study Group detail page — chat, pinned notes, and member management.
 * Acts like a mini Discord channel per subject.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { StudyGroup, GroupMember, GroupMessage, GroupPinnedNote } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Users, Send, Pin, Trash2, Loader2, ArrowLeft, Copy,
  FileText, Shield, UserMinus, ChevronUp, LogOut, Hash,
  Group,
} from 'lucide-react';

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [pins, setPins] = useState<GroupPinnedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);

  // Pin dialog
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinNoteId, setPinNoteId] = useState('');
  const [pinComment, setPinComment] = useState('');
  const [pinning, setPinning] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myMembership = members.find(m => m.user === user?.id);
  const isAdmin = myMembership?.role === 'admin';

  const loadGroup = useCallback(async () => {
    try {
      const [gRes, mRes, msgRes, pRes] = await Promise.all([
        groupService.detail(groupId),
        groupService.members(groupId),
        groupService.messages(groupId),
        groupService.pinnedNotes(groupId),
      ]);
      setGroup(gRes.data);
      setMembers(Array.isArray(mRes.data) ? mRes.data : []);
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
      setPins(Array.isArray(pRes.data) ? pRes.data : []);
    } catch {
      toast({ title: 'Error', description: 'Could not load group.', variant: 'destructive' });
      navigate('/dashboard/groups');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  // Poll for new messages every 5s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await groupService.messages(groupId);
        if (Array.isArray(res.data)) setMessages(res.data);
      } catch { /* silent */ }
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [groupId]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!msgInput.trim()) return;
    setSending(true);
    try {
      const res = await groupService.sendMessage(groupId, msgInput.trim());
      setMessages(prev => [...prev, res.data]);
      setMsgInput('');
    } catch {
      toast({ title: 'Error', description: 'Could not send message.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMsg = async (msgId: number) => {
    try {
      await groupService.deleteMessage(groupId, msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleCopyInvite = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.invite_code);
    toast({ title: 'Invite code copied!' });
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await groupService.leave(groupId);
      toast({ title: 'Left group' });
      navigate('/dashboard/groups');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Could not leave.', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Remove this member?')) return;
    try {
      await groupService.removeMember(groupId, userId);
      setMembers(prev => prev.filter(m => m.user !== userId));
      toast({ title: 'Member removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed', variant: 'destructive' });
    }
  };

  const handlePromote = async (userId: number) => {
    try {
      await groupService.promoteMember(groupId, userId);
      setMembers(prev => prev.map(m => m.user === userId ? { ...m, role: 'admin' as const } : m));
      toast({ title: 'Promoted to admin' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed', variant: 'destructive' });
    }
  };

  const handlePin = async () => {
    const nId = parseInt(pinNoteId);
    if (!nId) return;
    setPinning(true);
    try {
      const res = await groupService.pinNote(groupId, nId, pinComment);
      setPins(prev => [res.data, ...prev]);
      setPinDialogOpen(false);
      setPinNoteId('');
      setPinComment('');
      toast({ title: 'Note pinned!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Could not pin note.', variant: 'destructive' });
    } finally {
      setPinning(false);
    }
  };

  const handleUnpin = async (pinId: number) => {
    try {
      await groupService.unpinNote(groupId, pinId);
      setPins(prev => prev.filter(p => p.id !== pinId));
      toast({ title: 'Note unpinned' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  if (loading || !group) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/groups">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: group.avatar_color }}
        >
          {group.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{group.name}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{group.member_count}</span>
            {group.subject_name && <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{group.subject_name}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyInvite} className="gap-1.5 hidden sm:flex">
          <Copy className="h-3.5 w-3.5" /> Invite Code
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLeave} className="gap-1.5 text-destructive hover:text-destructive">
          <LogOut className="h-3.5 w-3.5" /> Leave
        </Button>
      </div>

      {group.description && (
        <p className="text-sm text-muted-foreground">{group.description}</p>
      )}

      <Tabs defaultValue="chat" className="w-full">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="pins">Pinned Notes ({pins.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
        </TabsList>

        {/* ── Chat Tab ── */}
        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-[450px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-10">
                    No messages yet. Start the conversation!
                  </p>
                )}
                {messages.map((msg, idx) => {
                  const isMe = msg.author === user?.id;
                  const showAvatar = idx === 0 || messages[idx - 1].author !== msg.author;
                  return (
                    <div key={msg.id} className={`flex gap-2 group ${isMe ? 'justify-end' : ''}`}>
                      {!isMe && showAvatar ? (
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                          <AvatarImage src={msg.author_avatar || undefined} />
                          <AvatarFallback className="text-[10px]">{initials(msg.author_name || msg.author_username)}</AvatarFallback>
                        </Avatar>
                      ) : !isMe ? <div className="w-7" /> : null}
                      <div className={`max-w-[70%] ${isMe ? 'order-first' : ''}`}>
                        {showAvatar && !isMe && (
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">{msg.author_name || msg.author_username}</p>
                        )}
                        <div className={`rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? 'text-right' : ''}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {(isMe || isAdmin) && (
                        <button
                          onClick={() => handleDeleteMsg(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 self-center text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={sending || !msgInput.trim()} size="icon">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pinned Notes Tab ── */}
        <TabsContent value="pins" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{pins.length} pinned resource{pins.length !== 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => setPinDialogOpen(true)} className="gap-2">
              <Pin className="h-3.5 w-3.5" /> Pin a Note
            </Button>
          </div>

          {pins.length === 0 ? (
            <div className="text-center py-10">
              <Pin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No pinned notes yet. Pin important resources for the group.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pins.map(pin => (
                <div key={pin.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/notes/${pin.note_slug}`} className="text-sm font-medium hover:underline">{pin.note_title}</Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Badge variant="secondary" className="text-[10px] uppercase">{pin.note_file_type}</Badge>
                      {pin.note_subject && <span>{pin.note_subject}</span>}
                      <span>· pinned by {pin.pinned_by_name}</span>
                    </div>
                    {pin.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{pin.comment}"</p>}
                  </div>
                  {(pin.pinned_by === user?.id || isAdmin) && (
                    <button
                      onClick={() => handleUnpin(pin.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Unpin"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            <Button variant="outline" size="sm" onClick={handleCopyInvite} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy Invite Code
            </Button>
          </div>

          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.user_avatar || undefined} />
                  <AvatarFallback className="text-xs">{initials(m.user_name || m.user_username)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user_name || m.user_username}</p>
                  <p className="text-xs text-muted-foreground">@{m.user_username}</p>
                </div>
                {m.role === 'admin' && (
                  <Badge variant="default" className="text-[10px] gap-1">
                    <Shield className="h-2.5 w-2.5" /> Admin
                  </Badge>
                )}
                {isAdmin && m.user !== user?.id && (
                  <div className="flex gap-1">
                    {m.role !== 'admin' && (
                      <button
                        onClick={() => handlePromote(m.user)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                        title="Promote to admin"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(m.user)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Remove member"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Pin Note Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pin a Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Note ID</label>
              <Input
                type="number"
                placeholder="Enter the note ID"
                value={pinNoteId}
                onChange={e => setPinNoteId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">You can find the note ID on its detail page URL.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment (optional)</label>
              <Input
                placeholder="Why is this note important?"
                value={pinComment}
                onChange={e => setPinComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePin} disabled={pinning || !pinNoteId}>
              {pinning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pin Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
