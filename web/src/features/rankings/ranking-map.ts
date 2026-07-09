/**
 * Mapeamento puro PlayerRankingDto (API real) -> MockRankingEntry (shape que os
 * subcomponentes de ranking — podium, standings-list, desktop-standings,
 * player-stats — já consomem).
 *
 * Mantido fora dos componentes para ser testável isoladamente.
 *
 * Lacunas conhecidas (sem campo no backend):
 *  - winRate: DERIVADO de wins/tournamentsPlayed*100.
 *  - avgPos:  NÃO existe no PlayerRankingDto -> 0 (a UI não oferece ordenar por
 *             posição média; o detalhe "Posição média" real chega na F16 via
 *             /players/{id}/ranking-stats).
 *  - best/worst/recent: undefined -> vêm do player-stats (F16).
 */
import type { PlayerRankingDto, PlayerRecentResultDto } from '@/lib/api/hooks/use-rankings';
import type { MockRankingEntry } from '@/mocks/data';

// O type-source para os consumidores deste módulo (evita import direto de mocks).
export type { MockRankingEntry };

/** Classificação de um resultado para o dot de forma recente. */
export type FormDot = 'win' | 'itm' | 'out';

export function formDot(r: PlayerRecentResultDto): FormDot {
  if (r.position === 1) return 'win';
  if (r.prize > 0) return 'itm';
  return 'out';
}

/**
 * MockRankingEntry + playerId real. MockRankingEntry não tem id; o playerId é
 * necessário para o player-stats buscar /players/{id}/ranking-stats (F16).
 */
export interface RankingEntry extends MockRankingEntry {
  playerId: string;
  /** Movimento desde o último torneio (null = sem movimento a exibir — ranking geral/legado). */
  delta: number | null;
  /** Dots de forma recente, do mais antigo ao mais novo (máx. 5). */
  form: FormDot[];
}

export function mapRankingEntry(dto: PlayerRankingDto): RankingEntry {
  const winRate = dto.tournamentsPlayed > 0 ? (dto.wins / dto.tournamentsPlayed) * 100 : 0;

  return {
    playerId: dto.playerId,
    position: dto.position,
    name: dto.playerName,
    nick: dto.nickname ?? dto.playerName.split(' ')[0],
    sub: dto.nickname ?? '',
    profit: dto.profit,
    tournaments: dto.tournamentsPlayed,
    wins: dto.wins,
    second: dto.secondPlaces,
    third: dto.thirdPlaces,
    itm: dto.itmRate,
    roi: dto.roi,
    winRate,
    avgPos: 0,
    buyIns: dto.totalBuyIns,
    prizes: dto.totalPrizes,
    part: dto.participationPercentage,
    delta: dto.delta ?? null,
    form: (dto.recentResults ?? []).map(formDot),
    // best / worst / recent: undefined — preenchidos pela F16 (player-stats real).
  };
}

export function mapRanking(dtos: PlayerRankingDto[] | undefined): RankingEntry[] {
  return (dtos ?? []).map(mapRankingEntry);
}
