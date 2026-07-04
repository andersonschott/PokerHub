# Feature B — CRUD de Tabelas de Premiação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o contrato (tipos) das tabelas de premiação no React e entregar a tela de manutenção (CRUD) no Design System, portando fiel a tela do Blazor.

**Architecture:** O backend já tem CRUD e auto-match por `PrizePoolTotal`. O React tinha tipos errados (`tiers[].percentage`) — o contrato real é `LeaguePrizeTableDto { prizePoolTotal, jackpotAmount, entries:[{position, prizeAmount em R$}] }`. Extraímos a lógica de formulário (total/validação) para um módulo puro testável, corrigimos os tipos do hook e construímos a tela CRUD (lista + sheet criar/editar + confirmação de exclusão) substituindo o stub atual.

**Tech Stack:** React 19, TanStack Query, react-router-dom, Vitest; DS components (Sheet, Input, Button, Card, SectionTitle, MoneyValue), sonner (toast).

## Global Constraints

- Contrato real (camelCase) servido por `PokerHub.Api`, espelha `PokerHub.Application.DTOs.PrizeTable`:
  `LeaguePrizeTableDto { id, leagueId, name, prizePoolTotal:number, jackpotAmount:number, entries:[{position:number, prizeAmount:number}], createdAt }`.
- Tabela = **valores FIXOS em R$** por `prizePoolTotal` exato (não percentuais). `jackpotAmount` = caixinha descontada do prêmio.
- `name` é auto-gerado pelo backend quando vazio (`"Pote {total}"`) → a UI envia `name: ''`.
- Endpoints (já existem, NÃO mudar): `GET/POST /api/leagues/{leagueId}/prize-tables`, `GET/PUT/DELETE /api/prize-tables/{prizeTableId}`. Backend valida unicidade por `prizePoolTotal` (erro "Já existe uma tabela de premiação para o prize pool de …").
- Sem `prompt()`/`confirm()`/`alert()` — usar `Sheet` do DS e `toast` (sonner). Toque ≥44px.
- Referência de port (fonte de verdade do comportamento): Blazor `src/PokerHub.Web/Components/Pages/Liga/PrizeTables/Index.razor` e `PrizeTableDialog.razor`.
- Sem backend, sem migration. node_modules já reparado (builds in-place).

---

### Task 1: Módulo puro `prize-table-form.ts` + testes

**Files:**
- Create: `web/src/features/prize-tables/prize-table-form.ts`
- Test: `web/src/features/prize-tables/prize-table-form.test.ts`

**Interfaces:**
- Produces:
  - `interface PrizeEntryDraft { position: number; prizeAmount: number }`
  - `entriesTotal(entries) → number`
  - `grandTotal(entries, jackpotAmount) → number`
  - `difference(prizePoolTotal, entries, jackpotAmount) → number` (arredondado 2 casas)
  - `isBalanced(prizePoolTotal, entries, jackpotAmount) → boolean` (|dif| ≤ 0.01)
  - `isValid(prizePoolTotal, entries) → boolean` (pool>0 e ≥1 prêmio>0)
  - `renumber(entries) → PrizeEntryDraft[]` (posições 1..N)
  - `prizeAt(entries, position) → number | null`

- [ ] **Step 1: Write the failing test**

Criar `web/src/features/prize-tables/prize-table-form.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  entriesTotal, grandTotal, difference, isBalanced, isValid, renumber, prizeAt,
  type PrizeEntryDraft,
} from './prize-table-form';

const e = (position: number, prizeAmount: number): PrizeEntryDraft => ({ position, prizeAmount });

describe('prize-table-form', () => {
  it('entriesTotal soma os prêmios', () => {
    expect(entriesTotal([e(1, 500), e(2, 300), e(3, 200)])).toBe(1000);
    expect(entriesTotal([])).toBe(0);
  });

  it('grandTotal soma prêmios + caixinha', () => {
    expect(grandTotal([e(1, 500), e(2, 300)], 200)).toBe(1000);
  });

  it('difference = pool - (prêmios + caixinha), 2 casas', () => {
    expect(difference(1000, [e(1, 500), e(2, 300)], 200)).toBe(0);
    expect(difference(1000, [e(1, 500)], 0)).toBe(500);
    expect(difference(100.1, [e(1, 50.05)], 0)).toBe(50.05);
  });

  it('isBalanced tolera 0.01', () => {
    expect(isBalanced(1000, [e(1, 1000)], 0)).toBe(true);
    expect(isBalanced(1000, [e(1, 999.995)], 0)).toBe(true);
    expect(isBalanced(1000, [e(1, 900)], 0)).toBe(false);
  });

  it('isValid exige pool>0 e ao menos um prêmio>0', () => {
    expect(isValid(1000, [e(1, 500)])).toBe(true);
    expect(isValid(0, [e(1, 500)])).toBe(false);
    expect(isValid(1000, [e(1, 0), e(2, 0)])).toBe(false);
  });

  it('renumber reatribui posições 1..N', () => {
    expect(renumber([e(1, 500), e(3, 200)])).toEqual([e(1, 500), e(2, 200)]);
  });

  it('prizeAt retorna o prêmio da posição ou null', () => {
    const list = [e(1, 500), e(2, 300)];
    expect(prizeAt(list, 1)).toBe(500);
    expect(prizeAt(list, 3)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/features/prize-tables/prize-table-form.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Write the implementation**

Criar `web/src/features/prize-tables/prize-table-form.ts`:

```ts
export interface PrizeEntryDraft {
  position: number;
  prizeAmount: number;
}

export function entriesTotal(entries: PrizeEntryDraft[]): number {
  return entries.reduce((s, e) => s + (e.prizeAmount || 0), 0);
}

export function grandTotal(entries: PrizeEntryDraft[], jackpotAmount: number): number {
  return entriesTotal(entries) + (jackpotAmount || 0);
}

export function difference(
  prizePoolTotal: number,
  entries: PrizeEntryDraft[],
  jackpotAmount: number,
): number {
  return Number((prizePoolTotal - grandTotal(entries, jackpotAmount)).toFixed(2));
}

export function isBalanced(
  prizePoolTotal: number,
  entries: PrizeEntryDraft[],
  jackpotAmount: number,
): boolean {
  return Math.abs(difference(prizePoolTotal, entries, jackpotAmount)) <= 0.01;
}

export function isValid(prizePoolTotal: number, entries: PrizeEntryDraft[]): boolean {
  return prizePoolTotal > 0 && entries.some((e) => e.prizeAmount > 0);
}

export function renumber(entries: PrizeEntryDraft[]): PrizeEntryDraft[] {
  return entries.map((e, i) => ({ ...e, position: i + 1 }));
}

export function prizeAt(
  entries: { position: number; prizeAmount: number }[],
  position: number,
): number | null {
  const found = entries.find((x) => x.position === position);
  return found ? found.prizeAmount : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/features/prize-tables/prize-table-form.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add web/src/features/prize-tables/prize-table-form.ts web/src/features/prize-tables/prize-table-form.test.ts
git commit -m "feat(web): logica pura de tabela de premiacao (total/validacao/renumber)"
```

---

### Task 2: Corrigir tipos + Sheet criar/editar + tela CRUD + integração no admin (atômico)

**Files:**
- Modify: `web/src/lib/api/hooks/use-prize-tables.ts` (corrigir tipos — endpoints inalterados)
- Create: `web/src/features/prize-tables/prize-table-sheet.tsx`
- Modify (reescrita): `web/src/routes/app/ligas/[id]/tabelas-premiacao.tsx`
- Modify: `web/src/routes/app/perfil/admin.tsx` (seção "Tabela de premiação")

**Interfaces:**
- Consumes: módulo `prize-table-form.ts` (Task 1); hooks `usePrizeTables`/`useCreatePrizeTable`/`useUpdatePrizeTable`/`useDeletePrizeTable`.
- Produces: tipo corrigido `LeaguePrizeTableDto`/`PrizeTableEntryDto`/`CreatePrizeTableDto`/`UpdatePrizeTableDto`; componente `PrizeTableSheet`.

> **Nota:** esta task é atômica porque corrigir os tipos do hook quebra os consumidores antigos (`tabelas-premiacao.tsx` e `admin.tsx`) — todos são atualizados no mesmo passo para manter o build verde.

- [ ] **Step 1: Corrigir os tipos em `use-prize-tables.ts`**

Em `web/src/lib/api/hooks/use-prize-tables.ts`, SUBSTITUIR os blocos de interface (`PrizeTableDto`, `PrizeTierDto`, `CreatePrizeTableDto`, `CreatePrizeTierDto`, `UpdatePrizeTableDto`) por:

```ts
export interface PrizeTableEntryDto {
  position: number;
  prizeAmount: number;
}

export interface LeaguePrizeTableDto {
  id: string;
  leagueId: string;
  name: string;
  prizePoolTotal: number;
  jackpotAmount: number;
  entries: PrizeTableEntryDto[];
  createdAt: string;
}

export interface CreatePrizeTableEntryDto {
  position: number;
  prizeAmount: number;
}

export interface CreatePrizeTableDto {
  name?: string;
  prizePoolTotal: number;
  jackpotAmount: number;
  entries: CreatePrizeTableEntryDto[];
}

export type UpdatePrizeTableDto = CreatePrizeTableDto;
```

Atualizar as assinaturas genéricas dos hooks que usavam `PrizeTableDto` para `LeaguePrizeTableDto`:
- `usePrizeTables`: `api<LeaguePrizeTableDto[]>(\`/leagues/${leagueId}/prize-tables\`)`.
- `useCreatePrizeTable`: `mutationFn: (dto: CreatePrizeTableDto) => api<LeaguePrizeTableDto>(\`/leagues/${leagueId}/prize-tables\`, { method: 'POST', body: dto })`.
- `usePrizeTable`: `api<LeaguePrizeTableDto>(\`/prize-tables/${prizeTableId}\`)`.
- `useUpdatePrizeTable`: `mutationFn: (dto: UpdatePrizeTableDto) => api<LeaguePrizeTableDto>(\`/prize-tables/${prizeTableId}\`, { method: 'PUT', body: dto })`. O `onSuccess` mantém `data.leagueId` (válido).
- `useDeletePrizeTable`: inalterado.
Manter os `prizeTableKeys` como estão.

- [ ] **Step 2: Criar `PrizeTableSheet` (criar/editar)**

Criar `web/src/features/prize-tables/prize-table-sheet.tsx` (port de `PrizeTableDialog.razor`):

```tsx
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
```

- [ ] **Step 3: Reescrever a tela `tabelas-premiacao.tsx`**

Substituir TODO o conteúdo de `web/src/routes/app/ligas/[id]/tabelas-premiacao.tsx` por (port de `Index.razor`):

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trophy, Pencil } from 'lucide-react';
import {
  usePrizeTables, useDeletePrizeTable, type LeaguePrizeTableDto,
} from '@/lib/api/hooks/use-prize-tables';
import { prizeAt } from '@/features/prize-tables/prize-table-form';
import { PrizeTableSheet } from '@/features/prize-tables/prize-table-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { Sheet } from '@/components/ui/sheet';
import { MoneyValue } from '@/components/ui/money-value';
import { toast } from 'sonner';

type SheetState = { mode: 'new' } | { mode: 'edit'; table: LeaguePrizeTableDto } | null;

function PrizeCell({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <MoneyValue value={value} cents={false} color="none" size="13px" />
  );
}

export default function LeaguePrizeTablesRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const id = leagueId ?? '';

  const { data: tables, isLoading, refetch } = usePrizeTables(id);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toDelete, setToDelete] = useState<LeaguePrizeTableDto | null>(null);
  const del = useDeletePrizeTable(toDelete?.id ?? '');

  const handleDelete = () => {
    if (!toDelete) return;
    del.mutate(undefined, {
      onSuccess: () => { toast.success('Tabela excluída'); setToDelete(null); void refetch(); },
      onError: () => { toast.error('Erro ao excluir (pode estar em uso)'); setToDelete(null); },
    });
  };

  return (
    <div className="px-4 pt-[14px] pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button" aria-label="Voltar" onClick={() => navigate(`/app/ligas/${id}`)}
          className="w-10 h-10 rounded-full shrink-0 bg-secondary flex items-center justify-center text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <SectionTitle icon={Trophy}>Tabelas de premiação</SectionTitle>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setSheet({ mode: 'new' })}>Nova</Button>
      </div>

      <p className="text-[12.5px] text-muted-foreground mb-4">
        Valores fixos por prize pool. Quando o prize pool de um torneio coincidir exatamente, a
        tabela é aplicada automaticamente.
      </p>

      {isLoading && <div className="animate-ph-pulse text-sm text-muted-foreground">Carregando…</div>}

      {!isLoading && tables && tables.length === 0 && (
        <div className="text-center text-sm text-muted-foreground mt-8">
          Nenhuma tabela cadastrada.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tables?.slice().sort((a, b) => a.prizePoolTotal - b.prizePoolTotal).map((pt) => (
          <Card key={pt.id} pad="md">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-sans font-bold text-[15px]">
                  <MoneyValue value={pt.prizePoolTotal} cents={false} color="none" size="15px" />
                </div>
                <div className="text-[12px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>1º <PrizeCell value={prizeAt(pt.entries, 1)} /></span>
                  <span>2º <PrizeCell value={prizeAt(pt.entries, 2)} /></span>
                  <span>3º <PrizeCell value={prizeAt(pt.entries, 3)} /></span>
                  <span>4º <PrizeCell value={prizeAt(pt.entries, 4)} /></span>
                  {pt.jackpotAmount > 0 && (
                    <span className="text-gold-400">
                      Caixinha <MoneyValue value={pt.jackpotAmount} cents={false} color="none" size="12px" />
                    </span>
                  )}
                  {pt.entries.length > 4 && (
                    <span className="text-muted-foreground">+{pt.entries.length - 4}</span>
                  )}
                </div>
              </div>
              <button
                type="button" aria-label="Editar" onClick={() => setSheet({ mode: 'edit', table: pt })}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-[18px] h-[18px]" />
              </button>
              <Button size="sm" variant="outline" onClick={() => setToDelete(pt)}>Excluir</Button>
            </div>
          </Card>
        ))}
      </div>

      {sheet && (
        <PrizeTableSheet
          leagueId={id}
          existing={sheet.mode === 'edit' ? sheet.table : null}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); void refetch(); }}
        />
      )}

      {toDelete && (
        <Sheet
          fixed open onClose={() => setToDelete(null)}
          title="Excluir tabela?"
          subtitle="Esta ação não pode ser desfeita."
        >
          <div className="flex flex-col gap-2.5">
            <Button variant="destructive" block disabled={del.isPending} onClick={handleDelete}>
              {del.isPending ? 'Excluindo…' : 'Confirmar exclusão'}
            </Button>
            <Button variant="ghost" block onClick={() => setToDelete(null)}>Cancelar</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ajustar a seção "Tabela de premiação" no admin**

Em `web/src/routes/app/perfil/admin.tsx`, a seção `{/* --- Premiação --- */}` (atualmente lê `tiers`/`percentage` — quebra com o tipo novo). SUBSTITUIR o bloco da `<SectionTitle icon={Trophy}>Tabela de premiação</SectionTitle>` + o `<Card>` que o segue por um resumo correto + link de gerência:

```tsx
      {/* --- Premiação --- */}
      <SectionTitle icon={Trophy}>Tabelas de premiação</SectionTitle>
      <Card pad="none" className="mb-[18px]">
        <button
          type="button"
          onClick={() => navigate(`/app/ligas/${activeLeagueId}/tabelas-premiacao`)}
          className="flex items-center gap-3 w-full min-h-[52px] py-3 px-[14px] bg-transparent border-0 text-foreground text-left cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          <Trophy className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-sans font-medium text-[14.5px]">Gerenciar tabelas</span>
            <span className="block text-[12px] text-muted-foreground mt-0.5">
              {(prizeTables?.length ?? 0) === 0
                ? 'Nenhuma tabela configurada'
                : `${prizeTables!.length} tabela${prizeTables!.length !== 1 ? 's' : ''} por prize pool`}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </Card>
```

Remover os helpers agora não usados em `admin.tsx`: `posLabel`, `posColor`, e as variáveis `tiers`/`hasTiers` (se o `tsc` apontar como não usados). Garantir que `ChevronRight` já está importado (está). `prizeTables` continua vindo de `usePrizeTables(activeLeagueId ?? '')`.

- [ ] **Step 5: Verificar build + testes + checagem manual**

Run: `cd web && npx tsc -b --noEmit && npx vitest run && npm run build`
Expected: tsc sem erros (sem imports/vars não usados), vitest verde (incl. `prize-table-form.test.ts`), build OK.

Checagem manual (`npm run dev`, como organizador):
- `/app/ligas/{id}/tabelas-premiacao`: criar tabela (pool 1000; 1º 500, 2º 300, 3º 200; caixinha 0 → indicador "OK"); aparece na lista ordenada por pool.
- Editar a tabela; excluir com confirmação (Sheet, não `confirm()`).
- Criar tabela com pool duplicado → erro inline do backend ("Já existe uma tabela…").
- Admin (`/app/perfil/admin`): seção "Tabelas de premiação" mostra a contagem e leva à tela CRUD.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/api/hooks/use-prize-tables.ts web/src/features/prize-tables/prize-table-sheet.tsx web/src/routes/app/ligas/[id]/tabelas-premiacao.tsx web/src/routes/app/perfil/admin.tsx
git commit -m "feat(web): CRUD de tabelas de premiacao (contrato corrigido + tela DS portada do Blazor)"
```

---

## Self-Review

**Spec coverage (Feature B do spec 2026-06-22):**
- B.1 corrigir `use-prize-tables.ts` → Task 2 Step 1. ✔
- B.2 tela CRUD no DS (lista + sheet criar/editar + exclusão com confirmação) → Task 2 Steps 2-3 (+ lógica Task 1). ✔
- B.3 integração no admin (resumo correto + link) → Task 2 Step 4. ✔
- B.4 wizard sem mudança funcional → não tocado (correto; só polimento opcional, omitido por YAGNI). ✔
- Fora de escopo (premiação por nº de jogadores, % ) → não incluído. ✔

**Placeholder scan:** sem TBD/TODO; código completo nos steps de código (UI = port verbatim com referência Blazor). ✔

**Type consistency:** `LeaguePrizeTableDto`/`PrizeTableEntryDto`/`CreatePrizeTableDto` idênticos entre hook, sheet e tela; `PrizeEntryDraft` e funções (`grandTotal`/`difference`/`isBalanced`/`isValid`/`renumber`/`prizeAt`) idênticas entre módulo, teste e sheet/tela. `name: ''` enviado em create/update conforme contrato. ✔
