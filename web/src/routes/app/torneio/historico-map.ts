/**
 * historico-map — mapeamento puro de TournamentDetailDto → shape de exibição
 * do detalhe de torneio encerrado (/app/torneio/historico/:id).
 */
import type { TournamentDetailDto, TournamentPlayerDto } from '@/lib/api/hooks/use-tournaments';

export interface HistoricoDetail {
  name: string;
  date: string;
  buyIn: number;
  players: number;
  rebuys: number;
  addons: number;
  prizePool: number;
  caixinha: number;
  podium: { pos: number; name: string; prize: number }[];
}

export function formatPtBrDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

function isPodiumPlayer(p: TournamentPlayerDto): p is TournamentPlayerDto & { position: number } {
  return p.position != null && p.position >= 1 && p.position <= 3;
}

export function tournamentDetailToHistorico(
  detail: TournamentDetailDto,
  caixinha: number,
): HistoricoDetail {
  const players = detail.players ?? [];

  const podium = players
    .filter(isPodiumPlayer)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      pos: p.position,
      name: p.playerName,
      prize: p.prize,
    }));

  return {
    name: detail.name,
    date: formatPtBrDate(detail.finishedAt ?? detail.scheduledDateTime),
    buyIn: detail.buyIn,
    players: players.length,
    rebuys: players.reduce((sum, p) => sum + (p.rebuyCount ?? 0), 0),
    addons: players.filter((p) => p.hasAddon === true).length,
    prizePool: detail.prizePool,
    caixinha,
    podium,
  };
}
