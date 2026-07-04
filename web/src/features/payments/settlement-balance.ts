import { PaymentStatus, type PendingDebtDto, type PaymentDto } from '@/lib/api/hooks/use-payments';

export interface SettlementSummary {
  activeDebts: PendingDebtDto[];
  pendingDebts: PendingDebtDto[];
  pendingConfirmationDebts: PendingDebtDto[];
  activeCredits: PaymentDto[];
  pendingCredits: PaymentDto[];
  pendingConfirmationCredits: PaymentDto[];
  totalDebts: number;
  totalPendingConfirmationDebts: number;
  totalCredits: number;
  totalPendingConfirmationCredits: number;
  netBalance: number;
}

/**
 * Calculates the settlement summary for the current user across all leagues.
 * 
 * Rules for Net Balance (Saldo Líquido):
 * - Only items with PaymentStatus.Pending (0) are counted towards active net balance.
 * - Items with PaymentStatus.Paid (1 - Aguardando Confirmação) have already been transferred/paid,
 *   so they do NOT affect the net balance (they should not appear as a negative or positive debt balance).
 * - Items with PaymentStatus.Confirmed (2) are closed and excluded from active lists.
 * - Jackpot contributions in credits are excluded.
 */
export function calculateSettlementSummary(
  debts: readonly PendingDebtDto[] | undefined,
  credits: readonly PaymentDto[] | undefined
): SettlementSummary {
  const activeDebts = debts?.filter((d) => d.status !== PaymentStatus.Confirmed) ?? [];
  const pendingConfirmationDebts = debts?.filter((d) => d.status === PaymentStatus.Paid) ?? [];
  const activeCredits =
    credits?.filter((c) => c.status !== PaymentStatus.Confirmed && !c.isJackpotContribution) ?? [];

  const pendingDebts = activeDebts.filter((d) => d.status === PaymentStatus.Pending);
  const pendingCredits = activeCredits.filter((c) => c.status === PaymentStatus.Pending);
  const pendingConfirmationCredits = activeCredits.filter((c) => c.status === PaymentStatus.Paid);

  const totalDebts = pendingDebts.reduce((s, d) => s + d.amount, 0);
  const totalPendingConfirmationDebts = pendingConfirmationDebts.reduce((s, d) => s + d.amount, 0);
  const totalCredits = pendingCredits.reduce((s, c) => s + c.amount, 0);
  const totalPendingConfirmationCredits = pendingConfirmationCredits.reduce((s, c) => s + c.amount, 0);

  const netBalance = totalCredits - totalDebts;

  return {
    activeDebts,
    pendingDebts,
    pendingConfirmationDebts,
    activeCredits,
    pendingCredits,
    pendingConfirmationCredits,
    totalDebts,
    totalPendingConfirmationDebts,
    totalCredits,
    totalPendingConfirmationCredits,
    netBalance,
  };
}
