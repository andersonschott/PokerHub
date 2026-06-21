import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { PlayerDto } from './use-leagues';

export type { PlayerDto } from './use-leagues';

/** Mirrors PokerHub.Domain.Enums.PlayerMembershipStatus (serializado como número). */
export enum PlayerMembershipStatus {
  Active = 0,
  Inactive = 1,
}

/** `true` se o jogador está inativo na liga (independente do soft-delete). */
export function isPlayerInactive(player: Pick<PlayerDto, 'membershipStatus'>): boolean {
  return player.membershipStatus === PlayerMembershipStatus.Inactive;
}

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
  byLeague: (leagueId: string, includeInactive = false) =>
    [...playerKeys.all, 'league', leagueId, { includeInactive }] as const,
  detail: (playerId: string) => [...playerKeys.all, 'detail', playerId] as const,
};

export interface UsePlayersOptions {
  /** Quando `true`, inclui jogadores inativos (só organizador). Default: só ativos. */
  includeInactive?: boolean;
}

/** GET /api/leagues/{leagueId}/players-list — List players for a league (PlayerService CRUD) */
export function usePlayers(leagueId: string, opts?: UsePlayersOptions) {
  const includeInactive = opts?.includeInactive ?? false;
  return useQuery({
    queryKey: playerKeys.byLeague(leagueId, includeInactive),
    queryFn: () =>
      api<PlayerDto[]>(
        `/leagues/${leagueId}/players-list${includeInactive ? '?includeInactive=true' : ''}`,
      ),
    enabled: !!leagueId,
  });
}

/**
 * Invalida todas as variantes de lista de jogadores de uma liga (ativos e ativos+inativos),
 * já que `usePlayers` agora chaveia por `includeInactive`.
 */
function invalidateLeaguePlayers(qc: ReturnType<typeof useQueryClient>, leagueId: string) {
  // Prefixo sem o objeto `{ includeInactive }` → casa com ambas as variantes.
  void qc.invalidateQueries({ queryKey: [...playerKeys.all, 'league', leagueId] });
  // Also invalidate the league players endpoint which might be used in the lobby
  void qc.invalidateQueries({ queryKey: ['leagues', 'players', leagueId] });
}

/** POST /api/leagues/{leagueId}/players-list — Create player for a league */
export function useCreatePlayer(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePlayerDto) =>
      api<PlayerDto>(`/leagues/${leagueId}/players-list`, { method: 'POST', body: dto }),
    onSuccess: () => invalidateLeaguePlayers(qc, leagueId),
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
      invalidateLeaguePlayers(qc, data.leagueId);
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

/**
 * POST /api/players/{playerId}/deactivate (organizador) — inativa o jogador na liga
 * sem soft-delete. `leagueId` é usado apenas para invalidar as listas em cache.
 */
export function useDeactivatePlayer(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/players/${playerId}/deactivate`, { method: 'POST' }),
    onSuccess: () => invalidateLeaguePlayers(qc, leagueId),
  });
}

/**
 * POST /api/players/{playerId}/activate (organizador) — reativa um jogador inativo.
 * `leagueId` é usado apenas para invalidar as listas em cache.
 */
export function useActivatePlayer(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/players/${playerId}/activate`, { method: 'POST' }),
    onSuccess: () => invalidateLeaguePlayers(qc, leagueId),
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
