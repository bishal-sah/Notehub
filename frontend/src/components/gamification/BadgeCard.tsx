/**
 * Reusable badge card — shows a single badge with icon, name, description.
 * Supports earned (colored) and locked (grayed-out) states.
 */
import type { Badge as BadgeType, UserBadge } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Upload, FolderUp, Rocket, Library, Download, TrendingUp,
  Flame, Star, MessageSquare, MessagesSquare, Users, Award,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Upload, FolderUp, Rocket, Library, Download, TrendingUp,
  Flame, Star, MessageSquare, MessagesSquare, Users, Award,
};

interface BadgeCardProps {
  badge: BadgeType;
  earned?: UserBadge | null;
  size?: 'sm' | 'md';
}

export default function BadgeCard({ badge, earned, size = 'md' }: BadgeCardProps) {
  const Icon = ICON_MAP[badge.icon] || Award;
  const isEarned = !!earned;
  const isMd = size === 'md';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`transition-all ${
              isEarned
                ? 'border-2 shadow-sm hover:shadow-md'
                : 'opacity-40 grayscale border-dashed'
            }`}
            style={isEarned ? { borderColor: badge.color + '60' } : undefined}
          >
            <CardContent className={`flex flex-col items-center text-center gap-1.5 ${isMd ? 'p-4' : 'p-2.5'}`}>
              <div
                className={`rounded-full flex items-center justify-center ${isMd ? 'h-12 w-12' : 'h-9 w-9'}`}
                style={{ backgroundColor: badge.color + '20' }}
              >
                <span style={{ color: badge.color }}>
                  <Icon className={isMd ? 'h-6 w-6' : 'h-4 w-4'} />
                </span>
              </div>
              <p className={`font-semibold leading-tight ${isMd ? 'text-sm' : 'text-xs'}`}>{badge.name}</p>
              {isMd && (
                <p className="text-xs text-muted-foreground leading-snug">{badge.description}</p>
              )}
              {isEarned && earned && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(earned.earned_at).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          <p className="font-semibold text-sm">{badge.name}</p>
          <p className="text-xs">{badge.description}</p>
          {badge.points_reward > 0 && (
            <p className="text-xs text-yellow-600 mt-1">+{badge.points_reward} bonus points</p>
          )}
          {!isEarned && (
            <p className="text-xs text-muted-foreground mt-1 italic">Not yet earned</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
