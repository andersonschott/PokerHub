/**
 * LevelControl — controle de nível compacto para o Dashboard ao vivo.
 * Versão compacta (sem botão TV): tempo restante + blinds + pause/prev/next.
 * Consome o mesmo useMockClock da Task 10 via props.
 */
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { fmtTime, type MockClockState } from '@/features/timer/use-mock-clock';
import { nextLevelLabel } from '@/features/timer/next-level-label';

interface LevelControlProps {
  state: MockClockState;
  onPrev: () => void;
  onTogglePause: () => void;
  onNext: () => void;
}

export function LevelControl({ state, onPrev, onTogglePause, onNext }: LevelControlProps) {
  const { displayLevel, isBreak, remainingSeconds, paused, blinds, nextBlinds, nextIsBreak } = state;

  return (
    <Card variant="gold" pad="md">
      <div className="flex items-start justify-between gap-4">
        {/* Level info + time + blind */}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {isBreak ? 'Intervalo' : `Nível ${displayLevel}`}
          </div>
          {/* Tempo — herói do card */}
          <div
            className="font-mono font-bold text-[40px] tracking-[-0.02em] mt-0.5 leading-none"
            style={{ color: paused ? 'var(--warning)' : 'var(--foreground)' }}
          >
            {fmtTime(remainingSeconds)}
          </div>
          {/* Blind atual — destaque em ouro, legível p/ quem monitora só por aqui */}
          {!isBreak && (
            <div className="font-mono font-bold text-gold-400 text-[20px] tracking-[-0.01em] mt-1.5 leading-none whitespace-nowrap">
              {blinds.sb} / {blinds.bb}
            </div>
          )}
          <div className="text-[12px] text-muted-foreground font-mono mt-1.5 whitespace-nowrap">
            ante {blinds.ante} · próximo {nextLevelLabel(nextBlinds, nextIsBreak)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 shrink-0">
          <IconButton
            icon={ChevronLeft}
            aria-label="Nível anterior"
            variant="solid"
            onClick={onPrev}
          />
          <IconButton
            icon={paused ? Play : Pause}
            aria-label={paused ? 'Retomar' : 'Pausar'}
            variant="solid"
            gold
            onClick={onTogglePause}
          />
          <IconButton
            icon={ChevronRight}
            aria-label="Próximo nível"
            variant="solid"
            onClick={onNext}
          />
        </div>
      </div>
    </Card>
  );
}
