import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyValue } from '@/components/ui/money-value';
import {
  ExpenseSplitType,
  type CreateExpenseDto,
  type ExpensePlayerDto,
  type TournamentExpenseDto,
} from '@/lib/api/hooks/use-expenses';

interface ExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  expense?: TournamentExpenseDto | null;
  leaguePlayers: ExpensePlayerDto[];
  eligiblePlayers: ExpensePlayerDto[];
  onSubmit: (dto: CreateExpenseDto) => Promise<void>;
  onDelete?: () => Promise<void>;
  isPending?: boolean;
}

function formatCurrencyInput(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyInput(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? 0 : n;
}

export function ExpenseSheet({
  open,
  onClose,
  expense,
  leaguePlayers,
  eligiblePlayers,
  onSubmit,
  onDelete,
  isPending,
}: ExpenseSheetProps) {
  const isEdit = !!expense;

  const [description, setDescription] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [paidByPlayerId, setPaidByPlayerId] = useState('');
  const [splitType, setSplitType] = useState<ExpenseSplitType>(ExpenseSplitType.Equal);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  const totalAmount = parseCurrencyInput(amountRaw);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setDescription(expense.description);
      setAmountRaw(formatCurrencyInput(expense.totalAmount));
      setPaidByPlayerId(expense.paidByPlayerId);
      setSplitType(expense.splitType);
      if (expense.splitType === ExpenseSplitType.Equal) {
        setSelectedPlayerIds(new Set(expense.shares.map((s) => s.playerId)));
        setCustomShares({});
      } else {
        const shares: Record<string, string> = {};
        for (const s of expense.shares) {
          shares[s.playerId] = formatCurrencyInput(s.amount);
        }
        setCustomShares(shares);
        setSelectedPlayerIds(new Set(Object.keys(shares)));
      }
    } else {
      setDescription('');
      setAmountRaw('');
      setPaidByPlayerId('');
      setSplitType(ExpenseSplitType.Equal);
      setSelectedPlayerIds(new Set(eligiblePlayers.map((p) => p.id)));
      setCustomShares({});
    }
  }, [open, expense, eligiblePlayers]);

  const equalShare = useMemo(() => {
    if (splitType !== ExpenseSplitType.Equal || selectedPlayerIds.size === 0 || totalAmount <= 0) return 0;
    return totalAmount / selectedPlayerIds.size;
  }, [splitType, selectedPlayerIds, totalAmount]);

  const customTotal = useMemo(() => {
    return Object.entries(customShares)
      .filter(([id]) => selectedPlayerIds.has(id))
      .reduce((sum, [, raw]) => sum + parseCurrencyInput(raw), 0);
  }, [customShares, selectedPlayerIds]);

  const togglePlayer = (playerId: string, include: boolean) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (include) next.add(playerId);
      else next.delete(playerId);
      return next;
    });
  };

  const toggleCustomShare = (playerId: string, include: boolean) => {
    togglePlayer(playerId, include);
    setCustomShares((prev) => {
      const next = { ...prev };
      if (include) next[playerId] = next[playerId] ?? '0,00';
      else delete next[playerId];
      return next;
    });
  };

  const selectAll = () => setSelectedPlayerIds(new Set(eligiblePlayers.map((p) => p.id)));
  const selectNone = () => setSelectedPlayerIds(new Set());

  const isValid = useMemo(() => {
    if (!description.trim() || totalAmount <= 0 || !paidByPlayerId) return false;
    if (selectedPlayerIds.size === 0) return false;
    if (splitType === ExpenseSplitType.Custom) {
      return Math.abs(customTotal - totalAmount) < 0.01;
    }
    return true;
  }, [description, totalAmount, paidByPlayerId, selectedPlayerIds, splitType, customTotal]);

  const handleSubmit = async () => {
    if (!isValid) return;

    let shares: { playerId: string; amount: number }[];
    if (splitType === ExpenseSplitType.Equal) {
      shares = Array.from(selectedPlayerIds).map((id) => ({ playerId: id, amount: 0 }));
    } else {
      shares = Array.from(selectedPlayerIds).map((id) => ({
        playerId: id,
        amount: parseCurrencyInput(customShares[id] ?? '0'),
      }));
    }

    const dto: CreateExpenseDto = {
      paidByPlayerId,
      description: description.trim(),
      totalAmount,
      splitType,
      shares,
    };

    try {
      await onSubmit(dto);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar despesa.');
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir despesa.');
    }
  };

  const splitDiff = totalAmount - customTotal;

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Editar Despesa' : 'Adicionar Despesa'} fixed>
      <div className="flex flex-col gap-4 pb-2">
        <div>
          <Label htmlFor="expense-description">Descrição</Label>
          <Input
            id="expense-description"
            placeholder="Ex: Pizza, Bebidas, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="expense-amount">Valor Total (R$)</Label>
          <Input
            id="expense-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            mono
          />
        </div>

        <div>
          <Label htmlFor="expense-paid-by">Quem pagou</Label>
          <select
            id="expense-paid-by"
            value={paidByPlayerId}
            onChange={(e) => setPaidByPlayerId(e.target.value)}
            className="w-full h-[46px] px-[14px] rounded-[var(--radius-md)] border border-[var(--input)] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] text-foreground font-sans text-[15px] outline-none"
          >
            <option value="">Selecione...</option>
            {leaguePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="expense-split-type">Tipo de Divisão</Label>
          <select
            id="expense-split-type"
            value={splitType}
            onChange={(e) => setSplitType(Number(e.target.value) as ExpenseSplitType)}
            className="w-full h-[46px] px-[14px] rounded-[var(--radius-md)] border border-[var(--input)] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] text-foreground font-sans text-[15px] outline-none"
          >
            <option value={ExpenseSplitType.Equal}>Dividir Igualmente</option>
            <option value={ExpenseSplitType.Custom}>Valores Personalizados</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Dividir entre</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[12px] font-semibold text-gold-400 hover:text-gold-300"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="text-[12px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Nenhum
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
            {eligiblePlayers.length === 0 && (
              <div className="text-[12.5px] text-muted-foreground py-2">
                Nenhum jogador elegível para rateio.
              </div>
            )}
            {eligiblePlayers.map((p) => {
              const checked = selectedPlayerIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-card"
                >
                  <input
                    id={`share-${p.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      splitType === ExpenseSplitType.Equal
                        ? togglePlayer(p.id, e.target.checked)
                        : toggleCustomShare(p.id, e.target.checked)
                    }
                    className="size-[18px] accent-gold-400 shrink-0"
                  />
                  <label htmlFor={`share-${p.id}`} className="flex-1 text-[14px] font-medium cursor-pointer">
                    {p.name}
                  </label>
                  {splitType === ExpenseSplitType.Equal && checked && equalShare > 0 && (
                    <MoneyValue value={equalShare} cents={false} color="none" size="13px" />
                  )}
                  {splitType === ExpenseSplitType.Custom && checked && (
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={customShares[p.id] ?? '0,00'}
                      onChange={(e) =>
                        setCustomShares((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      className="w-[110px] h-9 text-right text-[13px]"
                      mono
                    />
                  )}
                </div>
              );
            })}
          </div>

          {splitType === ExpenseSplitType.Equal && selectedPlayerIds.size > 0 && equalShare > 0 && (
            <div className="mt-2 text-[12.5px] text-muted-foreground">
              <MoneyValue value={equalShare} cents={false} color="none" size="12.5px" /> por pessoa
            </div>
          )}

          {splitType === ExpenseSplitType.Custom && selectedPlayerIds.size > 0 && (
            <div
              className={[
                'mt-2 text-[12.5px]',
                Math.abs(splitDiff) < 0.01 ? 'text-positive' : 'text-warning',
              ].join(' ')}
            >
              Total: <MoneyValue value={customTotal} cents={false} color="none" size="12.5px" /> /{' '}
              <MoneyValue value={totalAmount} cents={false} color="none" size="12.5px" />
              {Math.abs(splitDiff) >= 0.01 && (
                <span> (Diferença: <MoneyValue value={splitDiff} cents={false} color="none" size="12.5px" />)</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            variant="primary"
            block
            disabled={!isValid || isPending}
            onClick={handleSubmit}
          >
            {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
          </Button>
          {isEdit && onDelete && (
            <Button variant="destructive" block disabled={isPending} onClick={handleDelete}>
              Excluir
            </Button>
          )}
          <Button variant="ghost" block disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
