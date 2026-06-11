/**
 * LevelControls — Botões de controle de nível do timer (anterior/pausar/próximo + TV).
 * Port de Timer.jsx: ChevronLeft · Pause/Play · ChevronRight + TV (gold).
 */
import { ChevronLeft, ChevronRight, Pause, Play, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

interface LevelControlsProps {
  paused: boolean;
  onPrev: () => void;
  onTogglePause: () => void;
  onNext: () => void;
  onTv: () => void;
}

export function LevelControls({
  paused,
  onPrev,
  onTogglePause,
  onNext,
  onTv,
}: LevelControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <IconButton
        icon={ChevronLeft}
        aria-label="Nível anterior"
        variant="solid"
        onClick={onPrev}
      />
      <Button
        variant={paused ? 'primary' : 'secondary'}
        icon={paused ? Play : Pause}
        block
        onClick={onTogglePause}
      >
        {paused ? 'Retomar' : 'Pausar'}
      </Button>
      <IconButton
        icon={ChevronRight}
        aria-label="Próximo nível"
        variant="solid"
        onClick={onNext}
      />
      <IconButton
        icon={Tv}
        aria-label="Abrir modo TV"
        variant="solid"
        gold
        onClick={onTv}
      />
    </div>
  );
}
