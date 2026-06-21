import { describe, it, expect } from 'vitest';
import { nextLevelLabel } from './next-level-label';

describe('nextLevelLabel', () => {
  it('mostra "Intervalo" quando o próximo nível é break', () => {
    expect(nextLevelLabel({ sb: 0, bb: 0, ante: 0 }, true)).toBe('Intervalo');
  });

  it('mostra sb/bb no caso normal', () => {
    expect(nextLevelLabel({ sb: 50, bb: 100, ante: 0 }, false)).toBe('50/100');
  });
});
