export interface PrizeEntryDraft {
  position: number;
  prizeAmount: number;
}

export function entriesTotal(entries: PrizeEntryDraft[]): number {
  return entries.reduce((s, e) => s + (e.prizeAmount || 0), 0);
}

export function grandTotal(entries: PrizeEntryDraft[], jackpotAmount: number): number {
  return entriesTotal(entries) + (jackpotAmount || 0);
}

export function difference(
  prizePoolTotal: number,
  entries: PrizeEntryDraft[],
  jackpotAmount: number,
): number {
  return Number((prizePoolTotal - grandTotal(entries, jackpotAmount)).toFixed(2));
}

export function isBalanced(
  prizePoolTotal: number,
  entries: PrizeEntryDraft[],
  jackpotAmount: number,
): boolean {
  return Math.abs(difference(prizePoolTotal, entries, jackpotAmount)) <= 0.01;
}

export function isValid(prizePoolTotal: number, entries: PrizeEntryDraft[]): boolean {
  return prizePoolTotal > 0 && entries.some((e) => e.prizeAmount > 0);
}

export function renumber(entries: PrizeEntryDraft[]): PrizeEntryDraft[] {
  return entries.map((e, i) => ({ ...e, position: i + 1 }));
}

export function prizeAt(
  entries: { position: number; prizeAmount: number }[],
  position: number,
): number | null {
  const found = entries.find((x) => x.position === position);
  return found ? found.prizeAmount : null;
}
