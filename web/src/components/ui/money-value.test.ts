import { describe, it, expect } from 'vitest';
import { formatBRL, hasCents } from './money-value';

describe('formatBRL', () => {
  it('esconde centavos de valores redondos quando cents=false', () => {
    expect(formatBRL(45, false)).toBe('45');
    expect(formatBRL(1250, false)).toBe('1.250');
  });

  it('nunca arredonda centavos reais quando cents=false', () => {
    // 45 / 10 = 4,50 por pessoa — não pode virar 5
    expect(formatBRL(4.5, false)).toBe('4,50');
    // lanche de 345 / 10 = 34,50 — não pode virar 35
    expect(formatBRL(34.5, false)).toBe('34,50');
    expect(formatBRL(-4.5, false)).toBe('4,50');
  });

  it('sempre mostra centavos quando cents=true', () => {
    expect(formatBRL(45, true)).toBe('45,00');
    expect(formatBRL(4.5, true)).toBe('4,50');
  });
});

describe('hasCents', () => {
  it('detecta fração de centavos', () => {
    expect(hasCents(45)).toBe(false);
    expect(hasCents(4.5)).toBe(true);
    expect(hasCents(-34.5)).toBe(true);
    expect(hasCents(4.004)).toBe(false);
  });
});
