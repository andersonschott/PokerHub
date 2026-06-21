import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

export enum TournamentStatus {
  Scheduled = 0,
  InProgress = 1,
  Paused = 2,
  Finished = 3,
  Cancelled = 4,
}

export enum RebuyLimitType {
  Level = 0,
  Time = 1,
  Both = 2,
}

export enum PrizeDistributionType {
  Percentage = 0,
  Fixed = 1,
}

export interface BlindLevelDto {
  id: string;
  order: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
  breakDescription: string | null;
}

export interface CreateBlindLevelDto {
  order: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
  breakDescription: string | null;
}

export interface TournamentPlayerDto {
  id: string;
  tournamentId: string;
  playerId: string;
  playerName: string;
  nickname: string | null;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  rebuyCount: number;
  hasAddon: boolean;
  position: number | null;
  prize: number;
  eliminatedByPlayerId: string | null;
  eliminatedByPlayerName: string | null;
  eliminatedAt: string | null;
  totalInvestment: number;
  profitLoss: number;
}

export interface TournamentPrizeDto {
  position: number;
  amount: number;
  /** Derivação de exibição (amount / prizePool * 100); o dinheiro vem do backend. */
  percentage: number;
}

export interface TournamentDto {
  id: string;
  leagueId: string;
  leagueName: string;
  name: string;
  scheduledDateTime: string;
  location: string | null;
  buyIn: number;
  rebuyValue: number | null;
  addonValue: number | null;
  startingStack: number;
  status: TournamentStatus;
  currentLevel: number;
  playerCount: number;
  checkedInCount: number;
  prizePool: number;
  inviteCode: string;
  allowCheckInUntilLevel: number | null;
  createdAt: string;
  isCheckInAllowed: boolean;
}

export interface TournamentDetailDto {
  id: string;
  leagueId: string;
  leagueName: string;
  name: string;
  scheduledDateTime: string;
  location: string | null;
  buyIn: number;
  startingStack: number;
  rebuyValue: number | null;
  rebuyStack: number | null;
  rebuyLimitLevel: number | null;
  rebuyLimitMinutes: number | null;
  rebuyLimitType: RebuyLimitType;
  addonValue: number | null;
  addonStack: number | null;
  prizeStructure: string | null;
  prizeDistributionType: PrizeDistributionType;
  usePrizeTable: boolean;
  inviteCode: string;
  allowCheckInUntilLevel: number | null;
  status: TournamentStatus;
  currentLevel: number;
  timeRemainingSeconds: number | null;
  currentLevelStartedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  prizePool: number;
  blindLevels: BlindLevelDto[];
  players: TournamentPlayerDto[];
  prizes: TournamentPrizeDto[];
  isCheckInAllowed: boolean;
}

export interface CreateTournamentDto {
  name: string;
  scheduledDateTime: string;
  location: string | null;
  buyIn: number;
  startingStack: number;
  rebuyValue: number | null;
  rebuyStack: number | null;
  rebuyLimitLevel: number | null;
  rebuyLimitMinutes: number | null;
  rebuyLimitType: RebuyLimitType;
  addonValue: number | null;
  addonStack: number | null;
  prizeStructure: string | null;
  prizeDistributionType: PrizeDistributionType;
  usePrizeTable: boolean;
  prizeTableId: string | null;
  allowCheckInUntilLevel: number | null;
  blindLevels: CreateBlindLevelDto[];
}

export function useTournaments(leagueId: string) {
  return useQuery({
    queryKey: ['tournaments', leagueId],
    queryFn: () => api<TournamentDto[]>(`/leagues/${leagueId}/tournaments`),
    enabled: !!leagueId,
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: () => api<TournamentDetailDto>(`/tournaments/${id}`),
    enabled: !!id,
  });
}

export function useTournamentByInvite(
  inviteCode: string,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: ['tournament-invite', inviteCode],
    queryFn: () => api<TournamentDetailDto>(`/tournaments/by-invite/${inviteCode}`),
    enabled: !!inviteCode,
    // TV: jogadores/prêmios não chegam pelo SignalR (só o timer) → poll para refletir
    // rebuys/eliminações/prize pool ao vivo.
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateTournament(leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTournamentDto) =>
      api<TournamentDto>(`/leagues/${leagueId}/tournaments`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments', leagueId] });
    },
  });
}

export function useUpdateTournament(id: string, leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTournamentDto) =>
      api<void>(`/tournaments/${id}`, {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', leagueId] });
    },
  });
}

export function useSelfRegister(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ message: string }>(`/tournaments/${tournamentId}/self-register`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Timer Actions
// ---------------------------------------------------------------------------

export function useStartTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/tournaments/${tournamentId}/start`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
  });
}

export function useAddPlayerToTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/tournaments/${tournamentId}/players`, { method: 'POST', body: { playerId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
  });
}

export function useRemovePlayerFromTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/tournaments/${tournamentId}/players/${playerId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
  });
}

export function usePauseTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/tournaments/${tournamentId}/pause`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
  });
}

export function useResumeTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/tournaments/${tournamentId}/resume`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
  });
}

export function useNextLevel(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/tournaments/${tournamentId}/timer/next-level`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
  });
}

export function usePrevLevel(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/tournaments/${tournamentId}/timer/prev-level`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
  });
}

// ---------------------------------------------------------------------------
// Dashboard Actions
// ---------------------------------------------------------------------------

export function useCheckInPlayer(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/tournaments/${tournamentId}/players/${playerId}/checkin`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
  });
}

export function useCheckoutPlayer(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/tournaments/${tournamentId}/players/${playerId}/checkout`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
  });
}

export function useAddRebuy(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/tournaments/${tournamentId}/players/${playerId}/rebuy`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
  });
}

export function useSetAddon(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, hasAddon }: { playerId: string; hasAddon: boolean }) =>
      api<void>(`/tournaments/${tournamentId}/players/${playerId}/addon`, {
        method: 'POST',
        body: { hasAddon },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
  });
}

export function useEliminatePlayer(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, eliminatedByPlayerId, position }: { playerId: string; eliminatedByPlayerId?: string | null; position?: number | null }) =>
      api<{ message: string }>(`/tournaments/${tournamentId}/players/${playerId}/eliminate`, {
        method: 'POST',
        body: { eliminatedByPlayerId, position },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
  });
}

export function useUndoElimination(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      api<void>(`/tournaments/${tournamentId}/players/${playerId}/restore`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Finish Tournament
// ---------------------------------------------------------------------------

export interface FinishPlayerPosition {
  playerId: string;
  position: number;
}

export function useFinishTournament(tournamentId: string, leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ positions }: { positions: FinishPlayerPosition[] }) =>
      api<{ message: string }>(`/tournaments/${tournamentId}/finish`, {
        method: 'POST',
        body: { positions },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', leagueId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Cancelar torneio
// ---------------------------------------------------------------------------

export function useCancelTournament(tournamentId: string, leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/tournaments/${tournamentId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', leagueId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Delegados
// ---------------------------------------------------------------------------

export interface TournamentDelegateDto {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  permissions: number;
  assignedAt: string;
}

/** DelegatePermissions.All (CheckIn|Eliminate|ManageRebuys|Finish). */
export const DELEGATE_ALL = 15;

export function useDelegates(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament', tournamentId, 'delegates'],
    queryFn: () => api<TournamentDelegateDto[]>(`/tournaments/${tournamentId}/delegates`),
    enabled: !!tournamentId,
  });
}

export function useAddDelegate(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permissions = DELEGATE_ALL }: { userId: string; permissions?: number }) =>
      api<void>(`/tournaments/${tournamentId}/delegates`, {
        method: 'POST',
        body: { userId, permissions },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, 'delegates'] });
    },
  });
}

export function useRemoveDelegate(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api<void>(`/tournaments/${tournamentId}/delegates/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, 'delegates'] });
    },
  });
}
