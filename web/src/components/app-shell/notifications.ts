/**
 * Derivação pura das notificações do sininho (header mobile).
 * Espelha o sheet de notificações do Home.jsx do design system, com dados reais:
 * pagamentos pendentes (my-debts) e o próximo torneio agendado da liga ativa.
 */
import type { PendingDebtDto } from '@/lib/api/hooks/use-payments';
import { TournamentStatus, type TournamentDto } from '@/lib/api/hooks/use-tournaments';

export interface AppNotification {
  id: string;
  kind: 'debts' | 'upcoming';
  text: string;
  /** Rótulo relativo ("há 2 dias") — null quando não se aplica. */
  when: string | null;
  /** Rota de destino ao tocar. */
  to: string;
}

export function debtsNotification(
  debts: readonly PendingDebtDto[] | undefined,
): AppNotification | null {
  const list = debts ?? [];
  if (list.length === 0) return null;

  const n = list.length;
  const tournaments = [...new Set(list.map((d) => d.tournamentName))];
  const suffix = tournaments.length === 1 ? ` do ${tournaments[0]}` : '';
  const maxDays = Math.max(...list.map((d) => d.daysOpen));

  return {
    id: 'debts',
    kind: 'debts',
    text: `Você tem ${n} pagamento${n === 1 ? '' : 's'} pendente${n === 1 ? '' : 's'}${suffix}`,
    when: maxDays <= 0 ? 'hoje' : maxDays === 1 ? 'há 1 dia' : `há ${maxDays} dias`,
    to: '/app/debitos',
  };
}

export function upcomingNotification(
  tournaments: readonly TournamentDto[] | undefined,
  now: Date,
): AppNotification | null {
  const next = (tournaments ?? [])
    .filter(
      (t) => t.status === TournamentStatus.Scheduled && new Date(t.scheduledDateTime) >= now,
    )
    .sort((a, b) => a.scheduledDateTime.localeCompare(b.scheduledDateTime))[0];
  if (!next) return null;

  const d = new Date(next.scheduledDateTime);
  const day = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const hour = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return {
    id: `upcoming-${next.id}`,
    kind: 'upcoming',
    text: `${next.name} é ${day} às ${hour} — confirme sua presença`,
    when: null,
    to: '/app/torneio',
  };
}

export function buildNotifications(
  debts: readonly PendingDebtDto[] | undefined,
  tournaments: readonly TournamentDto[] | undefined,
  now: Date,
): AppNotification[] {
  return [debtsNotification(debts), upcomingNotification(tournaments, now)].filter(
    (n): n is AppNotification => n !== null,
  );
}
