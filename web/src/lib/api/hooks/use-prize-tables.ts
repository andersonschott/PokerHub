import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

export interface PrizeTableDto {
  id: string;
  leagueId: string;
  name: string;
  description: string | null;
  tiers: PrizeTierDto[];
  createdAt: string;
}

export interface PrizeTierDto {
  id: string;
  prizeTableId: string;
  position: number;
  percentage: number;
}

export interface CreatePrizeTableDto {
  name: string;
  description?: string | null;
  tiers: CreatePrizeTierDto[];
}

export interface CreatePrizeTierDto {
  position: number;
  percentage: number;
}

export interface UpdatePrizeTableDto {
  name?: string;
  description?: string | null;
  tiers?: CreatePrizeTierDto[];
}

export const prizeTableKeys = {
  all: ['prizeTables'] as const,
  byLeague: (leagueId: string) => [...prizeTableKeys.all, 'league', leagueId] as const,
  detail: (id: string) => [...prizeTableKeys.all, 'detail', id] as const,
};

export function usePrizeTables(leagueId: string) {
  return useQuery({
    queryKey: prizeTableKeys.byLeague(leagueId),
    queryFn: () => api<PrizeTableDto[]>(`/leagues/${leagueId}/prize-tables`),
    enabled: !!leagueId,
  });
}

export function useCreatePrizeTable(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePrizeTableDto) =>
      api<PrizeTableDto>(`/leagues/${leagueId}/prize-tables`, { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: prizeTableKeys.byLeague(leagueId) });
    },
  });
}

export function usePrizeTable(prizeTableId: string) {
  return useQuery({
    queryKey: prizeTableKeys.detail(prizeTableId),
    queryFn: () => api<PrizeTableDto>(`/prize-tables/${prizeTableId}`),
    enabled: !!prizeTableId,
  });
}

export function useUpdatePrizeTable(prizeTableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePrizeTableDto) =>
      api<PrizeTableDto>(`/prize-tables/${prizeTableId}`, { method: 'PUT', body: dto }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: prizeTableKeys.detail(prizeTableId) });
      void qc.invalidateQueries({ queryKey: prizeTableKeys.byLeague(data.leagueId) });
    },
  });
}

export function useDeletePrizeTable(prizeTableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/prize-tables/${prizeTableId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: prizeTableKeys.all });
    },
  });
}
