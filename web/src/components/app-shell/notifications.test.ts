import { describe, it, expect } from 'vitest';
import { buildNotifications, debtsNotification, upcomingNotification } from './notifications';
import type { PendingDebtDto } from '@/lib/api/hooks/use-payments';
import { TournamentStatus, type TournamentDto } from '@/lib/api/hooks/use-tournaments';

const NOW = new Date('2026-07-09T12:00:00');

function makeDebt(overrides: Partial<PendingDebtDto> = {}): PendingDebtDto {
  return {
    paymentId: 'p1',
    tournamentId: 't1',
    tournamentName: 'Torneio da Sexta',
    tournamentDate: '2026-07-03T20:00:00',
    debtorPlayerId: 'me',
    creditorPlayerId: 'ana',
    creditorPlayerName: 'Ana Reis',
    creditorPixKey: null,
    amount: 50,
    daysOpen: 2,
    type: 0,
    description: null,
    status: 0,
    ...overrides,
  };
}

function makeTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: 't1',
    leagueId: 'l1',
    leagueName: 'Liga',
    name: 'Especial de Fim de Mês',
    scheduledDateTime: '2026-07-11T19:30:00',
    location: null,
    buyIn: 100,
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
    createdAt: '2026-07-01T00:00:00',
    isCheckInAllowed: false,
    ...overrides,
  };
}

describe('debtsNotification', () => {
  it('resume os débitos pendentes com nome do torneio quando é um só', () => {
    const n = debtsNotification([makeDebt(), makeDebt({ paymentId: 'p2', daysOpen: 5 })]);
    expect(n).not.toBeNull();
    expect(n!.text).toBe('Você tem 2 pagamentos pendentes do Torneio da Sexta');
    expect(n!.when).toBe('há 5 dias');
    expect(n!.to).toBe('/app/debitos');
  });

  it('singular para um débito e omite o torneio quando há vários', () => {
    const one = debtsNotification([makeDebt({ daysOpen: 0 })]);
    expect(one!.text).toBe('Você tem 1 pagamento pendente do Torneio da Sexta');
    expect(one!.when).toBe('hoje');

    const many = debtsNotification([
      makeDebt(),
      makeDebt({ paymentId: 'p2', tournamentName: 'Turbo de Quarta', daysOpen: 1 }),
    ]);
    expect(many!.text).toBe('Você tem 2 pagamentos pendentes');
  });

  it('retorna null sem débitos', () => {
    expect(debtsNotification([])).toBeNull();
    expect(debtsNotification(undefined)).toBeNull();
  });
});

describe('upcomingNotification', () => {
  it('aponta o próximo torneio AGENDADO no futuro (o mais cedo)', () => {
    const n = upcomingNotification(
      [
        makeTournament({ id: 'a', name: 'Mais longe', scheduledDateTime: '2026-07-20T20:00:00' }),
        makeTournament({ id: 'b', name: 'Mais perto', scheduledDateTime: '2026-07-11T19:30:00' }),
        makeTournament({ id: 'c', status: TournamentStatus.Finished, scheduledDateTime: '2026-07-10T20:00:00' }),
        makeTournament({ id: 'd', name: 'Passado', scheduledDateTime: '2026-07-01T20:00:00' }),
      ],
      NOW,
    );
    expect(n).not.toBeNull();
    expect(n!.id).toBe('upcoming-b');
    expect(n!.text).toContain('Mais perto é ');
    expect(n!.text).toContain('confirme sua presença');
    expect(n!.to).toBe('/app/torneio');
  });

  it('retorna null sem torneios agendados futuros', () => {
    expect(upcomingNotification([], NOW)).toBeNull();
    expect(
      upcomingNotification([makeTournament({ status: TournamentStatus.InProgress })], NOW),
    ).toBeNull();
  });
});

describe('buildNotifications', () => {
  it('combina débitos + próximo torneio e descarta nulls', () => {
    const all = buildNotifications([makeDebt()], [makeTournament()], NOW);
    expect(all.map((n) => n.kind)).toEqual(['debts', 'upcoming']);

    expect(buildNotifications(undefined, undefined, NOW)).toEqual([]);
  });
});
