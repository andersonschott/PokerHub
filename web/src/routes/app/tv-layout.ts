/**
 * Seleção de layout da tela /tv conforme o dispositivo.
 *
 * - `wide`              : ≥900px — grid 3 colunas (TV/monitor). Layout herói original.
 * - `landscape-compact`: ≤900px deitado — mini-TV ("phone propped on the table").
 * - `portrait`         : ≤900px em pé — layout empilhado dedicado (hero + essenciais + prêmios),
 *                        garante que o timer caiba na largura (corrige o overflow do retrato).
 */
export type TvLayout = 'wide' | 'landscape-compact' | 'portrait';

/**
 * @param narrow  resultado de `(max-width: 900px)`
 * @param portrait resultado de `(orientation: portrait)`
 */
export function selectTvLayout(narrow: boolean, portrait: boolean): TvLayout {
  if (!narrow) return 'wide';
  return portrait ? 'portrait' : 'landscape-compact';
}
