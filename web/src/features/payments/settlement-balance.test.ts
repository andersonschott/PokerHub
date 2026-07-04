import { describe, it, expect } from 'vitest';
import { calculateSettlementSummary } from './settlement-balance';
import { PaymentStatus, PaymentType, type PendingDebtDto, type PaymentDto } from '@/lib/api/hooks/use-payments';

describe('calculateSettlementSummary', () => {
  const mockDebt = (id: string, amount: number, status: PaymentStatus): PendingDebtDto => ({
    paymentId: id,
    tournamentId: 't1',
    tournamentName: 'Torneio Teste',
    tournamentDate: '2026-07-04',
    debtorPlayerId: 'p1',
    creditorPlayerId: 'p2',
    creditorPlayerName: 'Credor Teste',
    creditorPixKey: 'pix@teste.com',
    amount,
    daysOpen: 1,
    type: PaymentType.Poker,
    description: null,
    status,
  });

  const mockCredit = (
    id: string,
    amount: number,
    status: PaymentStatus,
    isJackpot = false
  ): PaymentDto => ({
    id,
    tournamentId: 't1',
    tournamentName: 'Torneio Teste',
    fromPlayerId: 'p2',
    fromPlayerName: 'Devedor Teste',
    toPlayerId: 'p1',
    toPlayerName: 'Credor Teste',
    toPlayerPixKey: null,
    toPlayerPixKeyType: null,
    amount,
    type: isJackpot ? PaymentType.Jackpot : PaymentType.Poker,
    status,
    description: null,
    expenseId: null,
    createdAt: '2026-07-04T10:00:00Z',
    paidAt: null,
    confirmedAt: null,
    daysOpen: 1,
    isJackpotContribution: isJackpot,
  });

  it('calculates netBalance correctly when user has only pending debts (status 0)', () => {
    const debts = [mockDebt('d1', 150, PaymentStatus.Pending)];
    const summary = calculateSettlementSummary(debts, []);

    expect(summary.totalDebts).toBe(150);
    expect(summary.totalCredits).toBe(0);
    expect(summary.totalPendingConfirmationDebts).toBe(0);
    expect(summary.netBalance).toBe(-150);
  });

  it('excludes PaymentStatus.Paid (aguardando confirmação) from netBalance (user case R$ 283)', () => {
    // User has R$ 283 in debts that have been marked as paid and are awaiting confirmation.
    // The net balance should be 0 because the money has already been sent.
    const debts = [mockDebt('d1', 283, PaymentStatus.Paid)];
    const summary = calculateSettlementSummary(debts, []);

    expect(summary.totalDebts).toBe(0);
    expect(summary.totalPendingConfirmationDebts).toBe(283);
    expect(summary.netBalance).toBe(0);
  });

  it('calculates positive netBalance when user has pending credits (status 0)', () => {
    const credits = [mockCredit('c1', 500, PaymentStatus.Pending)];
    const summary = calculateSettlementSummary([], credits);

    expect(summary.totalCredits).toBe(500);
    expect(summary.totalDebts).toBe(0);
    expect(summary.netBalance).toBe(500);
  });

  it('excludes PaymentStatus.Paid credits from netBalance until confirmed, but tracks them', () => {
    const credits = [mockCredit('c1', 200, PaymentStatus.Paid)];
    const summary = calculateSettlementSummary([], credits);

    expect(summary.totalCredits).toBe(0);
    expect(summary.totalPendingConfirmationCredits).toBe(200);
    expect(summary.netBalance).toBe(0);
  });

  it('excludes confirmed items and jackpot contributions from active balance', () => {
    const debts = [
      mockDebt('d1', 100, PaymentStatus.Confirmed),
      mockDebt('d2', 50, PaymentStatus.Pending),
    ];
    const credits = [
      mockCredit('c1', 300, PaymentStatus.Confirmed),
      mockCredit('c2', 20, PaymentStatus.Pending, true), // jackpot contribution
      mockCredit('c3', 80, PaymentStatus.Pending),
    ];

    const summary = calculateSettlementSummary(debts, credits);

    expect(summary.totalDebts).toBe(50);
    expect(summary.totalCredits).toBe(80);
    expect(summary.netBalance).toBe(30); // 80 - 50
    expect(summary.activeDebts.length).toBe(1);
    expect(summary.activeCredits.length).toBe(1);
  });

  it('handles undefined or empty arrays gracefully', () => {
    const summary = calculateSettlementSummary(undefined, undefined);

    expect(summary.totalDebts).toBe(0);
    expect(summary.totalCredits).toBe(0);
    expect(summary.totalPendingConfirmationDebts).toBe(0);
    expect(summary.netBalance).toBe(0);
    expect(summary.activeDebts).toEqual([]);
    expect(summary.activeCredits).toEqual([]);
  });
});
