/**
 * Calcula o saldo da caixinha (jackpot) de uma liga.
 * Saldo = soma das contribuições - soma dos usos.
 * Null-safe: listas undefined ou null são tratadas como vazias.
 */
export function jackpotBalance(
  contributions?: { amount: number }[] | null,
  usages?: { amount: number }[] | null,
): number {
  const entriesTotal = (contributions ?? []).reduce((sum, item) => sum + item.amount, 0);
  const usagesTotal = (usages ?? []).reduce((sum, item) => sum + item.amount, 0);
  return entriesTotal - usagesTotal;
}
