import { describe, it, expect } from 'vitest';
import { parseScheduled, reverseBlindTemplate, parsePrizeStructure } from './edit-prefill';
import { genBlinds, getTemplateConfig, type BlindTemplate } from './blind-utils';
import { PrizeDistributionType } from '@/lib/api/hooks/use-tournaments';

/** Espelha o map do submit do wizard (BlindRow → CreateBlindLevelDto-like). */
function toBlindLevels(template: BlindTemplate, customMin = 15, customBreak = 4) {
  const cfg = getTemplateConfig(template, customMin, customBreak);
  return genBlinds(cfg).map((b) => ({
    durationMinutes: b.min,
    isBreak: b.type === 'intervalo',
  }));
}

describe('reverseBlindTemplate', () => {
  it.each(['turbo', 'regular', 'deep'] as const)(
    'reverte template "%s" gerado por genBlinds',
    (template) => {
      const levels = toBlindLevels(template);
      const result = reverseBlindTemplate(levels);

      expect(result.template).toBe(template);
    },
  );

  it('reverte estrutura custom (não-template) para custom com min/break inferidos', () => {
    // 12 min, intervalo a cada 3 níveis → não casa com nenhum template
    const levels = toBlindLevels('custom', 12, 3);
    const result = reverseBlindTemplate(levels);

    expect(result.template).toBe('custom');
    expect(result.customMin).toBe(12);
    expect(result.customBreak).toBe(3);
  });

  it('sem intervalo → custom com breakEvery = nº de níveis de jogo', () => {
    const levels = [
      { durationMinutes: 15, isBreak: false },
      { durationMinutes: 15, isBreak: false },
      { durationMinutes: 15, isBreak: false },
    ];
    const result = reverseBlindTemplate(levels);

    expect(result.template).toBe('custom');
    expect(result.customMin).toBe(15);
    expect(result.customBreak).toBe(3);
  });
});

describe('parseScheduled', () => {
  it('é o inverso de new Date(`${date}T${time}:00`).toISOString() no fuso local', () => {
    const date = '2026-06-12';
    const time = '20:00';
    const iso = new Date(`${date}T${time}:00`).toISOString();

    expect(parseScheduled(iso)).toEqual({ date, time });
  });

  it('preserva zero-padding de mês, dia e hora', () => {
    const date = '2026-01-05';
    const time = '09:07';
    const iso = new Date(`${date}T${time}:00`).toISOString();

    expect(parseScheduled(iso)).toEqual({ date, time });
  });
});

describe('parsePrizeStructure', () => {
  it('percentual: type=Percentage, !usePrizeTable', () => {
    expect(parsePrizeStructure('50,30,20', PrizeDistributionType.Percentage, false)).toEqual({
      usePrizeTable: false,
      prizeMode: 'pct',
      positions: [50, 30, 20],
    });
  });

  it('valor fixo: type=Fixed, !usePrizeTable', () => {
    expect(parsePrizeStructure('300,180,120', PrizeDistributionType.Fixed, false)).toEqual({
      usePrizeTable: false,
      prizeMode: 'fixo',
      positions: [300, 180, 120],
    });
  });

  it('tabela da liga: usePrizeTable=true → pct + posições padrão', () => {
    expect(parsePrizeStructure(null, PrizeDistributionType.Percentage, true)).toEqual({
      usePrizeTable: true,
      prizeMode: 'pct',
      positions: [50, 30, 20],
    });
  });

  it('fallback [50,30,20] quando prizeStructure é null e não usa tabela', () => {
    expect(parsePrizeStructure(null, PrizeDistributionType.Percentage, false)).toEqual({
      usePrizeTable: false,
      prizeMode: 'pct',
      positions: [50, 30, 20],
    });
  });
});
