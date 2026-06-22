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

/** Débito agregado por par devedor → credor. */
export interface AggregatedDebt {
  key: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  toPlayerPixKey: string | null;
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
 * Ignora contribuições para caixinha (`isJackpotContribution`), pois têm tratamento próprio.
 */
export function aggregateDebts(debts: readonly AggregatableDebt[]): AggregatedDebt[] {
  const groups = new Map<string, AggregatedDebt>();

  for (const d of debts) {
    if (d.isJackpotContribution) continue;
    if (!d.toPlayerId) continue;

    const key = makeKey(d.fromPlayerId, d.toPlayerId);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        fromPlayerId: d.fromPlayerId,
        fromPlayerName: d.fromPlayerName,
        toPlayerId: d.toPlayerId,
        toPlayerName: d.toPlayerName,
        toPlayerPixKey: d.toPlayerPixKey,
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
