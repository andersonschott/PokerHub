/**
 * PlayerStatsModal — modal desktop de estatísticas do jogador.
 * Port do DkModal pattern de DesktopParts.jsx com PlayerStats embutido.
 * Exibido somente em lg: quando o usuário clica em uma linha da tabela.
 */
import { X } from 'lucide-react';
import { PlayerStats } from './player-stats';
import type { RankingEntry } from './ranking-map';

interface PlayerStatsModalProps {
  player: RankingEntry;
  rank: number;
  onClose: () => void;
}

export function PlayerStatsModal({ player, rank, onClose }: PlayerStatsModalProps) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[480px] max-h-[86vh] overflow-y-auto bg-card border border-border rounded-[var(--radius-lg)] shadow-lg"
        style={{ padding: '22px 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button overlay */}
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 inline-flex items-center justify-center size-8 rounded-[var(--radius-md)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Reuse the mobile PlayerStats, onBack calls onClose */}
        <PlayerStats player={player} rank={rank} onBack={onClose} />
      </div>
    </div>
  );
}
