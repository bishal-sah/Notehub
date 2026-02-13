/**
 * Dashboard sidebar layout used for both User and Admin dashboards.
 */
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  BookOpen, LayoutDashboard, Upload, FileText, User, Bell, Lock,
  Shield, CheckSquare, Users, GraduationCap, Copy, FileWarning, Settings,
  Menu, X, LogOut, ChevronLeft, Trophy, Bookmark, MessageSquare, Brain, ScanLine, UserPlus, Map, Award,
} from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function DashboardLayout() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userLinks: SidebarLink[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Upload Notes', href: '/dashboard/upload', icon: <Upload className="h-4 w-4" /> },
    { label: 'My Notes', href: '/dashboard/my-notes', icon: <FileText className="h-4 w-4" /> },
    { label: 'Profile', href: '/dashboard/profile', icon: <User className="h-4 w-4" /> },
    { label: 'Change Password', href: '/dashboard/change-password', icon: <Lock className="h-4 w-4" /> },
    { label: 'Notifications', href: '/dashboard/notifications', icon: <Bell className="h-4 w-4" /> },
    { label: 'My Library', href: '/dashboard/collections', icon: <Bookmark className="h-4 w-4" /> },
    { label: 'Study Groups', href: '/dashboard/groups', icon: <MessageSquare className="h-4 w-4" /> },
    { label: 'Study Buddies', href: '/dashboard/study-buddies', icon: <UserPlus className="h-4 w-4" /> },
    { label: 'Semester Roadmap', href: '/dashboard/roadmap', icon: <Map className="h-4 w-4" /> },
    { label: 'Flashcards', href: '/dashboard/flashcards', icon: <Brain className="h-4 w-4" /> },
    { label: 'OCR Scanner', href: '/dashboard/ocr', icon: <ScanLine className="h-4 w-4" /> },
    { label: 'Leaderboard', href: '/leaderboard', icon: <Trophy className="h-4 w-4" /> },
    { label: 'Reputation', href: '/dashboard/reputation', icon: <Award className="h-4 w-4" /> },
  ];

  const adminLinks: SidebarLink[] = [
    { label: 'Admin Dashboard', href: '/admin', icon: <Shield className="h-4 w-4" /> },
    { label: 'Pending Approvals', href: '/admin/pending', icon: <CheckSquare className="h-4 w-4" /> },
    { label: 'All Notes', href: '/admin/notes', icon: <FileText className="h-4 w-4" /> },
    { label: 'User Management', href: '/admin/users', icon: <Users className="h-4 w-4" /> },
    { label: 'Faculty Management', href: '/admin/faculties', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Duplicate Detection', href: '/admin/duplicates', icon: <Copy className="h-4 w-4" /> },
    { label: 'Reports & Logs', href: '/admin/reports', icon: <FileWarning className="h-4 w-4" /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const isAdminRoute = location.pathname.startsWith('/admin');
  const links = isAdminRoute ? adminLinks : userLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>NoteHub</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar || ''} />
            <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                location.pathname === link.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Switch between user/admin */}
        {isAdmin && (
          <>
            <Separator className="my-3" />
            <div className="px-2">
              <Link
                to={isAdminRoute ? '/dashboard' : '/admin'}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {isAdminRoute ? 'User Dashboard' : 'Admin Panel'}
              </Link>
            </div>
          </>
        )}
      </ScrollArea>

      {/* Theme + Logout */}
      <div className="border-t p-3 flex items-center gap-2">
        <Button variant="ghost" className="flex-1 justify-start gap-3" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r bg-background">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-background z-50 shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 border-b px-4 py-3 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Link to="/">
            <Button variant="outline" size="sm">Back to Site</Button>
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
