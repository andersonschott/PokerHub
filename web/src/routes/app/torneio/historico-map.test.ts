import { describe, it, expect } from 'vitest';
import { tournamentDetailToHistorico, type HistoricoDetail } from './historico-map';
import { TournamentStatus, PrizeDistributionType, type TournamentDetailDto, type TournamentPlayerDto } from '@/lib/api/hooks/use-tournaments';

function makePlayer(overrides: Partial<TournamentPlayerDto> = {}): TournamentPlayerDto {
  return {
    id: 'p1',
    tournamentId: 't1',
    playerId: 'pl1',
    playerName: 'Jogador',
    nickname: null,
    isCheckedIn: true,
    checkedInAt: null,
    rebuyCount: 0,
    hasAddon: false,
    position: null,
    prize: 0,
    eliminatedByPlayerId: null,
    eliminatedByPlayerName: null,
    eliminatedAt: null,
    totalInvestment: 0,
    profitLoss: 0,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<TournamentDetailDto> = {}): TournamentDetailDto {
  return {
    id: 't1',
    leagueId: 'l1',
    leagueName: 'Liga',
    name: 'Torneio Teste',
    scheduledDateTime: '2026-06-20T20:00:00Z',
    location: null,
    buyIn: 100,
    startingStack: 10000,
    rebuyValue: null,
    rebuyStack: null,
    rebuyLimitLevel: null,
    rebuyLimitMinutes: null,
    rebuyLimitType: 0,
    addonValue: null,
    addonStack: null,
    prizeStructure: null,
    prizeDistributionType: PrizeDistributionType.Percentage,
    usePrizeTable: false,
    inviteCode: 'ABC',
    allowCheckInUntilLevel: null,
    status: TournamentStatus.Finished,
    currentLevel: 0,
    timeRemainingSeconds: null,
    currentLevelStartedAt: null,
    createdAt: '2026-06-01T00:00:00Z',
    startedAt: null,
    finishedAt: '2026-06-21T01:00:00Z',
    prizePool: 1000,
    blindLevels: [],
    players: [],
    prizes: [],
    isCheckInAllowed: false,
    ...overrides,
  };
}

describe('tournamentDetailToHistorico', () => {
  it('mapeia campos simples e formata data de finishedAt em pt-BR', () => {
    const detail = makeDetail({
      name: 'Noite de Poker',
      buyIn: 50,
      prizePool: 800,
      finishedAt: '2026-06-21T01:00:00Z',
      scheduledDateTime: '2026-06-20T20:00:00Z',
    });

    const result = tournamentDetailToHistorico(detail, 25);

    expect(result.name).toBe('Noite de Poker');
    expect(result.buyIn).toBe(50);
    expect(result.prizePool).toBe(800);
    expect(result.caixinha).toBe(25);
    expect(result.date).toBe(new Date('2026-06-21T01:00:00Z').toLocaleDateString('pt-BR'));
  });

  it('usa scheduledDateTime quando finishedAt é nulo', () => {
    const detail = makeDetail({ finishedAt: null, scheduledDateTime: '2026-05-10T18:00:00Z' });
    expect(tournamentDetailToHistorico(detail, 0).date).toBe('10/05/2026');
  });

  it('conta jogadores, rebuys e add-ons corretamente', () => {
    const detail = makeDetail({
      players: [
        makePlayer({ rebuyCount: 2, hasAddon: true }),
        makePlayer({ rebuyCount: 0, hasAddon: false }),
        makePlayer({ rebuyCount: 1, hasAddon: true }),
        makePlayer({ rebuyCount: 0, hasAddon: true }),
      ],
    });

    const result = tournamentDetailToHistorico(detail, 0);
    expect(result.players).toBe(4);
    expect(result.rebuys).toBe(3);
    expect(result.addons).toBe(3);
  });

  it('monta pódio ordenado por posição e filtra fora do pódio', () => {
    const detail = makeDetail({
      players: [
        makePlayer({ playerName: 'Bruno', position: 2, prize: 200 }),
        makePlayer({ playerName: 'Ana', position: 1, prize: 500 }),
        makePlayer({ playerName: 'Carlos', position: 3, prize: 100 }),
        makePlayer({ playerName: 'Daniel', position: 4, prize: 0 }),
        makePlayer({ playerName: 'Elisa', position: null, prize: 0 }),
      ],
    });

    const result = tournamentDetailToHistorico(detail, 0);
    expect(result.podium).toEqual<HistoricoDetail['podium']>([
      { pos: 1, name: 'Ana', prize: 500 },
      { pos: 2, name: 'Bruno', prize: 200 },
      { pos: 3, name: 'Carlos', prize: 100 },
    ]);
  });

  it('ordena pódio mesmo quando posições chegam fora de ordem', () => {
    const detail = makeDetail({
      players: [
        makePlayer({ playerName: 'Zeca', position: 3, prize: 50 }),
        makePlayer({ playerName: 'Yara', position: 1, prize: 300 }),
        makePlayer({ playerName: 'Xuxa', position: 2, prize: 150 }),
      ],
    });

    const result = tournamentDetailToHistorico(detail, 0);
    expect(result.podium.map((p) => p.pos)).toEqual([1, 2, 3]);
    expect(result.podium.map((p) => p.name)).toEqual(['Yara', 'Xuxa', 'Zeca']);
  });

  it('retorna pódio vazio quando nenhum jogador tem posição definida', () => {
    const detail = makeDetail({
      players: [
        makePlayer({ position: null }),
        makePlayer({ position: null }),
      ],
    });

    expect(tournamentDetailToHistorico(detail, 0).podium).toEqual([]);
  });
});
