/**
 * LevelControl — controle de nível compacto para o Dashboard ao vivo.
 * Versão compacta (sem botão TV): tempo restante + blinds + pause/prev/next.
 * Consome o mesmo useMockClock da Task 10 via props.
 */
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { fmtTime, type MockClockState } from '@/features/timer/use-mock-clock';

interface LevelControlProps {
  state: MockClockState;
  onPrev: () => void;
  onTogglePause: () => void;
  onNext: () => void;
}

export function LevelControl({ state, onPrev, onTogglePause, onNext }: LevelControlProps) {
  const { level, remainingSeconds, paused, blinds } = state;

  return (
    <Card variant="gold" pad="md">
      <div className="flex items-center justify-between gap-4">
        {/* Level info + time */}
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            Nível {level} · {blinds.sb}/{blinds.bb}
          </div>
          <div
            className="font-mono font-bold text-[30px] tracking-[-0.02em] mt-0.5 leading-none"
            style={{ color: paused ? 'var(--warning)' : 'var(--foreground)' }}
          >
            {fmtTime(remainingSeconds)}
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
