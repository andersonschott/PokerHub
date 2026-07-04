/**
 * RkSort — toggle de ordenação Lucro · ROI · ITM.
 * Port de RkSort de Ranking.jsx.
 */

export type SortKey = 'profit' | 'roi' | 'part';

const OPTS: { k: SortKey; l: string }[] = [
  { k: 'profit', l: 'Lucro' },
  { k: 'roi',    l: 'ROI' },
  { k: 'part',   l: 'Part.' },
];

interface RkSortProps {
  value: SortKey;
  onChange: (k: SortKey) => void;
}

export function RkSort({ value, onChange }: RkSortProps) {
  return (
    <div
      className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)]"
    >
      {OPTS.map((o) => {
        const active = o.k === value;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            className={[
              'flex-1 h-[34px] border-0 cursor-pointer rounded-[var(--radius-sm)]',
              'font-sans font-semibold text-[13px] transition-colors duration-[var(--dur-fast,120ms)]',
              active
                ? 'bg-[var(--felt-700)] text-foreground shadow-sm'
                : 'bg-transparent text-muted-foreground',
            ].join(' ')}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
