import { Sheet } from '@/components/ui/sheet';
import { PlayerStats } from './player-stats';
import type { RankingEntry } from './ranking-map';

interface PlayerStatsModalProps { player: RankingEntry; rank: number; onClose: () => void; }
export function PlayerStatsModal({ player, rank, onClose }: PlayerStatsModalProps) {
  return <Sheet fixed title="Estatísticas do jogador" onClose={onClose} className="sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-lg)]">
    <PlayerStats player={player} rank={rank} onBack={onClose} />
  </Sheet>;
}
