import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { PlayerDto } from './use-leagues';

export interface CreatePlayerDto {
  name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  pixKey?: string;
  pixKeyType?: string;
}

export interface UpdatePlayerDto {
  name?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  pixKey?: string;
  pixKeyType?: string;
  isActive?: boolean;
}

export interface LinkUserRequest {
  userId: string;
}

export const playerKeys = {
  all: ['players'] as const,
  byLeague: (leagueId: string) => [...playerKeys.all, 'league', leagueId] as const,
  detail: (playerId: string) => [...playerKeys.all, 'detail', playerId] as const,
};

/** GET /api/leagues/{leagueId}/players-list — List players for a league (PlayerService CRUD) */
export function usePlayers(leagueId: string) {
  return useQuery({
    queryKey: playerKeys.byLeague(leagueId),
    queryFn: () => api<PlayerDto[]>(`/leagues/${leagueId}/players-list`),
    enabled: !!leagueId,
  });
}

/** POST /api/leagues/{leagueId}/players-list — Create player for a league */
export function useCreatePlayer(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePlayerDto) =>
      api<PlayerDto>(`/leagues/${leagueId}/players-list`, { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: playerKeys.byLeague(leagueId) });
      // Also invalidate the league players endpoint which might be used in the lobby
      void qc.invalidateQueries({ queryKey: ['leagues', 'players', leagueId] });
    },
  });
}

/** GET /api/players/{playerId} */
export function usePlayer(playerId: string) {
  return useQuery({
    queryKey: playerKeys.detail(playerId),
    queryFn: () => api<PlayerDto>(`/players/${playerId}`),
    enabled: !!playerId,
  });
}

/** PUT /api/players/{playerId} */
export function useUpdatePlayer(playerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePlayerDto) =>
      api<PlayerDto>(`/players/${playerId}`, { method: 'PUT', body: dto }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: playerKeys.detail(playerId) });
      void qc.invalidateQueries({ queryKey: playerKeys.byLeague(data.leagueId) });
      void qc.invalidateQueries({ queryKey: ['leagues', 'players', data.leagueId] });
    },
  });
}

/** DELETE /api/players/{playerId} */
export function useDeletePlayer(playerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/players/${playerId}`, { method: 'DELETE' }),
    onSuccess: () => {
      // Best effort invalidation (we don't have leagueId in response)
      void qc.invalidateQueries({ queryKey: playerKeys.all });
      void qc.invalidateQueries({ queryKey: ['leagues'] });
    },
  });
}

/** POST /api/players/{playerId}/link-user */
export function useLinkPlayerUser(playerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: LinkUserRequest) =>
      api<void>(`/players/${playerId}/link-user`, { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: playerKeys.all });
      void qc.invalidateQueries({ queryKey: ['leagues'] });
    },
  });
}
