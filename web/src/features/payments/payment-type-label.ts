import { PaymentType } from '@/lib/api/hooks/use-payments';

/** Rótulo pt-BR único por tipo de pagamento — usado em débitos e pagamentos. */
export function paymentTypeLabel(type: PaymentType): string {
  if (type === PaymentType.Poker) return 'Poker';
  if (type === PaymentType.Jackpot) return 'Caixinha';
  return 'Despesas';
}
