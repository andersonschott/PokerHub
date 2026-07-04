/**
 * Reverse-maps PUROS para pré-preencher o wizard de torneio no modo edição.
 *
 * São o inverso das transformações que o submit do wizard aplica ao montar o
 * CreateTournamentDto. Mantidos como funções puras (sem React/estado) para serem
 * testáveis em isolamento via vitest.
 *
 * LIMITAÇÃO CONHECIDA (blinds): o detalhe do torneio só guarda os níveis de blind
 * materializados, não o template que os gerou. reverseBlindTemplate() infere o
 * template a partir de (duração do 1º nível de jogo, nº de níveis de jogo antes do
 * 1º intervalo). Blinds que NÃO tenham sido gerados por genBlinds() (ex.: estruturas
 * editadas à mão) revertem ao template mais próximo e são REGENERADAS ao salvar.
 * É aceitável: torneios do grupo são sempre gerados por template.
 */
import { BLIND_TEMPLATES, type BlindTemplate } from './blind-utils';
import { PrizeDistributionType } from '@/lib/api/hooks/use-tournaments';

type PrizeMode = 'pct' | 'fixo';

/** Apenas os campos de um nível de blind que o reverse-map precisa. */
type BlindLevelLike = { durationMinutes: number; isBreak: boolean };

/**
 * Inverso de `new Date(`${date}T${time}:00`).toISOString()` no fuso LOCAL.
 * Usa getters locais do Date para reconstruir a data/hora exibidas nos inputs.
 */
export function parseScheduled(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/**
 * Infere o template de blinds a partir dos níveis materializados.
 *  - min       = durationMinutes do PRIMEIRO nível com isBreak === false.
 *  - breakEvery = nº de níveis de jogo antes do PRIMEIRO isBreak === true.
 *                 Se não houver intervalo, é 'custom' com breakEvery = nº de níveis de jogo.
 * Compara (min, breakEvery) com BLIND_TEMPLATES (turbo 10/5, regular 15/4, deep 20/4);
 * se casar, devolve esse template; senão devolve custom com os valores inferidos.
 */
export function reverseBlindTemplate(blindLevels: BlindLevelLike[]): {
  template: BlindTemplate;
  customMin: number;
  customBreak: number;
} {
  const gameLevels = blindLevels.filter((b) => !b.isBreak);
  const min = gameLevels[0]?.durationMinutes ?? 15;

  const firstBreakIdx = blindLevels.findIndex((b) => b.isBreak);

  // Sem intervalo → custom direto, breakEvery = nº de níveis de jogo.
  if (firstBreakIdx === -1) {
    return { template: 'custom', customMin: min, customBreak: gameLevels.length };
  }

  const breakEvery = blindLevels
    .slice(0, firstBreakIdx)
    .filter((b) => !b.isBreak).length;

  for (const key of ['turbo', 'regular', 'deep'] as const) {
    const cfg = BLIND_TEMPLATES[key];
    if (cfg.min === min && cfg.breakEvery === breakEvery) {
      return { template: key, customMin: min, customBreak: breakEvery };
    }
  }

  return { template: 'custom', customMin: min, customBreak: breakEvery };
}

/**
 * Reconstrói o estado de premiação do wizard.
 *  - usePrizeTable === true → tabela da liga, modo pct, posições padrão [50,30,20].
 *  - senão posições vêm de prizeStructure ("50,30,20"); fallback [50,30,20];
 *    o modo (pct/fixo) vem do PrizeDistributionType.
 */
export function parsePrizeStructure(
  prizeStructure: string | null,
  type: PrizeDistributionType,
  usePrizeTable: boolean,
): { usePrizeTable: boolean; prizeMode: PrizeMode; positions: number[] } {
  if (usePrizeTable) {
    return { usePrizeTable: true, prizeMode: 'pct', positions: [50, 30, 20] };
  }

  const positions = prizeStructure?.split(',').map(Number) ?? [50, 30, 20];

  return {
    usePrizeTable: false,
    prizeMode: type === PrizeDistributionType.Fixed ? 'fixo' : 'pct',
    positions,
  };
}
