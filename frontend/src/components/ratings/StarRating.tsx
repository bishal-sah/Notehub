/**
 * Interactive star rating component — supports both display-only and interactive modes.
 */
import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showValue?: boolean;
  count?: number;
}

const SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export default function StarRating({
  value,
  onChange,
  size = 'md',
  readonly = false,
  showValue = false,
  count,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const interactive = !readonly && !!onChange;
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn('flex items-center', interactive && 'cursor-pointer')}
        onMouseLeave={() => interactive && setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              SIZES[size],
              'transition-colors',
              star <= display
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300',
              interactive && 'hover:scale-110 transition-transform'
            )}
            onMouseEnter={() => interactive && setHovered(star)}
            onClick={() => interactive && onChange(star)}
          />
        ))}
      </div>
      {showValue && value > 0 && (
        <span className="text-sm font-medium ml-1">{value.toFixed(1)}</span>
      )}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground ml-0.5">({count})</span>
      )}
    </div>
  );
}
