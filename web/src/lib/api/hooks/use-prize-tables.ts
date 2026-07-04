import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

export interface PrizeTableEntryDto {
  position: number;
  prizeAmount: number;
}

export interface LeaguePrizeTableDto {
  id: string;
  leagueId: string;
  name: string;
  prizePoolTotal: number;
  jackpotAmount: number;
  entries: PrizeTableEntryDto[];
  createdAt: string;
}

export interface CreatePrizeTableEntryDto {
  position: number;
  prizeAmount: number;
}

export interface CreatePrizeTableDto {
  name?: string;
  prizePoolTotal: number;
  jackpotAmount: number;
  entries: CreatePrizeTableEntryDto[];
}

export type UpdatePrizeTableDto = CreatePrizeTableDto;

export const prizeTableKeys = {
  all: ['prizeTables'] as const,
  byLeague: (leagueId: string) => [...prizeTableKeys.all, 'league', leagueId] as const,
  detail: (id: string) => [...prizeTableKeys.all, 'detail', id] as const,
};

export function usePrizeTables(leagueId: string) {
  return useQuery({
    queryKey: prizeTableKeys.byLeague(leagueId),
    queryFn: () => api<LeaguePrizeTableDto[]>(`/leagues/${leagueId}/prize-tables`),
    enabled: !!leagueId,
  });
}

export function useCreatePrizeTable(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePrizeTableDto) =>
      api<LeaguePrizeTableDto>(`/leagues/${leagueId}/prize-tables`, { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: prizeTableKeys.byLeague(leagueId) });
    },
  });
}

export function usePrizeTable(prizeTableId: string) {
  return useQuery({
    queryKey: prizeTableKeys.detail(prizeTableId),
    queryFn: () => api<LeaguePrizeTableDto>(`/prize-tables/${prizeTableId}`),
    enabled: !!prizeTableId,
  });
}

export function useUpdatePrizeTable(prizeTableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePrizeTableDto) =>
      api<LeaguePrizeTableDto>(`/prize-tables/${prizeTableId}`, { method: 'PUT', body: dto }),
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
