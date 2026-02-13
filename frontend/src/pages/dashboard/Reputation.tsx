/**
 * Contributor Reputation System — gamification dashboard.
 *
 * Shows:
 * - Current reputation tier with progress to next
 * - Points breakdown (uploads, downloads, ratings, comments)
 * - Badge showcase (earned + locked)
 * - Point history timeline
 * - Tier progression roadmap
 * - Point values guide
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gamificationService } from '@/lib/services';
import type { MyGamification, Badge as BadgeType } from '@/types';
import BadgeCard from '@/components/gamification/BadgeCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Trophy, Star, Upload, Download, Eye, MessageSquare,
  Award, Loader2, ArrowRight, TrendingUp, Target, Zap,
  Crown, Medal, ChevronRight, Clock,
} from 'lucide-react';

const TIER_ICONS: Record<string, React.ReactNode> = {
  contributor: <Medal className="h-5 w-5" />,
  senior_contributor: <Medal className="h-5 w-5" />,
  top_educator: <Trophy className="h-5 w-5" />,
  campus_hero: <Crown className="h-5 w-5" />,
};

const REASON_LABELS: Record<string, string> = {
  note_uploaded: 'Note Uploaded',
  note_approved: 'Note Approved',
  download_received: 'Download Received',
  comment_posted: 'Comment Posted',
  first_upload: 'First Upload Bonus',
  rating_received: 'Rating Received',
  five_star_received: '5-Star Rating',
  badge_earned: 'Badge Earned',
  view_received: 'View Milestone',
};

export default function Reputation() {
  const [data, setData] = useState<MyGamification | null>(null);
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, badgesRes] = await Promise.allSettled([
          gamificationService.me(),
          gamificationService.badges(),
        ]);
        if (meRes.status === 'fulfilled') setData(meRes.value.data);
        if (badgesRes.status === 'fulfilled') {
          const bd = badgesRes.value.data;
          setAllBadges(Array.isArray(bd) ? bd : (bd as any)?.results ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-1">Could not load reputation data</h3>
        <p className="text-muted-foreground text-sm">Please try again later.</p>
      </div>
    );
  }

  const { reputation, all_tiers, point_values } = data;
  const earnedBadgeIds = new Set(data.badges.map(ub => ub.badge.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Contributor Reputation
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Earn points by uploading notes, receiving downloads, and getting 5-star ratings.
        </p>
      </div>

      {/* ── Current Tier Hero Card ── */}
      <Card
        className="overflow-hidden border-2"
        style={{ borderColor: reputation.current_tier.color + '40' }}
      >
        <div
          className="h-2"
          style={{ backgroundColor: reputation.current_tier.color }}
        />
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-3xl"
                style={{ backgroundColor: reputation.current_tier.color + '15' }}
              >
                {reputation.current_tier.emoji}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Current Tier</p>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: reputation.current_tier.color }}
                >
                  {reputation.current_tier.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Rank <span className="font-bold text-foreground">#{data.rank}</span> · {data.total_points} points
                </p>
              </div>
            </div>

            <Link to="/leaderboard">
              <Button variant="outline" className="gap-1.5">
                <Trophy className="h-4 w-4" /> Leaderboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Progress to next tier */}
          {reputation.next_tier && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span>{reputation.current_tier.emoji}</span>
                  <span className="font-medium">{reputation.current_tier.name}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">{reputation.next_tier.name}</span>
                  <span>{reputation.next_tier.emoji}</span>
                </span>
              </div>
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${reputation.progress_to_next}%`,
                    backgroundColor: reputation.current_tier.color,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-semibold text-foreground">{reputation.points_to_next}</span> more points to reach{' '}
                <span style={{ color: reputation.next_tier.color }} className="font-semibold">
                  {reputation.next_tier.name}
                </span>
              </p>
            </div>
          )}

          {!reputation.next_tier && (
            <div className="mt-4 text-center">
              <Badge className="bg-purple-600 text-white gap-1">
                <Crown className="h-3 w-3" /> Maximum Tier Reached!
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Points', value: data.total_points, icon: <Star className="h-4 w-4" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Uploads', value: data.upload_count, icon: <Upload className="h-4 w-4" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Downloads', value: data.downloads_received, icon: <Download className="h-4 w-4" />, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Views', value: data.views_received, icon: <Eye className="h-4 w-4" />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: '5-Star Ratings', value: data.five_star_count, icon: <Star className="h-4 w-4" />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Comments', value: data.comments_count, icon: <MessageSquare className="h-4 w-4" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        ].map((stat) => (
          <Card key={stat.label} className="p-3">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Tier Roadmap ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Reputation Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {all_tiers.map((tier, idx) => {
              const isActive = reputation.current_tier.key === tier.key;
              const isReached = data.total_points >= tier.min_points;
              return (
                <div key={tier.key} className="flex-1 flex items-center gap-2">
                  <div
                    className={`flex-1 rounded-lg p-3 text-center border-2 transition-all ${
                      isActive
                        ? 'shadow-md scale-[1.02]'
                        : isReached
                        ? 'opacity-70'
                        : 'opacity-40 border-dashed'
                    }`}
                    style={{
                      borderColor: isActive ? tier.color : isReached ? tier.color + '60' : undefined,
                      backgroundColor: isActive ? tier.color + '10' : undefined,
                    }}
                  >
                    <div className="text-2xl mb-1">{tier.emoji}</div>
                    <p className="text-xs font-semibold" style={{ color: isActive || isReached ? tier.color : undefined }}>
                      {tier.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{tier.min_points}+ pts</p>
                    {isActive && (
                      <Badge className="mt-1 text-[10px]" style={{ backgroundColor: tier.color, color: 'white' }}>
                        Current
                      </Badge>
                    )}
                  </div>
                  {idx < all_tiers.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        {/* ── Badges Section ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Badges ({data.badges.length}/{allBadges.length} earned)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No badges available yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {allBadges.map((badge) => {
                  const earned = data.badges.find(ub => ub.badge.id === badge.id) || null;
                  return <BadgeCard key={badge.id} badge={badge} earned={earned} size="sm" />;
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right Column ── */}
        <div className="space-y-5">
          {/* Point Values Guide */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                How to Earn Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { action: 'Upload a note', pts: point_values?.note_uploaded || 5, icon: <Upload className="h-3.5 w-3.5 text-blue-500" /> },
                  { action: 'Note approved', pts: point_values?.note_approved || 10, icon: <TrendingUp className="h-3.5 w-3.5 text-green-500" /> },
                  { action: 'Download received', pts: point_values?.download_received || 2, icon: <Download className="h-3.5 w-3.5 text-green-500" /> },
                  { action: 'Rating received', pts: point_values?.rating_received || 3, icon: <Star className="h-3.5 w-3.5 text-amber-500" /> },
                  { action: '5-star rating', pts: point_values?.five_star_received || 5, icon: <Star className="h-3.5 w-3.5 text-yellow-500" /> },
                  { action: 'Post a comment', pts: point_values?.comment_posted || 1, icon: <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> },
                  { action: 'First upload bonus', pts: point_values?.first_upload || 15, icon: <Zap className="h-3.5 w-3.5 text-yellow-500" /> },
                ].map((item) => (
                  <div key={item.action} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {item.icon} {item.action}
                    </span>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      +{item.pts}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recent Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_points.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet. Start earning!</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.recent_points.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {REASON_LABELS[tx.reason] || tx.reason}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 shrink-0">
                        +{tx.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
