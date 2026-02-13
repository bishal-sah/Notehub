/**
 * Study Groups listing page — view, create, and join groups.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { groupService } from '@/lib/services';
import { useToast } from '@/components/ui/use-toast';
import type { StudyGroup } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Users, Plus, Loader2, LogIn, Hash, MessageSquare,
} from 'lucide-react';

export default function StudyGroups() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Join dialog
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadGroups = async () => {
    try {
      const res = await groupService.myGroups();
      setGroups(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await groupService.create({ name: newName, description: newDesc });
      toast({ title: 'Group created!' });
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      loadGroups();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.name?.[0] || 'Could not create group.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await groupService.join(inviteCode.trim());
      toast({ title: 'Joined group!' });
      setJoinOpen(false);
      setInviteCode('');
      loadGroups();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Invalid invite code.', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Study Groups
          </h1>
          <p className="text-muted-foreground text-sm">Collaborate with classmates in private study rooms.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)} className="gap-2">
            <LogIn className="h-4 w-4" /> Join Group
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No groups yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create a study group or join one with an invite code.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setJoinOpen(true)} className="gap-2">
              <LogIn className="h-4 w-4" /> Join with Code
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <Link key={group.id} to={`/dashboard/groups/${group.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: group.avatar_color || '#6366f1' }}
                    >
                      {group.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{group.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        </span>
                        {group.subject_name && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" /> {group.subject_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Study Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                placeholder='e.g., "BE Computer 7th Sem Exam Prep"'
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="What's this group about?"
                rows={3}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Study Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Invite Code</label>
              <Input
                placeholder="Paste the invite code here"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Ask a group member for their invite code.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button onClick={handleJoin} disabled={joining || !inviteCode.trim()}>
              {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
