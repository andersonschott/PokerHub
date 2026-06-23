import type { PlayerBalanceDto } from '@/lib/api/hooks/use-payments';

export interface BalanceShareLine {
  name: string;
  investment: number;
  prize: number;
  balance: number;
}

export interface BalanceShareCardModel {
  title: string;
  subtitle: string;
  lines: BalanceShareLine[];
  caixinha: number;
  prizePool: number;
  empty: boolean;
}

function formatTournamentDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Monta o modelo do card de saldo (ordena por saldo desc). */
export function buildBalanceShareCardModel(
  tournamentName: string,
  scheduledDateTime: string | Date | null | undefined,
  balances: readonly PlayerBalanceDto[],
  caixinha: number,
  prizePool: number,
): BalanceShareCardModel {
  const lines = [...balances]
    .sort((a, b) => b.balance - a.balance)
    .map((b) => ({ name: b.playerName, investment: b.totalInvestment, prize: b.prize, balance: b.balance }));
  return { title: tournamentName, subtitle: formatTournamentDate(scheduledDateTime), lines, caixinha, prizePool, empty: lines.length === 0 };
}
