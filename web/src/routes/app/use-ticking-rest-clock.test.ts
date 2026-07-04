import { describe, it, expect } from 'vitest';
import { anchorRestClock, tickRestClock } from './use-ticking-rest-clock';
import { type MockClockState } from '@/features/timer/use-mock-clock';

const base: MockClockState = {
  level: 3,
  displayLevel: 3,
  isBreak: false,
  remainingSeconds: 600,
  levelSeconds: 900,
  paused: false,
  blinds: { sb: 75, bb: 150, ante: 0 },
  nextBlinds: { sb: 100, bb: 200, ante: 25 },
  nextIsBreak: false,
  elapsedPct: 33,
};

describe('anchorRestClock', () => {
  it('deriva o restante da âncora absoluta (nível de 15min começou há 5min → restam 10min)', () => {
    const nowMs = Date.parse('2026-07-01T22:05:00Z');
    const out = anchorRestClock(base, '2026-07-01T22:00:00Z', nowMs);
    expect(out.remainingSeconds).toBe(600);
    expect(out.elapsedPct).toBe(33);
  });

  it('interpreta âncora SEM sufixo Z como UTC (backend persiste Kind=Unspecified)', () => {
    const nowMs = Date.parse('2026-07-01T22:05:00Z');
    const out = anchorRestClock(base, '2026-07-01T22:00:00', nowMs);
    expect(out.remainingSeconds).toBe(600);
  });

  it('clampa em 0 quando o nível já expirou (virada vem do servidor, nunca inventa nível)', () => {
    const nowMs = Date.parse('2026-07-01T22:20:00Z');
    const out = anchorRestClock(base, '2026-07-01T22:00:00Z', nowMs);
    expect(out.remainingSeconds).toBe(0);
    expect(out.elapsedPct).toBe(100);
  });

  it('clampa na duração do nível quando o relógio do aparelho está adiantado', () => {
    const nowMs = Date.parse('2026-07-01T21:59:00Z'); // "antes" da âncora
    const out = anchorRestClock(base, '2026-07-01T22:00:00Z', nowMs);
    expect(out.remainingSeconds).toBe(900);
  });

  it('pausado → passa a foto intacta (congelado, sem projetar)', () => {
    const paused = { ...base, paused: true };
    const out = anchorRestClock(paused, '2026-07-01T22:00:00Z', Date.parse('2026-07-01T23:00:00Z'));
    expect(out.remainingSeconds).toBe(600);
  });

  it('âncora inválida → devolve a foto sem quebrar', () => {
    const out = anchorRestClock(base, 'not-a-date', Date.now());
    expect(out.remainingSeconds).toBe(600);
  });
});

describe('tickRestClock', () => {
  it('decrementa a foto pelo tempo local decorrido (plano B, sem âncora)', () => {
    const out = tickRestClock(base, 30);
    expect(out.remainingSeconds).toBe(570);
  });

  it('pausado → congelado', () => {
    const out = tickRestClock({ ...base, paused: true }, 30);
    expect(out.remainingSeconds).toBe(600);
  });
});
