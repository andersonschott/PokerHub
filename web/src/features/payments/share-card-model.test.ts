import { describe, it, expect } from 'vitest';
import { buildShareCardModel } from './share-card-model';
import type { AggregatedDebt } from './aggregate-debts';

function makeAggregatedDebt(overrides: Partial<AggregatedDebt> & Pick<AggregatedDebt, 'key' | 'fromPlayerName' | 'toPlayerName' | 'totalAmount'>): AggregatedDebt {
  return {
    fromPlayerId: 'f1',
    toPlayerId: 't1',
    toPlayerPixKey: null,
    isJackpot: false,
    breakdown: [],
    paymentIds: [],
    pendingPaymentIds: [],
    openPaymentIds: [],
    expenseDescription: null,
    allConfirmed: false,
    hasPending: true,
    ...overrides,
  };
}

describe('buildShareCardModel', () => {
  it('monta título, data e linhas pendentes', () => {
    const debts: AggregatedDebt[] = [
      makeAggregatedDebt({
        key: 'a|b',
        fromPlayerName: 'Alice',
        toPlayerName: 'Bob',
        totalAmount: 120,
        hasPending: true,
      }),
      makeAggregatedDebt({
        key: 'c|d',
        fromPlayerName: 'Carlos',
        toPlayerName: 'Diana',
        totalAmount: 80,
        hasPending: true,
      }),
    ];

    const model = buildShareCardModel('Torneio Mensal', '2026-06-22T19:00:00Z', debts);

    expect(model.title).toBe('Torneio Mensal');
    expect(model.subtitle).toBe('22/06/2026');
    expect(model.lines).toEqual([
      { from: 'Alice', to: 'Bob', amount: 120 },
      { from: 'Carlos', to: 'Diana', amount: 80 },
    ]);
    expect(model.total).toBe(200);
    expect(model.empty).toBe(false);
  });

  it('ignora grupos sem pendências e calcula total apenas dos pendentes', () => {
    const debts: AggregatedDebt[] = [
      makeAggregatedDebt({
        key: 'a|b',
        fromPlayerName: 'Alice',
        toPlayerName: 'Bob',
        totalAmount: 50,
        hasPending: true,
      }),
      makeAggregatedDebt({
        key: 'c|d',
        fromPlayerName: 'Carlos',
        toPlayerName: 'Diana',
        totalAmount: 999,
        hasPending: false,
        allConfirmed: true,
      }),
    ];

    const model = buildShareCardModel('Freezeout', null, debts);

    expect(model.lines).toHaveLength(1);
    expect(model.lines[0]).toEqual({ from: 'Alice', to: 'Bob', amount: 50 });
    expect(model.total).toBe(50);
    expect(model.empty).toBe(false);
    expect(model.subtitle).toBe('');
  });

  it('marca modelo como vazio quando não há pendências', () => {
    const debts: AggregatedDebt[] = [
      makeAggregatedDebt({
        key: 'a|b',
        fromPlayerName: 'Alice',
        toPlayerName: 'Bob',
        totalAmount: 100,
        hasPending: false,
        allConfirmed: true,
      }),
    ];

    const model = buildShareCardModel('Sem débitos', '2026-06-22', debts);

    expect(model.lines).toHaveLength(0);
    expect(model.total).toBe(0);
    expect(model.empty).toBe(true);
  });

  it('aceita objeto Date diretamente', () => {
    const debts: AggregatedDebt[] = [
      makeAggregatedDebt({
        key: 'a|b',
        fromPlayerName: 'Alice',
        toPlayerName: 'Bob',
        totalAmount: 10,
        hasPending: true,
      }),
    ];

    const model = buildShareCardModel('Date Input', new Date('2026-12-25T12:00:00Z'), debts);

    expect(model.subtitle).toBe('25/12/2026');
  });

  it('lida com data inválida retornando subtítulo vazio', () => {
    const debts: AggregatedDebt[] = [
      makeAggregatedDebt({
        key: 'a|b',
        fromPlayerName: 'Alice',
        toPlayerName: 'Bob',
        totalAmount: 10,
        hasPending: true,
      }),
    ];

    const model = buildShareCardModel('Invalid Date', 'not-a-date', debts);

    expect(model.subtitle).toBe('');
  });
});
