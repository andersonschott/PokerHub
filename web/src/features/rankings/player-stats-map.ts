/**
 * Mapeamento puro PlayerStatsDto (API real) -> shapes consumidos pelo
 * player-stats (detalhe do jogador). Mantido fora do componente para ser
 * testável isoladamente — o componente só faz a fiação com o hook.
 *
 * Preenche o que o ranking (mapRankingEntry) deixa vazio: posição média,
 * melhor/pior resultado e o histórico dos últimos torneios.
 */
import type { MockRecentTournament } from '@/mocks/data';
import type {
  PlayerStatsDto,
  PlayerTournamentResultDto,
} from '@/lib/api/hooks/use-player-stats';

/** Formata uma data ISO em pt-BR curto (dd/mm/aaaa); devolve a entrada se inválida. */
export function formatResultDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

/** PlayerTournamentResultDto -> MockRecentTournament (shape de p.recent[]). */
export function mapRecentResult(r: PlayerTournamentResultDto): MockRecentTournament {
  return {
    name: r.tournamentName,
    date: formatResultDate(r.date),
    pos: r.position ?? 0,
    total: r.totalPlayers,
    invest: r.investment,
    prize: r.prize,
    profit: r.profit,
  };
}

/** Campos de detalhe extraídos de PlayerStatsDto que sobrepõem o entry de ranking. */
export interface PlayerStatsDetail {
  best: number;
  worst: number;
  avgPos: number;
  recent: MockRecentTournament[];
}

/** Extrai best/worst/avgPos + histórico de PlayerStatsDto (null -> 0). */
export function mapPlayerStatsDetail(dto: PlayerStatsDto): PlayerStatsDetail {
  return {
    best: dto.bestResult ?? 0,
    worst: dto.worstResult ?? 0,
    avgPos: dto.averagePosition,
    recent: dto.recentResults.map(mapRecentResult),
  };
}
