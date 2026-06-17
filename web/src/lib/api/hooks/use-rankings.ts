import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

/**
 * Espelha PokerHub.Application.DTOs.Player.PlayerRankingDto (record C#),
 * serializado em camelCase pela PokerHub.Api.
 *
 * Mesmo shape para o ranking geral da liga e para o ranking de uma temporada
 * (ambos os endpoints retornam IReadOnlyList<PlayerRankingDto>).
 *
 * Nota: o backend escala ROI / ITMRate / ParticipationPercentage para 0–100
 * (ex.: 58 == 58%), então os campos podem ir direto para a UI.
 */
export interface PlayerRankingDto {
  position: number;
  playerId: string;
  playerName: string;
  nickname: string | null;
  tournamentsPlayed: number;
  wins: number;
  secondPlaces: number;
  thirdPlaces: number;
  top3Finishes: number;
  totalBuyIns: number;
  totalPrizes: number;
  profit: number;
  roi: number;
  itmRate: number;
  totalSeasonTournaments: number;
  participationPercentage: number;
}

export const rankingKeys = {
  all: ['rankings'] as const,
  league: (leagueId: string) => [...rankingKeys.all, 'league', leagueId] as const,
  season: (seasonId: string) => [...rankingKeys.all, 'season', seasonId] as const,
};

/** Ranking geral da liga (todos os jogadores). Auth: membro da liga. */
export function useLeagueRanking(leagueId: string) {
  return useQuery({
    queryKey: rankingKeys.league(leagueId),
    queryFn: () => api<PlayerRankingDto[]>(`/leagues/${leagueId}/rankings`),
    enabled: !!leagueId,
  });
}

/** Ranking de UMA temporada. Auth: membro da liga dona da temporada. */
export function useSeasonRanking(seasonId: string) {
  return useQuery({
    queryKey: rankingKeys.season(seasonId),
    queryFn: () => api<PlayerRankingDto[]>(`/seasons/${seasonId}/ranking`),
    enabled: !!seasonId,
  });
}
