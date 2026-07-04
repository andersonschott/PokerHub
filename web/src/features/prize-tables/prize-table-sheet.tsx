import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyValue } from '@/components/ui/money-value';
import { toast } from 'sonner';
import {
  type PrizeEntryDraft, grandTotal, difference, isBalanced, isValid, renumber,
} from './prize-table-form';
import {
  useCreatePrizeTable, useUpdatePrizeTable, type LeaguePrizeTableDto,
} from '@/lib/api/hooks/use-prize-tables';

const LABEL =
  'block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground';

/** Parse de moeda BR para number (aceita "1.234,50" / "500" / "500.5"). */
function num(v: string): number {
  const cleaned = v.replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  leagueId: string;
  existing?: LeaguePrizeTableDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PrizeTableSheet({ leagueId, existing, onClose, onSaved }: Props) {
  const isEdit = !!existing;
  const [pool, setPool] = useState(existing?.prizePoolTotal ?? 0);
  const [jackpot, setJackpot] = useState(existing?.jackpotAmount ?? 0);
  const [entries, setEntries] = useState<PrizeEntryDraft[]>(
    existing?.entries.map((e) => ({ position: e.position, prizeAmount: e.prizeAmount })) ?? [
      { position: 1, prizeAmount: 0 },
      { position: 2, prizeAmount: 0 },
      { position: 3, prizeAmount: 0 },
    ],
  );
  const [error, setError] = useState<string | null>(null);

  const create = useCreatePrizeTable(leagueId);
  const update = useUpdatePrizeTable(existing?.id ?? '');
  const saving = create.isPending || update.isPending;

  const diff = difference(pool, entries, jackpot);
  const balanced = isBalanced(pool, entries, jackpot);

  const setAmount = (i: number, v: string) =>
    setEntries((arr) => arr.map((e, j) => (j === i ? { ...e, prizeAmount: num(v) } : e)));
  const addEntry = () =>
    setEntries((arr) => [...arr, { position: arr.length + 1, prizeAmount: 0 }]);
  const removeEntry = (i: number) =>
    setEntries((arr) => renumber(arr.filter((_, j) => j !== i)));

  const submit = () => {
    setError(null);
    if (!isValid(pool, entries)) {
      setError('Defina um prize pool maior que zero e ao menos um prêmio.');
      return;
    }
    const dto = {
      name: '',
      prizePoolTotal: pool,
      jackpotAmount: jackpot,
      entries: entries
        .filter((e) => e.prizeAmount > 0)
        .map((e) => ({ position: e.position, prizeAmount: e.prizeAmount })),
    };
    const onError = (e: unknown) =>
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a tabela.');
    if (isEdit) {
      update.mutate(dto, {
        onSuccess: () => { toast.success('Tabela atualizada'); onSaved(); },
        onError,
      });
    } else {
      create.mutate(dto, {
        onSuccess: () => { toast.success('Tabela criada'); onSaved(); },
        onError,
      });
    }
  };

  return (
    <Sheet
      fixed
      open
      onClose={onClose}
      title={isEdit ? 'Editar tabela' : 'Nova tabela'}
      subtitle="Valores fixos aplicados quando o prize pool coincidir exatamente"
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Prize pool total</label>
          <Input
            mono prefix="R$" inputMode="decimal" autoFocus
            value={pool ? String(pool) : ''}
            onChange={(e) => setPool(num(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL}>Distribuição de prêmios</label>
          {entries.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-[52px] shrink-0 font-mono font-bold text-[14px] text-muted-foreground">
                {e.position}º
              </span>
              <div className="flex-1">
                <Input
                  mono prefix="R$" inputMode="decimal" className="h-10"
                  value={e.prizeAmount ? String(e.prizeAmount) : ''}
                  onChange={(ev) => setAmount(i, ev.target.value)}
                />
              </div>
              {entries.length > 1 && (
                <button
                  type="button" aria-label={`Remover ${e.position}º`} onClick={() => removeEntry(i)}
                  className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] text-muted-foreground hover:text-negative transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <Button variant="secondary" size="sm" icon={Plus} onClick={addEntry}>
            Adicionar posição
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Caixinha (reservado do prize pool)</label>
          <Input
            mono prefix="R$" inputMode="decimal"
            value={jackpot ? String(jackpot) : ''}
            onChange={(e) => setJackpot(num(e.target.value))}
          />
        </div>

        <div className="flex items-center justify-between text-[13px] px-0.5">
          <span className="text-muted-foreground">
            Total:{' '}
            <MoneyValue value={grandTotal(entries, jackpot)} cents={false} color="none" size="13px" />
          </span>
          {balanced ? (
            <span className="font-mono font-bold text-positive">OK</span>
          ) : (
            <span className="font-mono text-warning">
              Dif: <MoneyValue value={diff} cents={false} color="none" size="13px" />
            </span>
          )}
        </div>

        {error && <p className="text-[12px] text-negative">{error}</p>}

        <Button variant="primary" icon={Check} block disabled={saving} onClick={submit}>
          {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </Sheet>
  );
}
