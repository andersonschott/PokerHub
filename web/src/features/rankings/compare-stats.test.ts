import { describe, it, expect } from 'vitest';
import { buildComparison, roiOf, itmOf } from './compare-stats';
import type { PlayerStatsDto } from '@/lib/api/hooks/use-player-stats';
import type { PlayerRankingDto } from '@/lib/api/hooks/use-rankings';

function makeStats(overrides: Partial<PlayerStatsDto> = {}): PlayerStatsDto {
  return {
    playerId: 'p1',
    playerName: 'Ana Reis',
    nickname: 'a_reis',
    tournamentsPlayed: 10,
    wins: 4,
    secondPlaces: 2,
    thirdPlaces: 1,
    top3Finishes: 7,
    totalBuyIns: 1000,
    totalPrizes: 1800,
    profit: 800,
    bestResult: 1,
    worstResult: 9,
    averagePosition: 3.5,
    recentResults: [],
    hasLegacyData: false,
    ...overrides,
  };
}

function makeRanking(overrides: Partial<PlayerRankingDto> = {}): PlayerRankingDto {
  return {
    position: 1,
    playerId: 'p1',
    playerName: 'Ana Reis',
    nickname: 'a_reis',
    tournamentsPlayed: 10,
    wins: 4,
    secondPlaces: 2,
    thirdPlaces: 1,
    top3Finishes: 7,
    totalBuyIns: 1000,
    totalPrizes: 1800,
    profit: 800,
    roi: 80,
    itmRate: 62,
    totalSeasonTournaments: 14,
    participationPercentage: 98,
    ...overrides,
  };
}

const row = (rows: ReturnType<typeof buildComparison>, label: string) =>
  rows.find((r) => r.label === label)!;

describe('roiOf / itmOf (derivados)', () => {
  it('ROI = profit / totalBuyIns * 100', () => {
    expect(roiOf(makeStats({ profit: 800, totalBuyIns: 1000 }))).toBeCloseTo(80);
    expect(roiOf(makeStats({ profit: -250, totalBuyIns: 1000 }))).toBeCloseTo(-25);
  });

  it('ROI = 0 quando não há buy-ins (evita divisão por zero)', () => {
    expect(roiOf(makeStats({ profit: 500, totalBuyIns: 0 }))).toBe(0);
  });

  it('ITM usa ranking.itmRate quando disponível', () => {
    expect(itmOf(makeStats({ top3Finishes: 7, tournamentsPlayed: 10 }), makeRanking({ itmRate: 62 }))).toBe(62);
  });

  it('ITM usa itmRate mesmo quando é 0 (?? não cai no fallback)', () => {
    expect(itmOf(makeStats({ top3Finishes: 7, tournamentsPlayed: 10 }), makeRanking({ itmRate: 0 }))).toBe(0);
  });

  it('ITM deriva de top3/torneios quando não há ranking', () => {
    expect(itmOf(makeStats({ top3Finishes: 7, tournamentsPlayed: 10 }), null)).toBeCloseTo(70);
  });

  it('ITM = 0 quando não jogou torneios e não há ranking', () => {
    expect(itmOf(makeStats({ top3Finishes: 0, tournamentsPlayed: 0 }), null)).toBe(0);
  });
});

describe('buildComparison', () => {
  it('retorna as 9 linhas na ordem do contrato', () => {
    const rows = buildComparison(makeStats(), makeRanking(), makeStats(), makeRanking());
    expect(rows.map((r) => r.label)).toEqual([
      'Torneios',
      'Vitórias',
      'Top 3',
      'Lucro',
      'ROI',
      'ITM',
      'Pos. Média',
      'Investido',
      'Prêmios',
    ]);
  });

  it('marca o vencedor à esquerda quando o jogador 1 é maior', () => {
    const rows = buildComparison(
      makeStats({ wins: 8 }),
      null,
      makeStats({ wins: 3 }),
      null,
    );
    expect(row(rows, 'Vitórias').winner).toBe('left');
  });

  it('marca o vencedor à direita quando o jogador 2 é maior', () => {
    const rows = buildComparison(
      makeStats({ wins: 3 }),
      null,
      makeStats({ wins: 8 }),
      null,
    );
    expect(row(rows, 'Vitórias').winner).toBe('right');
  });

  it('empate quando os valores são iguais', () => {
    const rows = buildComparison(
      makeStats({ wins: 5 }),
      null,
      makeStats({ wins: 5 }),
      null,
    );
    expect(row(rows, 'Vitórias').winner).toBe('tie');
  });

  it("'none' e '--' quando falta um dos jogadores", () => {
    const rows = buildComparison(makeStats({ wins: 5 }), null, undefined, undefined);
    const r = row(rows, 'Vitórias');
    expect(r.winner).toBe('none');
    expect(r.display1).toBe('5');
    expect(r.display2).toBe('--');
  });

  it('Pos. Média: menor vence (LowerIsBetter)', () => {
    const rows = buildComparison(
      makeStats({ averagePosition: 2.5 }),
      null,
      makeStats({ averagePosition: 6.0 }),
      null,
    );
    expect(row(rows, 'Pos. Média').winner).toBe('left');
  });

  it('ROI: vencedor e formatação com sinal', () => {
    const rows = buildComparison(
      makeStats({ profit: 800, totalBuyIns: 1000 }), // +80%
      null,
      makeStats({ profit: -250, totalBuyIns: 1000 }), // -25%
      null,
    );
    const r = row(rows, 'ROI');
    expect(r.winner).toBe('left');
    expect(r.display1).toBe('+80,0%');
    expect(r.display2).toBe('-25,0%');
  });

  it('ITM: prioriza ranking.itmRate de cada lado para decidir o vencedor', () => {
    const rows = buildComparison(
      makeStats({ top3Finishes: 1, tournamentsPlayed: 10 }), // derivado seria 10%
      makeRanking({ itmRate: 70 }),
      makeStats({ top3Finishes: 9, tournamentsPlayed: 10 }), // derivado seria 90%
      makeRanking({ itmRate: 40 }),
    );
    const r = row(rows, 'ITM');
    expect(r.display1).toBe('70,0%');
    expect(r.display2).toBe('40,0%');
    expect(r.winner).toBe('left'); // 70 > 40, apesar do top3 derivado dizer o contrário
  });

  it('Lucro formatado em BRL com sinal', () => {
    const rows = buildComparison(
      makeStats({ profit: 1840 }),
      null,
      makeStats({ profit: -320 }),
      null,
    );
    const r = row(rows, 'Lucro');
    expect(r.display1).toBe('+R$ 1.840');
    expect(r.display2).toBe('-R$ 320');
    expect(r.winner).toBe('left');
  });

  it('sem nenhum jogador: todas as linhas viram "--" / "none"', () => {
    const rows = buildComparison(undefined, undefined, undefined, undefined);
    expect(rows).toHaveLength(9);
    for (const r of rows) {
      expect(r.display1).toBe('--');
      expect(r.display2).toBe('--');
      expect(r.winner).toBe('none');
    }
  });
});
