import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

export enum ExpenseSplitType {
  Equal = 0,
  Custom = 1,
}

export interface ExpenseShareDto {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
}

export interface TournamentExpenseDto {
  id: string;
  tournamentId: string;
  paidByPlayerId: string;
  paidByPlayerName: string;
  description: string;
  totalAmount: number;
  splitType: ExpenseSplitType;
  createdAt: string;
  shares: ExpenseShareDto[];
}

export interface ExpenseShareInput {
  playerId: string;
  amount: number;
}

export interface CreateExpenseDto {
  paidByPlayerId: string;
  description: string;
  totalAmount: number;
  splitType: ExpenseSplitType;
  shares: ExpenseShareInput[];
}

export interface ExpenseSummaryDto {
  playerId: string;
  playerName: string;
  totalPaid: number;
  totalOwed: number;
  expenseBalance: number;
}

export interface ExpensePlayerDto {
  id: string;
  name: string;
  nickname: string | null;
}

const EXPENSE_KEYS = {
  all: ['expenses'] as const,
  tournament: (tournamentId: string) => [...EXPENSE_KEYS.all, 'tournament', tournamentId] as const,
  detail: (expenseId: string) => [...EXPENSE_KEYS.all, 'detail', expenseId] as const,
  summary: (tournamentId: string) => [...EXPENSE_KEYS.all, 'summary', tournamentId] as const,
  eligible: (tournamentId: string) => [...EXPENSE_KEYS.all, 'eligible', tournamentId] as const,
  leaguePlayers: (tournamentId: string) => [...EXPENSE_KEYS.all, 'league-players', tournamentId] as const,
};

export function useExpenses(tournamentId: string) {
  return useQuery({
    queryKey: EXPENSE_KEYS.tournament(tournamentId),
    queryFn: () => api<TournamentExpenseDto[]>(`/tournaments/${tournamentId}/expenses`),
    enabled: !!tournamentId,
  });
}

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: EXPENSE_KEYS.detail(expenseId),
    queryFn: () => api<TournamentExpenseDto>(`/expenses/${expenseId}`),
    enabled: !!expenseId,
  });
}

export function useExpenseSummary(tournamentId: string) {
  return useQuery({
    queryKey: EXPENSE_KEYS.summary(tournamentId),
    queryFn: () => api<ExpenseSummaryDto[]>(`/tournaments/${tournamentId}/expenses/summary`),
    enabled: !!tournamentId,
  });
}

export function useEligiblePlayers(tournamentId: string) {
  return useQuery({
    queryKey: EXPENSE_KEYS.eligible(tournamentId),
    queryFn: () => api<ExpensePlayerDto[]>(`/tournaments/${tournamentId}/expenses/eligible-players`),
    enabled: !!tournamentId,
  });
}

export function useExpenseLeaguePlayers(tournamentId: string) {
  return useQuery({
    queryKey: EXPENSE_KEYS.leaguePlayers(tournamentId),
    queryFn: () => api<ExpensePlayerDto[]>(`/tournaments/${tournamentId}/expenses/league-players`),
    enabled: !!tournamentId,
  });
}

export function useCreateExpense(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateExpenseDto) =>
      api<TournamentExpenseDto>(`/tournaments/${tournamentId}/expenses`, {
        method: 'POST',
        body: dto,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.tournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.summary(tournamentId) });
    },
  });
}

export function useUpdateExpense(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, dto }: { expenseId: string; dto: CreateExpenseDto }) =>
      api<void>(`/expenses/${expenseId}`, {
        method: 'PUT',
        body: dto,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.tournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.summary(tournamentId) });
    },
  });
}

export function useDeleteExpense(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => api<void>(`/expenses/${expenseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.tournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.summary(tournamentId) });
    },
  });
}
