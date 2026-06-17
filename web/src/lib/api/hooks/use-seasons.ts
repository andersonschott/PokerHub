import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

export interface SeasonDto {
  id: string;
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SeasonSummaryDto {
  id: string;
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  tournamentsCount: number;
  totalPrizePool: number;
  uniquePlayersCount: number;
}

export interface CreateSeasonDto {
  name: string;
  startDate?: string;
  endDate?: string | null;
}

export interface UpdateSeasonDto {
  name?: string;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

export const seasonKeys = {
  all: ['seasons'] as const,
  byLeague: (leagueId: string) => [...seasonKeys.all, 'league', leagueId] as const,
  summaries: (leagueId: string) => [...seasonKeys.all, 'summaries', leagueId] as const,
  active: (leagueId: string) => [...seasonKeys.all, 'active', leagueId] as const,
  detail: (seasonId: string) => [...seasonKeys.all, 'detail', seasonId] as const,
};

export function useSeasons(leagueId: string) {
  return useQuery({
    queryKey: seasonKeys.byLeague(leagueId),
    queryFn: () => api<SeasonDto[]>(`/leagues/${leagueId}/seasons`),
    enabled: !!leagueId,
  });
}

export function useActiveSeason(leagueId: string) {
  return useQuery({
    queryKey: seasonKeys.active(leagueId),
    queryFn: () => api<SeasonDto>(`/leagues/${leagueId}/seasons/active`),
    enabled: !!leagueId,
  });
}

export function useSeasonSummaries(leagueId: string) {
  return useQuery({
    queryKey: seasonKeys.summaries(leagueId),
    queryFn: () => api<SeasonSummaryDto[]>(`/leagues/${leagueId}/seasons/summaries`),
    enabled: !!leagueId,
  });
}

export function useCreateSeason(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSeasonDto) =>
      api<SeasonDto>(`/leagues/${leagueId}/seasons`, { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: seasonKeys.byLeague(leagueId) });
      void qc.invalidateQueries({ queryKey: seasonKeys.summaries(leagueId) });
    },
  });
}

export function useSeason(seasonId: string) {
  return useQuery({
    queryKey: seasonKeys.detail(seasonId),
    queryFn: () => api<SeasonDto>(`/seasons/${seasonId}`),
    enabled: !!seasonId,
  });
}

export function useUpdateSeason(seasonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateSeasonDto) =>
      api<SeasonDto>(`/seasons/${seasonId}`, { method: 'PUT', body: dto }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: seasonKeys.detail(seasonId) });
      void qc.invalidateQueries({ queryKey: seasonKeys.byLeague(data.leagueId) });
      void qc.invalidateQueries({ queryKey: seasonKeys.summaries(data.leagueId) });
      void qc.invalidateQueries({ queryKey: seasonKeys.active(data.leagueId) });
    },
  });
}

export function useDeleteSeason(seasonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/seasons/${seasonId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: seasonKeys.all });
    },
  });
}
