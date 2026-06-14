import { cn } from '@/lib/utils';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Mark: spade in gold gradient */}
      <div
        className="flex items-center justify-center shrink-0 rounded-lg text-primary-foreground shadow-glow-gold"
        style={{
          width: 34,
          height: 34,
          fontSize: 18,
          lineHeight: 1,
          background: 'linear-gradient(160deg, var(--gold-400), var(--gold-600))',
        }}
      >
        ♠
      </div>

      {/* Wordmark: hidden when collapsed */}
      {!collapsed && (
        <span
          className="font-sans font-extrabold tracking-[-0.02em] whitespace-nowrap"
          style={{ fontSize: 18 }}
        >
          Poker<span className="text-gold-400">Hub</span>
        </span>
      )}
    </div>
  );
}
