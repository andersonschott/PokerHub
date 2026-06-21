/**
 * CustomBlindEditor — editor de estrutura de blinds nível a nível (paridade com o Blazor).
 * Edita uma lista explícita de BlindRow: por nível ajusta SB/BB/ante/duração;
 * adiciona/remove níveis e intervalos. A numeração de jogo é derivada (intervalo não conta).
 */
import { Plus, Trash2, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlindRow } from './blind-utils';

interface CustomBlindEditorProps {
  levels: BlindRow[];
  onChange: (levels: BlindRow[]) => void;
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.05em] text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="w-full h-9 rounded-[var(--radius-sm)] border border-border bg-secondary px-2 font-mono text-[13px] text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
      />
    </label>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remover"
      className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] border border-border bg-transparent text-muted-foreground hover:text-negative cursor-pointer"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

export function CustomBlindEditor({ levels, onChange }: CustomBlindEditorProps) {
  const update = (i: number, patch: Partial<BlindRow>) =>
    onChange(levels.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(levels.filter((_, idx) => idx !== i));

  const addLevel = () => {
    const lastGame = [...levels].reverse().find((r) => r.type === 'jogo');
    const sb = lastGame?.sb ? lastGame.sb * 2 : 25;
    onChange([
      ...levels,
      { level: levels.length + 1, sb, bb: sb * 2, ante: lastGame?.ante ?? 0, min: lastGame?.min ?? 15, type: 'jogo' },
    ]);
  };
  const addBreak = () =>
    onChange([...levels, { level: levels.length + 1, min: 10, type: 'intervalo' }]);

  let gameCount = 0;

  return (
    <div className="flex flex-col gap-2">
      {levels.map((r, i) => {
        const num = r.type === 'intervalo' ? null : ++gameCount;
        return r.type === 'intervalo' ? (
          <div
            key={i}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2"
            style={{ background: 'color-mix(in oklab, var(--warning) 7%, transparent)' }}
          >
            <Coffee className="w-4 h-4 text-warning shrink-0" />
            <span className="flex-1 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-warning">
              Intervalo
            </span>
            <div className="w-[72px]">
              <NumField label="min" value={r.min} onChange={(v) => update(i, { min: v })} />
            </div>
            <RemoveBtn onClick={() => remove(i)} />
          </div>
        ) : (
          <div key={i} className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-bold text-[13px] text-muted-foreground shrink-0">{num}</span>
              <span className="flex-1 text-[12px] text-muted-foreground">Nível {num}</span>
              <RemoveBtn onClick={() => remove(i)} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <NumField label="SB" value={r.sb ?? 0} onChange={(v) => update(i, { sb: v })} />
              <NumField label="BB" value={r.bb ?? 0} onChange={(v) => update(i, { bb: v })} />
              <NumField label="Ante" value={r.ante ?? 0} onChange={(v) => update(i, { ante: v })} />
              <NumField label="min" value={r.min} onChange={(v) => update(i, { min: v })} />
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" icon={Plus} onClick={addLevel}>
          Nível
        </Button>
        <Button variant="outline" size="sm" icon={Coffee} onClick={addBreak}>
          Intervalo
        </Button>
      </div>
    </div>
  );
}
