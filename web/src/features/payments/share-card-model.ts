import type { AggregatedDebt } from './aggregate-debts';

/** Linha renderizada no card de compartilhamento: devedor → credor. */
export interface ShareCardLine {
  from: string;
  to: string;
  amount: number;
}

/** Modelo de dados puro que alimenta o <ShareCard /> off-screen. */
export interface ShareCardModel {
  title: string;
  subtitle: string;
  lines: ShareCardLine[];
  total: number;
  empty: boolean;
}

function formatTournamentDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Monta o modelo do card de compartilhamento a partir das pendências agregadas.
 * Inclui apenas grupos que ainda possuem ao menos um pagamento estritamente pendente.
 */
export function buildShareCardModel(
  tournamentName: string,
  scheduledDateTime: string | Date | null | undefined,
  aggregatedDebts: readonly AggregatedDebt[],
): ShareCardModel {
  const pending = aggregatedDebts.filter((g) => g.hasPending);
  const lines = pending.map((g) => ({
    from: g.fromPlayerName,
    to: g.toPlayerName,
    amount: g.totalAmount,
  }));

  const total = pending.reduce((sum, g) => sum + g.totalAmount, 0);

  return {
    title: tournamentName,
    subtitle: formatTournamentDate(scheduledDateTime),
    lines,
    total,
    empty: lines.length === 0,
  };
}
