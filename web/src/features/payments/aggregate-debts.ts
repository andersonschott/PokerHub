import { PaymentType } from '@/lib/api/hooks/use-payments';

/** Dados mínimos de um pagamento/débito necessários para agregação. */
export interface AggregatableDebt {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string | null;
  toPlayerName: string;
  toPlayerPixKey: string | null;
  amount: number;
  type: PaymentType;
  status: number;
  isJackpotContribution: boolean;
}

/** Breakdown do total devido por tipo de pagamento. */
export interface DebtBreakdown {
  type: PaymentType;
  amount: number;
}

/** Id sintético usado como "credor" nos grupos de contribuição para a caixinha. */
export const CAIXINHA_ID = 'caixinha';

/** Débito agregado por par devedor → credor. */
export interface AggregatedDebt {
  key: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  toPlayerPixKey: string | null;
  /** Grupo de contribuição para a caixinha (credor virtual, sem jogador destino). */
  isJackpot: boolean;
  totalAmount: number;
  breakdown: DebtBreakdown[];
  /** IDs dos pagamentos componentes para quitação em lote. */
  paymentIds: string[];
  /** IDs dos pagamentos componentes estritamente pendentes (status Pending). */
  pendingPaymentIds: string[];
  /** Todos os pagamentos componentes estão confirmados? */
  allConfirmed: boolean;
  /** Pelo menos um componente está estritamente Pending. */
  hasPending: boolean;
}

function makeKey(fromPlayerId: string, toPlayerId: string): string {
  return `${fromPlayerId}|${toPlayerId}`;
}

/**
 * Agrupa débitos do mesmo devedor → credor somando Poker + Despesas num total único.
 * Contribuições para a caixinha (`isJackpotContribution`) viram grupos próprios com o
 * credor virtual "Caixinha" (CAIXINHA_ID), para que apareçam nas pendências e possam
 * ser cobradas/confirmadas como qualquer outro pagamento.
 */
export function aggregateDebts(debts: readonly AggregatableDebt[]): AggregatedDebt[] {
  const groups = new Map<string, AggregatedDebt>();

  for (const d of debts) {
    const isJackpot = d.isJackpotContribution || !d.toPlayerId;
    const toPlayerId = isJackpot ? CAIXINHA_ID : d.toPlayerId!;

    const key = makeKey(d.fromPlayerId, toPlayerId);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        fromPlayerId: d.fromPlayerId,
        fromPlayerName: d.fromPlayerName,
        toPlayerId,
        toPlayerName: isJackpot ? 'Caixinha' : d.toPlayerName,
        toPlayerPixKey: d.toPlayerPixKey,
        isJackpot,
        totalAmount: 0,
        breakdown: [],
        paymentIds: [],
        pendingPaymentIds: [],
        allConfirmed: true,
        hasPending: false,
      };
      groups.set(key, group);
    }

    group.totalAmount += d.amount;
    group.paymentIds.push(d.id);

    const breakdown = group.breakdown.find((b) => b.type === d.type);
    if (breakdown) {
      breakdown.amount += d.amount;
    } else {
      group.breakdown.push({ type: d.type, amount: d.amount });
    }

    if (d.status !== 2) {
      group.allConfirmed = false;
    }
    if (d.status === 0) {
      group.hasPending = true;
      group.pendingPaymentIds.push(d.id);
    }
  }

  // Ordena grupos por total descendente e breakdown de forma determinística.
  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      breakdown: g.breakdown.sort((a, b) => a.type - b.type),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}
