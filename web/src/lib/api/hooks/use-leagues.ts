/**
 * TanStack Query hooks for the Leagues API.
 * Types mirror PokerHub.Application/DTOs/League/ and DTOs/Player/ in the .NET project.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

// ---------------------------------------------------------------------------
// DTO types (camelCase mirror of .NET records)
// ---------------------------------------------------------------------------

/** Mirrors PokerHub.Application.DTOs.League.LeagueDto */
export interface LeagueDto {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  organizerId: string;
  organizerName: string;
  blockCheckInWithDebt: boolean;
  playerCount: number;
  tournamentCount: number;
  jackpotPercentage: number;
  accumulatedPrizePool: number;
  createdAt: string;
  isActive: boolean;
}

/** Mirrors PokerHub.Application.DTOs.Player.PlayerDto */
export interface PlayerDto {
  id: string;
  leagueId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  userId: string | null;
  createdAt: string;
  isActive: boolean;
  totalProfit: number;
  tournamentsPlayed: number;
  wins: number;
  secondPlaces: number;
  thirdPlaces: number;
  totalBuyIns: number;
  totalPrizes: number;
  itmCount: number;
  roi: number;
  itmRate: number;
}

/** Mirrors PokerHub.Application.DTOs.League.LeagueWithPlayersDto */
export interface LeagueWithPlayersDto {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  organizerId: string;
  organizerName: string;
  blockCheckInWithDebt: boolean;
  createdAt: string;
  isActive: boolean;
  players: PlayerDto[];
}

/** Mirrors PokerHub.Application.DTOs.League.CreateLeagueDto */
export interface CreateLeagueDto {
  name: string;
  description?: string | null;
  blockCheckInWithDebt: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const leagueKeys = {
  all: ['leagues'] as const,
  list: () => [...leagueKeys.all, 'list'] as const,
  detail: (id: string) => [...leagueKeys.all, 'detail', id] as const,
  players: (id: string) => [...leagueKeys.all, 'players', id] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** GET /api/leagues — list all leagues the authenticated user belongs to */
export function useLeagues() {
  return useQuery({
    queryKey: leagueKeys.list(),
    queryFn: () => api<LeagueDto[]>('/leagues'),
  });
}

/** GET /api/leagues/{id} — single league details */
export function useLeague(id: string) {
  return useQuery({
    queryKey: leagueKeys.detail(id),
    queryFn: () => api<LeagueDto>(`/leagues/${id}`),
    enabled: !!id,
  });
}

/** GET /api/leagues/{id}/players — league member list (endpoint returns LeagueWithPlayersDto) */
export function useLeaguePlayers(id: string) {
  return useQuery({
    queryKey: leagueKeys.players(id),
    queryFn: () =>
      api<LeagueWithPlayersDto>(`/leagues/${id}/players`).then((r) => r.players),
    enabled: !!id,
  });
}

/** POST /api/leagues — create a new league */
export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLeagueDto) =>
      api<LeagueDto>('/leagues', { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leagueKeys.list() });
    },
  });
}

/** Response shape from POST /api/leagues/join/{inviteCode} — returns { id, message }, not a full LeagueDto */
export interface JoinLeagueResponse {
  id: string;
  message: string;
}

/** POST /api/leagues/join/{inviteCode} — join a league via invite code */
export function useJoinLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      api<JoinLeagueResponse>(`/leagues/join/${inviteCode}`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leagueKeys.list() });
    },
  });
}

/** POST /api/leagues/{id}/leave — leave a league */
export function useLeaveLeague(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/leagues/${id}/leave`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leagueKeys.list() });
    },
  });
}

/** POST /api/leagues/{id}/regenerate-invite — regenerate the invite code (organizer only) */
export function useRegenerateInvite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ inviteCode: string }>(`/leagues/${id}/regenerate-invite`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leagueKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: leagueKeys.list() });
    },
  });
}
