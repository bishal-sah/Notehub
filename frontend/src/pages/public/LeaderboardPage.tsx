/**
 * Public leaderboard page — top contributors ranked by points, filterable by faculty.
 */
import { useEffect, useState } from 'react';
import { gamificationService, academicService } from '@/lib/services';
import type { LeaderboardEntry, Faculty } from '@/types';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trophy, Medal, Award, Crown, Star, Upload, Download,
  MessageSquare, Loader2, Users,
} from 'lucide-react';

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicService.faculties()
      .then(res => setFaculties(res.data.results || res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const facultyId = selectedFaculty !== 'all' ? Number(selectedFaculty) : undefined;
    gamificationService.leaderboard(facultyId)
      .then(res => {
        const data = res.data;
        setEntries(Array.isArray(data) ? data : (data as any)?.results ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedFaculty]);

  // Top 3 for the podium
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-yellow-50 via-background to-primary/10 py-12">
          <div className="container text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-10 w-10 text-yellow-500" />
              <h1 className="text-4xl font-bold">Leaderboard</h1>
            </div>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Top contributors ranked by points earned from uploads, downloads, and community engagement.
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="container max-w-4xl">
            {/* Faculty filter */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{entries.length} contributor{entries.length !== 1 ? 's' : ''}</span>
              </div>
              <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Faculties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculties</SelectItem>
                  {faculties.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No contributors yet</h3>
                <p className="text-muted-foreground text-sm">Be the first to earn points by uploading notes!</p>
              </div>
            ) : (
              <>
                {/* Podium — top 3 */}
                {top3.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {/* Reorder for visual: 2nd, 1st, 3rd */}
                    {[top3[1], top3[0], top3[2]].map((entry, idx) => {
                      if (!entry) return <div key={idx} />;
                      const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                      const isFirst = rank === 1;
                      return (
                        <Card
                          key={entry.username}
                          className={`text-center ${isFirst ? 'border-yellow-300 bg-yellow-50/50 shadow-lg sm:-mt-4 sm:mb-4' : ''}`}
                        >
                          <CardContent className="pt-6 pb-4 space-y-3">
                            <div className="flex justify-center">{getRankIcon(rank)}</div>
                            <Avatar className={`mx-auto ${isFirst ? 'h-16 w-16' : 'h-12 w-12'}`}>
                              <AvatarImage src={entry.avatar || undefined} />
                              <AvatarFallback className={isFirst ? 'text-lg' : 'text-sm'}>
                                {initials(entry.full_name || entry.username)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{entry.full_name || entry.username}</p>
                              {entry.faculty_name && (
                                <p className="text-xs text-muted-foreground">{entry.faculty_name}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="font-bold text-lg">{entry.total_points}</span>
                              <span className="text-xs text-muted-foreground">pts</span>
                            </div>
                            <div className="flex justify-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Upload className="h-3 w-3" />{entry.upload_count}</span>
                              <span className="flex items-center gap-1"><Download className="h-3 w-3" />{entry.downloads_received}</span>
                              <span className="flex items-center gap-1"><Award className="h-3 w-3" />{entry.badge_count}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Remaining rows */}
                {rest.length > 0 && (
                  <div className="space-y-2">
                    {rest.map((entry, idx) => {
                      const rank = idx + 4;
                      return (
                        <div
                          key={entry.username}
                          className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-8 text-center font-bold text-muted-foreground">{rank}</div>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={entry.avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {initials(entry.full_name || entry.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{entry.full_name || entry.username}</p>
                            {entry.faculty_name && (
                              <p className="text-xs text-muted-foreground truncate">{entry.faculty_name}</p>
                            )}
                          </div>
                          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Upload className="h-3 w-3" />{entry.upload_count}</span>
                            <span className="flex items-center gap-1"><Download className="h-3 w-3" />{entry.downloads_received}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{entry.comments_count}</span>
                          </div>
                          <Badge variant="secondary" className="gap-1 shrink-0">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {entry.total_points} pts
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
