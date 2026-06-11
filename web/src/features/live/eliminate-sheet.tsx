/**
 * EliminateSheet — segundo sheet para confirmar quem eliminou o jogador.
 * Port de Dashboard.jsx: lista dos jogadores ativos com Avatar + seleção.
 */
import { ChevronRight } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import type { MockTablePlayer } from '@/mocks/data';

interface EliminateSheetProps {
  eliminatedPlayer: MockTablePlayer;
  activePlayers: MockTablePlayer[];
  onEliminate: (eliminatedBy: MockTablePlayer) => void;
  onBack: () => void;
  onClose: () => void;
}

export function EliminateSheet({
  eliminatedPlayer,
  activePlayers,
  onEliminate,
  onBack,
  onClose,
}: EliminateSheetProps) {
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Quem eliminou ${eliminatedPlayer.name}?`}
      subtitle="Toque no responsável pela eliminação"
      fixed
    >
      <div className="flex flex-col gap-2">
        {activePlayers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onEliminate(p)}
            className="flex items-center gap-3 px-3 py-[10px] rounded-[var(--radius-md)] border border-border bg-card cursor-pointer text-left hover:bg-secondary transition-colors duration-[var(--dur-fast,120ms)]"
          >
            <Avatar name={p.name} size={36} />
            <span className="flex-1 font-sans font-semibold text-[14px] text-foreground">
              {p.name}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
        <Button variant="ghost" block onClick={onBack}>
          Voltar
        </Button>
      </div>
    </Sheet>
  );
}
