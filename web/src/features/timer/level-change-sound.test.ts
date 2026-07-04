import { describe, it, expect } from 'vitest';
import { levelChangeSound } from './level-change-sound';

describe('levelChangeSound', () => {
  it('não toca no 1º render (sem nível anterior)', () => {
    expect(levelChangeSound(null, 1, false)).toBeNull();
  });

  it('não toca ao sair do loading (nível anterior 0)', () => {
    expect(levelChangeSound(0, 1, false)).toBeNull();
  });

  it('não toca quando o clock atual ainda está em loading (nível 0)', () => {
    expect(levelChangeSound(1, 0, false)).toBeNull();
  });

  it('não toca quando o nível não muda', () => {
    expect(levelChangeSound(2, 2, false)).toBeNull();
  });

  it('toca level-change ao avançar para um nível de jogo', () => {
    expect(levelChangeSound(1, 2, false)).toBe('level-change');
  });

  it('toca break-start quando o novo nível é intervalo', () => {
    expect(levelChangeSound(2, 3, true)).toBe('break-start');
  });

  it('dispara também em retorno manual de nível (qualquer mudança)', () => {
    expect(levelChangeSound(3, 2, false)).toBe('level-change');
  });
});
