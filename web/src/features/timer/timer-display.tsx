/**
 * TimerDisplay — Contagem regressiva dominante.
 *
 * Usa container-query units (cqi) para escalar sem estourar a largura,
 * fiel ao Timer.jsx do kit. O elemento pai deve ter `containerType: 'inline-size'`
 * (aplicado pelo wrapper externo em timer.tsx).
 */
import type { CSSProperties } from 'react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { fmtTime, type BlindInfo } from './use-mock-clock';

interface TimerDisplayProps {
  remainingSeconds: number;
  levelSeconds: number;
  paused: boolean;
  blinds: BlindInfo;
  nextBlinds: BlindInfo;
  elapsedPct: number;
}

export function TimerDisplay({
  remainingSeconds,
  paused,
  blinds,
  nextBlinds,
  elapsedPct,
}: TimerDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 min-h-[300px] relative flex-1">
      {/* Suit watermark */}
      <div
        aria-hidden
        className="absolute pointer-events-none select-none font-serif opacity-[0.03] text-suit-dark"
        style={{ fontSize: 'min(70cqi, 280px)' } as CSSProperties}
      >
        ♠
      </div>

      {/* Countdown */}
      <div
        className="font-mono font-bold tabular-nums whitespace-nowrap leading-[0.92] tracking-[-0.04em]"
        style={{ fontSize: 'clamp(64px, 27cqi, 124px)' } as CSSProperties}
      >
        {fmtTime(remainingSeconds)}
      </div>

      {/* Current blinds */}
      <div className="flex items-baseline gap-2.5 mt-2">
        <span
          className="font-mono font-bold text-gold-400 whitespace-nowrap tracking-[-0.02em]"
          style={{ fontSize: 'clamp(26px, 9.5cqi, 40px)' } as CSSProperties}
        >
          {blinds.sb} / {blinds.bb}
        </span>
      </div>
      <div className="text-sm text-muted-foreground font-mono">ante {blinds.ante}</div>

      {/* Progress bar + next blinds */}
      <div className="w-[78%] max-w-[320px] mt-4">
        <ProgressBar
          value={elapsedPct}
          tone={paused ? 'warning' : 'emerald'}
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>
            próximo: {nextBlinds.sb}/{nextBlinds.bb}
          </span>
          <span>em {fmtTime(Math.max(0, 0))}</span>
        </div>
      </div>
    </div>
  );
}
