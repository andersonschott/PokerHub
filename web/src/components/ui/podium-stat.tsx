import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const posVariants: Record<number, string> = {
  1: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--podium-gold)_14%,var(--card)),var(--card))] border-[color-mix(in_oklab,var(--podium-gold)_28%,transparent)]',
  2: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--podium-silver)_12%,var(--card)),var(--card))] border-[color-mix(in_oklab,var(--podium-silver)_22%,transparent)]',
  3: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--podium-bronze)_12%,var(--card)),var(--card))] border-[color-mix(in_oklab,var(--podium-bronze)_22%,transparent)]',
};

const posChipVariants: Record<number, string> = {
  1: 'bg-[var(--podium-gold)] text-primary-foreground',
  2: 'bg-[var(--podium-silver)] text-[#1a1a1a]',
  3: 'bg-[var(--podium-bronze)] text-[#1a1a1a]',
};

const prizeVariants: Record<number, string> = {
  1: 'text-gold-400',
};

export interface PodiumStatProps extends HTMLAttributes<HTMLDivElement> {
  position?: number;
  name: string;
  sub?: string;
  prize?: ReactNode;
}

export const PodiumStat = forwardRef<HTMLDivElement, PodiumStatProps>(
  ({ className, position = 1, name, sub, prize, ...props }, ref) => {
    const rowVariant = posVariants[position] ?? 'bg-card border-border';
    const chipVariant = posChipVariants[position] ?? 'bg-secondary text-foreground';
    const prizeVariant = prizeVariants[position] ?? '';

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 px-[14px] py-3 rounded-[var(--radius-lg)] bg-card border',
          rowVariant,
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'w-[34px] h-[34px] shrink-0 rounded-[10px]',
            'flex items-center justify-center',
            'font-mono font-bold text-[15px]',
            chipVariant,
          )}
        >
          {position}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-sans font-semibold text-[15px] text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            {name}
          </span>
          {sub ? (
            <span className="block text-[12px] text-muted-foreground">{sub}</span>
          ) : null}
        </span>
        {prize != null ? (
          <span
            className={cn(
              'font-mono font-bold text-[15px] tabular-nums shrink-0',
              prizeVariant,
            )}
          >
            {prize}
          </span>
        ) : null}
      </div>
    );
  },
);

PodiumStat.displayName = 'PodiumStat';
