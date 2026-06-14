import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

export interface JackpotContributionDto {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentDate: string;
  tournamentPrizePool: number;
  percentageApplied: number;
  amount: number;
  createdAt: string;
}

export interface JackpotStatusDto {
  leagueId: string;
  accumulatedPrizePool: number;
  jackpotPercentage: number;
  totalContributions: number;
  recentContributions: JackpotContributionDto[];
}

export interface JackpotUsageDto {
  id: string;
  amount: number;
  description: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface UpdateJackpotSettingsDto {
  jackpotPercentage: number;
}

export interface UseJackpotDto {
  amount: number;
  description: string | null;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useJackpotStatus(leagueId: string | null) {
  return useQuery({
    queryKey: ['jackpot', 'status', leagueId],
    queryFn: () => api<JackpotStatusDto>(`/leagues/${leagueId}/jackpot`),
    enabled: !!leagueId,
  });
}

export function useJackpotContributions(leagueId: string | null) {
  return useQuery({
    queryKey: ['jackpot', 'contributions', leagueId],
    queryFn: () => api<JackpotContributionDto[]>(`/leagues/${leagueId}/jackpot/contributions`),
    enabled: !!leagueId,
  });
}

export function useJackpotUsages(leagueId: string | null) {
  return useQuery({
    queryKey: ['jackpot', 'usages', leagueId],
    queryFn: () => api<JackpotUsageDto[]>(`/leagues/${leagueId}/jackpot/usages`),
    enabled: !!leagueId,
  });
}

export function useUpdateJackpotSettings(leagueId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateJackpotSettingsDto) =>
      api<void>(`/leagues/${leagueId}/jackpot/settings`, {
        method: 'PUT',
        body: dto,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jackpot', 'status', leagueId] });
    },
  });
}

export function useUseJackpot(leagueId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UseJackpotDto) =>
      api<void>(`/leagues/${leagueId}/jackpot/use`, {
        method: 'POST',
        body: dto,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jackpot', 'status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['jackpot', 'usages', leagueId] });
    },
  });
}
