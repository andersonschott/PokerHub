/**
 * Decide qual som tocar na transição de nível do timer — espelha o handler
 * `LevelChanged` do Blazor (Public.razor): intervalo → break-start, senão level-change.
 *
 * Regras:
 *  - 1º render (prevLevel null) → não toca.
 *  - loading (level 0 em qualquer ponta) → não toca (clock ainda não sincronizou).
 *  - nível inalterado → não toca.
 *  - nível mudou → `break-start` se o novo nível é intervalo, senão `level-change`.
 */
export type LevelSound = 'level-change' | 'break-start' | null;

export function levelChangeSound(
  prevLevel: number | null,
  nextLevel: number,
  nextIsBreak: boolean,
): LevelSound {
  if (prevLevel === null) return null;
  if (prevLevel === 0 || nextLevel === 0) return null;
  if (prevLevel === nextLevel) return null;
  return nextIsBreak ? 'break-start' : 'level-change';
}
