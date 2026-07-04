import { describe, it, expect } from 'vitest';
import { selectUpcoming, selectRealizados } from './torneio-lists';
import { TournamentStatus, type TournamentDto } from '@/lib/api/hooks/use-tournaments';

function makeTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: 't1',
    leagueId: 'l1',
    leagueName: 'Liga dos Amigos',
    name: 'Torneio',
    scheduledDateTime: '2026-06-20T20:00:00Z',
    location: null,
    buyIn: 50,
    rebuyValue: null,
    addonValue: null,
    startingStack: 10000,
    status: TournamentStatus.Scheduled,
    currentLevel: 0,
    playerCount: 0,
    checkedInCount: 0,
    prizePool: 0,
    inviteCode: 'ABC',
    allowCheckInUntilLevel: null,
    createdAt: '2026-06-01T00:00:00Z',
    isCheckInAllowed: true,
    ...overrides,
  };
}

describe('selectUpcoming', () => {
  it('mantém só agendados e ordena por data crescente (o mais próximo primeiro)', () => {
    const result = selectUpcoming([
      makeTournament({ id: 'late', status: TournamentStatus.Scheduled, scheduledDateTime: '2026-07-10T20:00:00Z' }),
      makeTournament({ id: 'live', status: TournamentStatus.InProgress, scheduledDateTime: '2026-06-18T20:00:00Z' }),
      makeTournament({ id: 'soon', status: TournamentStatus.Scheduled, scheduledDateTime: '2026-06-25T20:00:00Z' }),
      makeTournament({ id: 'done', status: TournamentStatus.Finished, scheduledDateTime: '2026-05-01T20:00:00Z' }),
    ]);

    expect(result.map((t) => t.id)).toEqual(['soon', 'late']);
  });

  it('retorna lista vazia para undefined', () => {
    expect(selectUpcoming(undefined)).toEqual([]);
  });
});

describe('selectRealizados', () => {
  it('mantém só finalizados e ordena por data decrescente (mais recente primeiro)', () => {
    const result = selectRealizados([
      makeTournament({ id: 'old', status: TournamentStatus.Finished, scheduledDateTime: '2026-05-01T20:00:00Z' }),
      makeTournament({ id: 'scheduled', status: TournamentStatus.Scheduled, scheduledDateTime: '2026-07-01T20:00:00Z' }),
      makeTournament({ id: 'recent', status: TournamentStatus.Finished, scheduledDateTime: '2026-06-10T20:00:00Z' }),
      makeTournament({ id: 'cancelled', status: TournamentStatus.Cancelled, scheduledDateTime: '2026-06-09T20:00:00Z' }),
    ]);

    expect(result.map((t) => t.id)).toEqual(['recent', 'old']);
  });

  it('não muta o array de entrada', () => {
    const input = [
      makeTournament({ id: 'a', status: TournamentStatus.Finished, scheduledDateTime: '2026-05-01T20:00:00Z' }),
      makeTournament({ id: 'b', status: TournamentStatus.Finished, scheduledDateTime: '2026-06-01T20:00:00Z' }),
    ];
    selectRealizados(input);
    expect(input.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
