import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

export enum PaymentStatus {
  Pending = 0,
  Paid = 1,
  Confirmed = 2,
  Cancelled = 3,
}

export enum PaymentType {
  Poker = 0,
  Expense = 1,
  Jackpot = 2,
}

export enum PixKeyType {
  Cpf = 0,
  Cnpj = 1,
  Phone = 2,
  Email = 3,
  Random = 4,
}

export interface PaymentCalculationDto {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  toPlayerPixKey: string | null;
  amount: number;
}

export interface PlayerBalanceDto {
  playerId: string;
  playerName: string;
  totalInvestment: number;
  prize: number;
  balance: number;
}

export interface PaymentDto {
  id: string;
  tournamentId: string;
  tournamentName: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string | null;
  toPlayerName: string;
  toPlayerPixKey: string | null;
  toPlayerPixKeyType: PixKeyType | null;
  amount: number;
  status: PaymentStatus;
  type: PaymentType;
  createdAt: string;
  paidAt: string | null;
  confirmedAt: string | null;
  daysOpen: number;
  description: string | null;
  expenseId: string | null;
  isJackpotContribution: boolean;
}

export interface PendingDebtDto {
  paymentId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentDate: string;
  debtorPlayerId: string;
  creditorPlayerId: string;
  creditorPlayerName: string;
  creditorPixKey: string | null;
  amount: number;
  daysOpen: number;
  type: PaymentType;
  description: string | null;
  status: PaymentStatus;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTournamentPayments(tournamentId: string) {
  return useQuery({
    queryKey: ['payments', 'tournament', tournamentId],
    queryFn: () => api<PaymentDto[]>(`/tournaments/${tournamentId}/payments`),
    enabled: !!tournamentId,
  });
}

export function useTournamentBalances(tournamentId: string) {
  return useQuery({
    queryKey: ['balances', 'tournament', tournamentId],
    queryFn: () => api<PlayerBalanceDto[]>(`/tournaments/${tournamentId}/payments/balances`),
    enabled: !!tournamentId,
  });
}

export function useCalculatePayments(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<PaymentDto[]>(`/tournaments/${tournamentId}/payments/calculate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['balances', 'tournament', tournamentId] });
    },
  });
}

export function useMyDebts() {
  return useQuery({
    queryKey: ['payments', 'my-debts'],
    queryFn: () => api<PendingDebtDto[]>('/payments/my-debts'),
  });
}

export function useMyCredits() {
  return useQuery({
    queryKey: ['payments', 'my-credits'],
    queryFn: () => api<PaymentDto[]>('/payments/my-credits'),
  });
}

export function useOrganizerPayments() {
  return useQuery({
    queryKey: ['payments', 'organizer'],
    queryFn: () => api<PaymentDto[]>('/payments/organizer'),
  });
}

export function useBulkConfirmPayments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentIds: string[]) =>
      api<{ confirmed: number }>('/payments/bulk-confirm', {
        method: 'POST',
        body: { paymentIds },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'organizer'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'tournament'] });
    },
  });
}

export function useMarkAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api<void>(`/payments/${paymentId}/mark-paid`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'my-debts'] });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api<void>(`/payments/${paymentId}/confirm`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'organizer'] });
    },
  });
}

export function useAdminMarkAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api<{ message: string }>(`/payments/${paymentId}/admin-mark-paid`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'tournament'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'organizer'] });
    },
  });
}

export function useAdminConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api<{ message: string }>(`/payments/${paymentId}/admin-confirm`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'tournament'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'organizer'] });
    },
  });
}

export function useJackpotContribution(tournamentId: string) {
  return useQuery({
    queryKey: ['payments', 'jackpot', tournamentId],
    queryFn: () => api<{ amount: number }>(`/tournaments/${tournamentId}/payments/jackpot-contribution`),
    enabled: !!tournamentId,
  });
}
