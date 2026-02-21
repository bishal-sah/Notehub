/**
 * Admin Authorization & User Management page.
 * Full control over user roles, verification, active status.
 */
import { useEffect, useState, useCallback } from 'react';
import { adminUserService } from '@/lib/services';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users, Loader2, Search, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight,
  Shield, UserCheck, UserX, Crown, BadgeCheck, Eye, MoreHorizontal,
  RefreshCw, Filter, FileText, Calendar, Mail,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FilterTab = 'all' | 'active' | 'inactive' | 'verified' | 'unverified' | 'admins';

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState<{ user: User; newRole: 'admin' | 'user' } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, verified: 0, admins: 0 });

  const buildParams = useCallback((p: number, q: string, tab: FilterTab) => {
    const params: Record<string, string | number | undefined> = { page: p };
    if (q) params.search = q;
    if (tab === 'active') params.is_active = 'true';
    if (tab === 'inactive') params.is_active = 'false';
    if (tab === 'verified') params.is_verified = 'true';
    if (tab === 'unverified') params.is_verified = 'false';
    if (tab === 'admins') params.role = 'admin';
    return params;
  }, []);

  const load = useCallback(async (p = page, q = search, tab = activeTab) => {
    setLoading(true);
    try {
      const params = buildParams(p, q, tab);
      const res = await adminUserService.list(params);
      const results = res.data.results || [];
      const count = res.data.count || 0;
      setUsers(results);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 20));
    } catch {
      toast({ title: 'Error', description: 'Failed to load users.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab, buildParams, toast]);

  // Load stats (all users unfiltered) on mount
  const loadStats = useCallback(async () => {
    try {
      const [allRes, activeRes, verifiedRes, adminRes] = await Promise.all([
        adminUserService.list({ page: 1 }),
        adminUserService.list({ page: 1, is_active: 'true' }),
        adminUserService.list({ page: 1, is_verified: 'true' }),
        adminUserService.list({ page: 1, role: 'admin' }),
      ]);
      setStats({
        total: allRes.data.count || 0,
        active: activeRes.data.count || 0,
        verified: verifiedRes.data.count || 0,
        admins: adminRes.data.count || 0,
      });
    } catch {
      // silently fail on stats
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { load(); }, [page]);

  const handleSearch = () => { setPage(1); load(1, search, activeTab); };
  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPage(1);
    load(1, search, tab);
  };
  const handleRefresh = () => { load(); loadStats(); };

  const toggleActive = async (user: User) => {
    setActionLoading(user.id);
    try {
      await adminUserService.toggleActive(user.id);
      const newActive = !user.is_active;
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: newActive } : u));
      if (selectedUser?.id === user.id) setSelectedUser({ ...user, is_active: newActive });
      toast({ title: newActive ? 'User Activated' : 'User Deactivated', description: `${user.full_name || user.username} has been ${newActive ? 'activated' : 'deactivated'}.` });
      loadStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleVerify = async (user: User) => {
    setActionLoading(user.id);
    try {
      await adminUserService.verify(user.id);
      const newVerified = !user.is_verified;
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_verified: newVerified } : u));
      if (selectedUser?.id === user.id) setSelectedUser({ ...user, is_verified: newVerified });
      toast({ title: newVerified ? 'User Verified' : 'Verification Removed', description: `${user.full_name || user.username} has been ${newVerified ? 'verified' : 'unverified'}.` });
      loadStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to update verification.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const changeRole = async (user: User, newRole: 'admin' | 'user') => {
    setActionLoading(user.id);
    try {
      await adminUserService.changeRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      if (selectedUser?.id === user.id) setSelectedUser({ ...user, role: newRole });
      toast({ title: 'Role Updated', description: `${user.full_name || user.username} is now ${newRole === 'admin' ? 'an Admin' : 'a User'}.` });
      loadStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to change role.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setRoleConfirm(null);
    }
  };

  const openDetail = (user: User) => { setSelectedUser(user); setDetailOpen(true); };

  const filterTabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Users', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'active', label: 'Active', icon: <UserCheck className="h-3.5 w-3.5" /> },
    { key: 'inactive', label: 'Inactive', icon: <UserX className="h-3.5 w-3.5" /> },
    { key: 'verified', label: 'Verified', icon: <BadgeCheck className="h-3.5 w-3.5" /> },
    { key: 'unverified', label: 'Unverified', icon: <ShieldOff className="h-3.5 w-3.5" /> },
    { key: 'admins', label: 'Admins', icon: <Crown className="h-3.5 w-3.5" /> },
  ];

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Authorization & User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage user roles, permissions, verification, and account status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleTabChange('all')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleTabChange('active')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Users</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleTabChange('verified')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Verified Users</p>
                <p className="text-2xl font-bold text-purple-600">{stats.verified}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <BadgeCheck className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleTabChange('admins')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Admins</p>
                <p className="text-2xl font-bold text-amber-600">{stats.admins}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTabChange(tab.key)}
              className="gap-1.5"
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.key && <Badge variant="secondary" className="ml-1 text-xs px-1.5">{totalCount}</Badge>}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, or email..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="gap-2">
            <Filter className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">No users found</h3>
          <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {users.map((user) => (
              <Card key={user.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* User info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.is_verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center border-2 border-background">
                            <BadgeCheck className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{user.full_name || user.username}</p>
                          {user.role === 'admin' && (
                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs px-1.5 py-0">
                              <Crown className="h-2.5 w-2.5 mr-0.5" /> Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            <FileText className="h-3 w-3 inline mr-0.5" />{user.total_notes} notes
                          </span>
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            <Calendar className="h-3 w-3 inline mr-0.5" />Joined {formatDate(user.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status badges + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={user.is_active ? 'default' : 'destructive'}
                        className={`text-xs ${user.is_active ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${user.is_verified ? 'border-blue-500/30 text-blue-600 dark:text-blue-400' : 'border-muted text-muted-foreground'}`}
                      >
                        {user.is_verified ? 'Verified' : 'Unverified'}
                      </Badge>

                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === user.id}>
                            {actionLoading === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => openDetail(user)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleActive(user)}>
                            {user.is_active ? (
                              <><UserX className="h-4 w-4 mr-2 text-red-500" /> Deactivate User</>
                            ) : (
                              <><UserCheck className="h-4 w-4 mr-2 text-green-500" /> Activate User</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleVerify(user)}>
                            {user.is_verified ? (
                              <><ShieldOff className="h-4 w-4 mr-2 text-orange-500" /> Remove Verification</>
                            ) : (
                              <><BadgeCheck className="h-4 w-4 mr-2 text-blue-500" /> Verify User</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.role === 'user' ? (
                            <DropdownMenuItem onClick={() => setRoleConfirm({ user, newRole: 'admin' })}>
                              <Crown className="h-4 w-4 mr-2 text-amber-500" /> Promote to Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setRoleConfirm({ user, newRole: 'user' })}>
                              <ShieldOff className="h-4 w-4 mr-2 text-gray-500" /> Demote to User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} of {totalCount} users
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm font-medium px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              User Details
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Profile header */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar || ''} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {selectedUser.is_verified && (
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center border-2 border-background">
                      <BadgeCheck className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.full_name || selectedUser.username}</h3>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {selectedUser.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                      {selectedUser.role}
                    </Badge>
                    <Badge variant={selectedUser.is_active ? 'default' : 'destructive'} className={selectedUser.is_active ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className={selectedUser.is_verified ? 'border-blue-500/30 text-blue-600' : ''}>
                      {selectedUser.is_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</p>
                  <p className="mt-0.5">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Total Notes</p>
                  <p className="mt-0.5">{selectedUser.total_notes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined</p>
                  <p className="mt-0.5">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Role</p>
                  <p className="mt-0.5 capitalize">{selectedUser.role}</p>
                </div>
              </div>

              <Separator />

              {/* Quick actions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedUser.is_active ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => toggleActive(selectedUser)}
                    disabled={actionLoading === selectedUser.id}
                    className="gap-1.5"
                  >
                    {selectedUser.is_active ? <><UserX className="h-3.5 w-3.5" /> Deactivate</> : <><UserCheck className="h-3.5 w-3.5" /> Activate</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVerify(selectedUser)}
                    disabled={actionLoading === selectedUser.id}
                    className="gap-1.5"
                  >
                    {selectedUser.is_verified ? <><ShieldOff className="h-3.5 w-3.5" /> Unverify</> : <><BadgeCheck className="h-3.5 w-3.5" /> Verify</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRoleConfirm({ user: selectedUser, newRole: selectedUser.role === 'admin' ? 'user' : 'admin' })}
                    disabled={actionLoading === selectedUser.id}
                    className="gap-1.5"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    {selectedUser.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation */}
      <AlertDialog open={!!roleConfirm} onOpenChange={(open) => !open && setRoleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleConfirm?.newRole === 'admin' ? 'Promote to Admin?' : 'Demote to User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleConfirm?.newRole === 'admin'
                ? `This will give ${roleConfirm?.user.full_name || roleConfirm?.user.username} full admin privileges including access to all admin panels, user management, and content moderation.`
                : `This will remove admin privileges from ${roleConfirm?.user.full_name || roleConfirm?.user.username}. They will no longer be able to access admin panels.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleConfirm && changeRole(roleConfirm.user, roleConfirm.newRole)}
              className={roleConfirm?.newRole === 'admin' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              {roleConfirm?.newRole === 'admin' ? 'Promote to Admin' : 'Demote to User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
