/**
 * Geração de estrutura de blinds a partir de templates.
 * Espelha phGenBlinds() do TorneioWizard.jsx.
 */

export type BlindRow = {
  level: number;
  sb?: number;
  bb?: number;
  ante?: number;
  min: number;
  type: 'jogo' | 'intervalo';
};

export type BlindTemplate = 'turbo' | 'regular' | 'deep' | 'custom';

export type TemplateConfig = {
  label: string;
  min: number;
  breakEvery: number;
};

export const BLIND_TEMPLATES: Record<Exclude<BlindTemplate, 'custom'>, TemplateConfig> = {
  turbo:   { label: 'Turbo',       min: 10, breakEvery: 5 },
  regular: { label: 'Regular',     min: 15, breakEvery: 4 },
  deep:    { label: 'Deep stack',  min: 20, breakEvery: 4 },
};

const SBS = [25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000];

export function genBlinds(cfg: TemplateConfig): BlindRow[] {
  const rows: BlindRow[] = [];
  let level = 1;
  SBS.forEach((sb, i) => {
    rows.push({
      level: level++,
      sb,
      bb: sb * 2,
      ante: i >= 3 ? Math.round(sb / 4 / 25) * 25 : 0,
      min: cfg.min,
      type: 'jogo',
    });
    if (cfg.breakEvery && (i + 1) % cfg.breakEvery === 0 && i < SBS.length - 1) {
      rows.push({ level: level++, min: 10, type: 'intervalo' });
    }
  });
  return rows;
}

export function getTemplateConfig(
  template: BlindTemplate,
  customMin: number,
  customBreak: number,
): TemplateConfig {
  if (template === 'custom') {
    return { label: 'Personalizado', min: customMin, breakEvery: customBreak };
  }
  return BLIND_TEMPLATES[template];
}
