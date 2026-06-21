/**
 * BlindTable — tabela de níveis de blind para o wizard.
 * Port de PhBlindRow (TorneioWizard.jsx) + tabela desktop (DesktopWizard.jsx).
 */
import { cn } from '@/lib/utils';
import type { BlindRow } from './blind-utils';

interface BlindTableProps {
  rows: BlindRow[];
  /** desktop: scrollable table layout; mobile: list of rows */
  variant?: 'list' | 'table';
}

function BlindListRow({ r, num, last }: { r: BlindRow; num: number | null; last: boolean }) {
  const isBreak = r.type === 'intervalo';
  return (
    <div
      className={cn(
        'flex items-center gap-[10px] px-3 py-[9px]',
        !last && 'border-b border-border',
        isBreak && 'bg-[color-mix(in_oklab,var(--warning)_7%,transparent)]',
      )}
    >
      <span className="w-[26px] font-mono font-bold text-[12.5px] text-muted-foreground shrink-0">
        {num ?? ''}
      </span>
      {isBreak ? (
        <span className="flex-1 font-sans font-semibold text-[12.5px] text-warning uppercase tracking-[0.05em]">
          Intervalo
        </span>
      ) : (
        <span className="flex-1 font-mono font-bold text-[14px]">
          {r.sb}/{r.bb}
          {r.ante ? (
            <span className="font-normal text-[11.5px] text-muted-foreground"> · ante {r.ante}</span>
          ) : null}
        </span>
      )}
      <span className="font-mono text-[12px] text-muted-foreground shrink-0 whitespace-nowrap">
        {r.min} min
      </span>
    </div>
  );
}

export function BlindTable({ rows, variant = 'list' }: BlindTableProps) {
  // Numeração de jogo DERIVADA: o intervalo não recebe número (1, 2, 3, 4, intervalo, 5, ...).
  let gameCount = 0;
  const displayNums = rows.map((r) => (r.type === 'intervalo' ? null : ++gameCount));

  if (variant === 'table') {
    return (
      <div className="max-h-[320px] overflow-y-auto border border-border rounded-[var(--radius-md)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Nível', 'Blinds', 'Ante', 'Duração'].map((c, i) => (
                <th
                  key={c}
                  className={cn(
                    'sticky top-0 bg-card px-[14px] py-[10px] border-b border-border',
                    'font-sans text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground',
                    i === 0 ? 'text-left' : 'text-right',
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) =>
              r.type === 'intervalo' ? (
                <tr key={i}>
                  <td
                    colSpan={4}
                    className="px-[14px] py-[7px] text-center text-[11.5px] font-sans font-semibold uppercase tracking-[0.07em] text-warning bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]"
                  >
                    Intervalo · {r.min} min
                  </td>
                </tr>
              ) : (
                <tr key={i} className="border-t border-border">
                  <td className="px-[14px] py-[9px] font-mono font-bold text-[13px]">{displayNums[i]}</td>
                  <td className="px-[14px] py-[9px] text-right font-mono text-[13px] text-gold-400">
                    {r.sb}/{r.bb}
                  </td>
                  <td className="px-[14px] py-[9px] text-right font-mono text-[13px] text-muted-foreground">
                    {r.ante || '—'}
                  </td>
                  <td className="px-[14px] py-[9px] text-right font-mono text-[13px]">{r.min} min</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // list variant (mobile)
  return (
    <div className="border border-border rounded-[var(--radius-lg)] overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-[10px] px-3 py-[10px] border-b border-border bg-card">
        <span className="w-[26px] text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground shrink-0">
          Nv
        </span>
        <span className="flex-1 text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
          Blinds · ante
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
          Duração
        </span>
      </div>
      {rows.map((r, i) => (
        <BlindListRow key={i} r={r} num={displayNums[i]} last={i === rows.length - 1} />
      ))}
    </div>
  );
}
