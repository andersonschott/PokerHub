import { forwardRef, type HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const PODIUM_RING: Record<string, string> = {
  gold: 'var(--podium-gold)',
  silver: 'var(--podium-silver)',
  bronze: 'var(--podium-bronze)',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  size?: number;
  podium?: 'gold' | 'silver' | 'bronze';
  badge?: string | number;
  badgeIcon?: LucideIcon;
  badgeGold?: boolean;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      className,
      name = '',
      src,
      size = 44,
      podium,
      badge,
      badgeIcon: BadgeIcon,
      badgeGold = false,
      style,
      ...props
    },
    ref,
  ) => {
    const hasBadge = badge != null || BadgeIcon != null;
    const ringStyle = podium
      ? ({
          '--_ring': PODIUM_RING[podium],
          boxShadow: `0 0 0 2px var(--background), 0 0 0 4px var(--_ring, var(--border))`,
        } as React.CSSProperties)
      : {};

    return (
      <span
        ref={ref}
        className={cn('relative inline-flex shrink-0', className)}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        {/* Disc */}
        <span
          className="flex items-center justify-center rounded-full overflow-hidden font-sans font-bold tracking-[-0.02em] text-card-foreground"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.38,
            background: 'linear-gradient(155deg, var(--felt-700), var(--felt-850))',
            ...ringStyle,
          }}
        >
          {src ? (
            <img src={src} alt={name} className="w-full h-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>

        {/* Corner badge */}
        {hasBadge ? (
          <span
            className={cn(
              'absolute right-[-3px] bottom-[-3px] min-w-[18px] h-[18px] px-1',
              'rounded-[9px] border',
              'flex items-center justify-center',
              'font-mono text-[10px] font-bold text-foreground',
              badgeGold
                ? 'bg-[var(--podium-gold)] text-primary-foreground border-transparent'
                : 'bg-card border-border',
            )}
          >
            {BadgeIcon ? <BadgeIcon className="w-[11px] h-[11px]" /> : badge}
          </span>
        ) : null}
      </span>
    );
  },
);

Avatar.displayName = 'Avatar';
