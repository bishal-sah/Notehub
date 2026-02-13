/**
 * Resource Hub — Beyond Notes.
 * Internship resources, project ideas, interview Q&A, viva questions.
 */
import { useState, useEffect } from 'react';
import { resourceService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Briefcase, Lightbulb, MessageSquareText, GraduationCap,
  Search, ThumbsUp, Eye, ExternalLink, Plus, Loader2, Puzzle,
  ArrowUpDown, TrendingUp, Clock, Filter,
} from 'lucide-react';
import type { Resource, ResourceCategory, ResourceDifficulty, ResourceStats } from '@/types';

const CATEGORIES: { key: ResourceCategory | 'all'; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { key: 'all', label: 'All Resources', icon: <Puzzle className="h-5 w-5" />, color: 'text-primary', desc: 'Browse everything' },
  { key: 'internship', label: 'Internships', icon: <Briefcase className="h-5 w-5" />, color: 'text-blue-600', desc: 'Internship guides & resources' },
  { key: 'project_ideas', label: 'Project Ideas', icon: <Lightbulb className="h-5 w-5" />, color: 'text-amber-600', desc: 'Build something amazing' },
  { key: 'interview_qa', label: 'Interview Q&A', icon: <MessageSquareText className="h-5 w-5" />, color: 'text-green-600', desc: 'Ace your interviews' },
  { key: 'viva', label: 'Viva Questions', icon: <GraduationCap className="h-5 w-5" />, color: 'text-purple-600', desc: 'Prepare for viva voce' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

type SortMode = 'newest' | 'popular' | 'most_viewed';

export default function ResourceHubPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'internship' as ResourceCategory,
    difficulty: 'beginner' as ResourceDifficulty,
    tags: '',
    link: '',
  });

  const loadResources = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (search.trim()) params.search = search.trim();
      if (difficulty !== 'all') params.difficulty = difficulty;
      if (sortMode === 'popular') params.ordering = '-upvotes_count';
      else if (sortMode === 'most_viewed') params.ordering = '-views_count';
      else params.ordering = '-created_at';

      const res = await resourceService.list(params);
      const data = res.data;
      setResources(Array.isArray(data) ? data : (data as any)?.results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await resourceService.stats();
      setStats(res.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadResources();
  }, [activeCategory, difficulty, sortMode]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadResources();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUpvote = async (id: number) => {
    if (!isAuthenticated) {
      toast({ title: 'Please log in to upvote', variant: 'destructive' });
      return;
    }
    try {
      await resourceService.upvote(id);
      await loadResources();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      await resourceService.create(form);
      toast({ title: 'Resource submitted!' });
      setCreateOpen(false);
      setForm({ title: '', description: '', category: 'internship', difficulty: 'beginner', tags: '', link: '' });
      await loadResources();
      await loadStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to create resource.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await resourceService.delete(id);
      toast({ title: 'Resource deleted' });
      await loadResources();
      await loadStats();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
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

  const getCategoryMeta = (cat: string) =>
    CATEGORIES.find(c => c.key === cat) || CATEGORIES[0];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-6xl">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Puzzle className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Resource Hub</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Go beyond notes — internship guides, project ideas, interview prep, and viva questions. Community-powered knowledge for your career.
            </p>
          </div>

          {/* Stats */}
          {stats && stats.total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {CATEGORIES.filter(c => c.key !== 'all').map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key as ResourceCategory)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    activeCategory === cat.key ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className={cat.color}>{cat.icon}</div>
                  <div>
                    <p className="text-lg font-bold">{stats[cat.key as keyof ResourceStats]}</p>
                    <p className="text-xs text-muted-foreground">{cat.label}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category tabs */}
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.key}
                  variant={activeCategory === cat.key ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setActiveCategory(cat.key as ResourceCategory | 'all')}
                >
                  {cat.icon}
                  <span className="hidden sm:inline">{cat.label}</span>
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAuthenticated && (
                <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Contribute
                </Button>
              )}
            </div>
          </div>

          {/* Search + Filters row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-0.5 border rounded-md p-0.5">
                <Button
                  variant={sortMode === 'newest' ? 'default' : 'ghost'}
                  size="sm" className="h-7 px-2 text-xs gap-1"
                  onClick={() => setSortMode('newest')}
                >
                  <Clock className="h-3 w-3" /> New
                </Button>
                <Button
                  variant={sortMode === 'popular' ? 'default' : 'ghost'}
                  size="sm" className="h-7 px-2 text-xs gap-1"
                  onClick={() => setSortMode('popular')}
                >
                  <TrendingUp className="h-3 w-3" /> Top
                </Button>
                <Button
                  variant={sortMode === 'most_viewed' ? 'default' : 'ghost'}
                  size="sm" className="h-7 px-2 text-xs gap-1"
                  onClick={() => setSortMode('most_viewed')}
                >
                  <Eye className="h-3 w-3" /> Views
                </Button>
              </div>
            </div>
          </div>

          {/* Resources grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No resources found</p>
              <p className="text-sm mt-1">Be the first to contribute!</p>
              {isAuthenticated && (
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Resource
                </Button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => {
                const catMeta = getCategoryMeta(resource.category);
                return (
                  <Card key={resource.id} className="flex flex-col hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`shrink-0 ${catMeta.color}`}>{catMeta.icon}</div>
                          <Badge variant="outline" className="text-[10px]">{resource.category_display}</Badge>
                        </div>
                        <Badge className={`text-[10px] ${DIFFICULTY_COLORS[resource.difficulty] || ''}`}>
                          {resource.difficulty_display}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-sm mt-2 line-clamp-2 leading-tight">{resource.title}</h3>
                    </CardHeader>
                    <CardContent className="flex-1 pb-3">
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{resource.description}</p>
                      {resource.tags_list.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {resource.tags_list.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {resource.tags_list.length > 4 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{resource.tags_list.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                      {/* Author */}
                      <div className="flex items-center gap-2 mt-auto">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={resource.author_avatar || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {resource.author_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {resource.author_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(resource.created_at)}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpvote(resource.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            resource.user_has_upvoted
                              ? 'text-primary font-semibold'
                              : 'text-muted-foreground hover:text-primary'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {resource.upvotes_count}
                        </button>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" /> {resource.views_count}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {resource.link && (
                          <a href={resource.link} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                              <ExternalLink className="h-3 w-3" /> Link
                            </Button>
                          </a>
                        )}
                        {user?.id === resource.author && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDelete(resource.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Create Resource Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Contribute a Resource
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Top 10 internship platforms for CS students"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the resource, what it covers, how it helps..."
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ResourceCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internship">Internship Resources</SelectItem>
                    <SelectItem value="project_ideas">Project Ideas</SelectItem>
                    <SelectItem value="interview_qa">Interview Q&A</SelectItem>
                    <SelectItem value="viva">Viva Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as ResourceDifficulty })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                placeholder="python, web-dev, react (comma separated)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>External Link (optional)</Label>
              <Input
                placeholder="https://..."
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.title.trim() || !form.description.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
