import { describe, it, expect } from 'vitest';
import { PaymentType } from '@/lib/api/hooks/use-payments';
import { aggregateDebts, CAIXINHA_ID } from './aggregate-debts';
import type { AggregatableDebt } from './aggregate-debts';

function makeDebt(overrides: Partial<AggregatableDebt> & Pick<AggregatableDebt, 'id' | 'fromPlayerId' | 'toPlayerId' | 'amount' | 'type'>): AggregatableDebt {
  return {
    fromPlayerName: 'Devedor',
    toPlayerName: 'Credor',
    toPlayerPixKey: null,
    status: 0,
    isJackpotContribution: false,
    ...overrides,
  };
}

describe('aggregateDebts', () => {
  it('agrupa pagamentos do mesmo par devedor → credor', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 50, type: PaymentType.Poker }),
      makeDebt({ id: 'p2', fromPlayerId: 'a', toPlayerId: 'b', amount: 5, type: PaymentType.Expense }),
    ];

    const result = aggregateDebts(debts);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fromPlayerId: 'a',
      toPlayerId: 'b',
      totalAmount: 55,
      paymentIds: ['p1', 'p2'],
    });
    expect(result[0].breakdown).toHaveLength(2);
    expect(result[0].breakdown.find((b) => b.type === PaymentType.Poker)?.amount).toBe(50);
    expect(result[0].breakdown.find((b) => b.type === PaymentType.Expense)?.amount).toBe(5);
  });

  it('mantém pares diferentes separados', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 10, type: PaymentType.Poker }),
      makeDebt({ id: 'p2', fromPlayerId: 'c', toPlayerId: 'b', amount: 20, type: PaymentType.Poker }),
      makeDebt({ id: 'p3', fromPlayerId: 'a', toPlayerId: 'd', amount: 30, type: PaymentType.Poker }),
    ];

    const result = aggregateDebts(debts);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.totalAmount)).toEqual([30, 20, 10]);
  });

  it('agrupa contribuições de caixinha em grupo próprio com credor virtual', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 50, type: PaymentType.Poker }),
      makeDebt({
        id: 'j1',
        fromPlayerId: 'a',
        toPlayerId: null,
        toPlayerName: 'Caixinha',
        amount: 10,
        type: PaymentType.Jackpot,
        isJackpotContribution: true,
      }),
    ];

    const result = aggregateDebts(debts);
    expect(result).toHaveLength(2);
    const jackpotGroup = result.find((g) => g.isJackpot)!;
    expect(jackpotGroup).toMatchObject({
      fromPlayerId: 'a',
      toPlayerId: CAIXINHA_ID,
      toPlayerName: 'Caixinha',
      totalAmount: 10,
      paymentIds: ['j1'],
    });
    const normalGroup = result.find((g) => !g.isJackpot)!;
    expect(normalGroup.totalAmount).toBe(50);
  });

  it('trata itens sem credor identificado como caixinha (legado sem flag)', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: null, amount: 50, type: PaymentType.Jackpot }),
    ];

    const result = aggregateDebts(debts);
    expect(result).toHaveLength(1);
    expect(result[0].isJackpot).toBe(true);
    expect(result[0].toPlayerId).toBe(CAIXINHA_ID);
    expect(result[0].toPlayerName).toBe('Caixinha');
  });

  it('propaga a chave PIX da caixinha para o grupo', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({
        id: 'j1',
        fromPlayerId: 'a',
        toPlayerId: null,
        toPlayerName: 'Caixinha',
        toPlayerPixKey: 'caixinha@liga.com',
        amount: 10,
        type: PaymentType.Jackpot,
        isJackpotContribution: true,
      }),
    ];

    const result = aggregateDebts(debts);
    expect(result[0].toPlayerPixKey).toBe('caixinha@liga.com');
  });

  it('preserva flags de status do grupo corretamente', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 50, type: PaymentType.Poker, status: 2 }),
      makeDebt({ id: 'p2', fromPlayerId: 'a', toPlayerId: 'b', amount: 5, type: PaymentType.Expense, status: 0 }),
    ];

    const result = aggregateDebts(debts);
    expect(result[0].allConfirmed).toBe(false);
    expect(result[0].hasPending).toBe(true);
    expect(result[0].pendingPaymentIds).toEqual(['p2']);
  });

  it('marca grupo como totalmente confirmado quando todos os itens estão confirmados', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 50, type: PaymentType.Poker, status: 2 }),
      makeDebt({ id: 'p2', fromPlayerId: 'a', toPlayerId: 'b', amount: 5, type: PaymentType.Expense, status: 2 }),
    ];

    const result = aggregateDebts(debts);
    expect(result[0].allConfirmed).toBe(true);
    expect(result[0].hasPending).toBe(false);
    expect(result[0].pendingPaymentIds).toEqual([]);
  });

  it('não considera status Paid (1) como pendente estrito', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 50, type: PaymentType.Poker, status: 1 }),
      makeDebt({ id: 'p2', fromPlayerId: 'a', toPlayerId: 'b', amount: 5, type: PaymentType.Expense, status: 2 }),
    ];

    const result = aggregateDebts(debts);
    expect(result[0].allConfirmed).toBe(false);
    expect(result[0].hasPending).toBe(false);
    expect(result[0].pendingPaymentIds).toEqual([]);
  });

  it('agrupa apenas os ids estritamente pendentes em pendingPaymentIds', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 10, type: PaymentType.Poker, status: 0 }),
      makeDebt({ id: 'p2', fromPlayerId: 'a', toPlayerId: 'b', amount: 20, type: PaymentType.Expense, status: 1 }),
      makeDebt({ id: 'p3', fromPlayerId: 'a', toPlayerId: 'b', amount: 30, type: PaymentType.Poker, status: 0 }),
      makeDebt({ id: 'p4', fromPlayerId: 'a', toPlayerId: 'b', amount: 40, type: PaymentType.Expense, status: 2 }),
    ];

    const result = aggregateDebts(debts);
    expect(result[0].allConfirmed).toBe(false);
    expect(result[0].hasPending).toBe(true);
    expect(result[0].pendingPaymentIds).toEqual(['p1', 'p3']);
  });

  it('ordena grupos por total descendente', () => {
    const debts: AggregatableDebt[] = [
      makeDebt({ id: 'p1', fromPlayerId: 'a', toPlayerId: 'b', amount: 10, type: PaymentType.Poker }),
      makeDebt({ id: 'p2', fromPlayerId: 'c', toPlayerId: 'd', amount: 100, type: PaymentType.Poker }),
      makeDebt({ id: 'p3', fromPlayerId: 'e', toPlayerId: 'f', amount: 50, type: PaymentType.Poker }),
    ];

    const result = aggregateDebts(debts);
    expect(result.map((r) => r.totalAmount)).toEqual([100, 50, 10]);
  });
});
