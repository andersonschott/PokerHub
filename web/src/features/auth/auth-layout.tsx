import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 safe-top safe-bottom"
      style={{ background: 'var(--tv-bg)' }}
    >
      <div className="animate-ph-fade-in mb-8 flex flex-col items-center gap-4">
        <div
          className="flex size-[64px] items-center justify-center rounded-[18px] text-[34px] leading-none text-primary-foreground shadow-glow-gold"
          style={{ background: 'linear-gradient(160deg, var(--gold-400), var(--gold-600))' }}
        >
          ♠
        </div>
        <span className="text-[28px] font-extrabold tracking-[-0.03em] text-foreground">
          Poker<span className="text-gold-400">Hub</span>
        </span>
      </div>
      <div className="animate-ph-fade-in w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-md">
        {children}
      </div>
    </div>
  );
}
