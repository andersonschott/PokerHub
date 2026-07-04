import { describe, it, expect } from 'vitest';
import { jackpotBalance } from './jackpot-balance';

describe('jackpotBalance', () => {
  it('retorna 0 quando ambas as listas são undefined', () => {
    expect(jackpotBalance(undefined, undefined)).toBe(0);
  });

  it('retorna 0 quando ambas as listas são null', () => {
    expect(jackpotBalance(null, null)).toBe(0);
  });

  it('retorna 0 quando ambas as listas são vazias', () => {
    expect(jackpotBalance([], [])).toBe(0);
  });

  it('soma contribuições e subtrai usos', () => {
    const contributions = [{ amount: 100 }, { amount: 50 }];
    const usages = [{ amount: 30 }];
    expect(jackpotBalance(contributions, usages)).toBe(120);
  });

  it('ignora contribuições undefined tratando como vazias', () => {
    expect(jackpotBalance(undefined, [{ amount: 25 }])).toBe(-25);
  });

  it('ignora usos undefined tratando como vazios', () => {
    expect(jackpotBalance([{ amount: 80 }], undefined)).toBe(80);
  });

  it('retorna saldo negativo quando usos superam contribuições', () => {
    const contributions = [{ amount: 40 }];
    const usages = [{ amount: 100 }, { amount: 20 }];
    expect(jackpotBalance(contributions, usages)).toBe(-80);
  });
});
