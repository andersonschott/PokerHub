import type { BlindInfo } from './use-mock-clock';

/**
 * Rótulo do "próximo nível" para o timer.
 * - Próximo é intervalo → "Intervalo" (em vez de "0/0").
 * - Caso normal → "sb/bb".
 */
export function nextLevelLabel(nextBlinds: BlindInfo, nextIsBreak: boolean): string {
  if (nextIsBreak) return 'Intervalo';
  return `${nextBlinds.sb}/${nextBlinds.bb}`;
}
