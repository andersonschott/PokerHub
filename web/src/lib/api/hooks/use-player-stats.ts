import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

/**
 * Espelha PokerHub.Application.DTOs.Player.PlayerTournamentResultDto (record C#),
 * serializado em camelCase pela PokerHub.Api.
 */
export interface PlayerTournamentResultDto {
  tournamentId: string;
  tournamentName: string;
  date: string;
  position: number | null;
  totalPlayers: number;
  investment: number;
  prize: number;
  profit: number;
}

/**
 * Espelha PokerHub.Application.DTOs.Player.PlayerStatsDto (record C#).
 *
 * Endpoint: GET /api/players/{playerId}/ranking-stats (auth: membro da liga;
 * jogador inexistente -> 404). Fornece o detalhe que o ranking não traz:
 * posição média, melhor/pior resultado e os últimos torneios.
 */
export interface PlayerStatsDto {
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
  bestResult: number | null;
  worstResult: number | null;
  averagePosition: number;
  recentResults: PlayerTournamentResultDto[];
  hasLegacyData: boolean;
}

export const playerStatsKeys = {
  all: ['player-stats'] as const,
  detail: (playerId: string) => [...playerStatsKeys.all, playerId] as const,
};

/** Estatísticas detalhadas de ranking de um jogador. Auth: membro da liga. */
export function usePlayerStats(playerId: string) {
  return useQuery({
    queryKey: playerStatsKeys.detail(playerId),
    queryFn: () => api<PlayerStatsDto>(`/players/${playerId}/ranking-stats`),
    enabled: !!playerId,
  });
}
