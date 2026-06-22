import { describe, it, expect } from 'vitest';
import {
  entriesTotal, grandTotal, difference, isBalanced, isValid, renumber, prizeAt,
  type PrizeEntryDraft,
} from './prize-table-form';

const e = (position: number, prizeAmount: number): PrizeEntryDraft => ({ position, prizeAmount });

describe('prize-table-form', () => {
  it('entriesTotal soma os prêmios', () => {
    expect(entriesTotal([e(1, 500), e(2, 300), e(3, 200)])).toBe(1000);
    expect(entriesTotal([])).toBe(0);
  });

  it('grandTotal soma prêmios + caixinha', () => {
    expect(grandTotal([e(1, 500), e(2, 300)], 200)).toBe(1000);
  });

  it('difference = pool - (prêmios + caixinha), 2 casas', () => {
    expect(difference(1000, [e(1, 500), e(2, 300)], 200)).toBe(0);
    expect(difference(1000, [e(1, 500)], 0)).toBe(500);
    expect(difference(100.1, [e(1, 50.05)], 0)).toBe(50.05);
  });

  it('isBalanced tolera 0.01', () => {
    expect(isBalanced(1000, [e(1, 1000)], 0)).toBe(true);
    expect(isBalanced(1000, [e(1, 999.995)], 0)).toBe(true);
    expect(isBalanced(1000, [e(1, 900)], 0)).toBe(false);
  });

  it('isValid exige pool>0 e ao menos um prêmio>0', () => {
    expect(isValid(1000, [e(1, 500)])).toBe(true);
    expect(isValid(0, [e(1, 500)])).toBe(false);
    expect(isValid(1000, [e(1, 0), e(2, 0)])).toBe(false);
  });

  it('renumber reatribui posições 1..N', () => {
    expect(renumber([e(1, 500), e(3, 200)])).toEqual([e(1, 500), e(2, 200)]);
  });

  it('prizeAt retorna o prêmio da posição ou null', () => {
    const list = [e(1, 500), e(2, 300)];
    expect(prizeAt(list, 1)).toBe(500);
    expect(prizeAt(list, 3)).toBeNull();
  });
});
