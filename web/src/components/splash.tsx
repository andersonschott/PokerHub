/**
 * Splash screen — port fiel de docs/design-system/ui_kits/pokerhub_app/Splash.jsx
 * Lockup ♠ + wordmark sob --tv-bg (lâmpada), naipes como loader.
 * Auto-dismiss: 2100ms normal, 1100ms reduced-motion. Toque para pular.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(() => {
      if (onDone) onDone();
    }, 460);
  }, [onDone]);

  useEffect(() => {
    const reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(leave, reduced ? 1100 : 2100);
    return () => clearTimeout(t);
  }, [leave]);

  return (
    <div
      className={[
        'fixed inset-0 z-[80] flex flex-col items-center justify-center cursor-pointer',
        'transition-opacity duration-[450ms]',
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100',
      ].join(' ')}
      style={{ background: 'var(--tv-bg)' }}
      onClick={leave}
      role="presentation"
      aria-hidden="true"
    >
      {/* Lockup */}
      <div
        className="flex flex-col items-center gap-[18px]"
        style={{ transform: 'translateY(10px)' }}
      >
        {/* Mark */}
        <div
          className="flex size-[76px] items-center justify-center rounded-[22px] text-[40px] leading-none text-primary-foreground shadow-glow-gold animate-ph-mark-in"
          style={{
            background: 'linear-gradient(160deg, var(--gold-400), var(--gold-600))',
          }}
        >
          ♠
        </div>
        {/* Wordmark */}
        <div
          className="font-display font-extrabold text-[30px] tracking-[-0.03em] text-foreground animate-ph-word-in"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Poker<span style={{ color: 'var(--gold-400)' }}>Hub</span>
        </div>
      </div>

      {/* Suits loader */}
      <div
        className="absolute bottom-[calc(36px+var(--safe-bottom,0px))] flex gap-4 text-[15px] leading-none animate-ph-suits-in"
      >
        <span
          className="animate-ph-suit-pulse"
          style={{ color: 'var(--suit-dark)', opacity: 0.25 }}
        >
          ♠
        </span>
        <span
          className="animate-ph-suit-pulse [animation-delay:0.16s]"
          style={{ color: 'var(--suit-red)', opacity: 0.25 }}
        >
          ♥
        </span>
        <span
          className="animate-ph-suit-pulse [animation-delay:0.32s]"
          style={{ color: 'var(--suit-red)', opacity: 0.25 }}
        >
          ♦
        </span>
        <span
          className="animate-ph-suit-pulse [animation-delay:0.48s]"
          style={{ color: 'var(--suit-dark)', opacity: 0.25 }}
        >
          ♣
        </span>
      </div>

      {/* Splash-specific keyframes injected inline — respects reduced-motion via @media */}
      <style>{`
        .animate-ph-mark-in  { animation: ph-splash-in 0.5s var(--ease-out, cubic-bezier(.22,.68,0,1.2)) both; }
        .animate-ph-word-in  { animation: ph-splash-in 0.5s var(--ease-out, cubic-bezier(.22,.68,0,1.2)) 0.12s both; }
        .animate-ph-suits-in { animation: ph-splash-in 0.5s var(--ease-out, cubic-bezier(.22,.68,0,1.2)) 0.3s both; }
        .animate-ph-suit-pulse { animation: ph-splash-suit 1.3s ease-in-out infinite; }

        @keyframes ph-splash-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ph-splash-suit {
          0%, 100% { opacity: 0.25; }
          30%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ph-mark-in, .animate-ph-word-in, .animate-ph-suits-in { animation: none; opacity: 1; }
          .animate-ph-suit-pulse { animation: none; opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
