/**
 * Caixinha — saldo acumulado da liga (jackpot).
 * Refatorado na Fase 5 para consumir a API Real.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Trophy, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/lib/auth-context';
import { useActiveLeague } from '@/features/leagues/league-context';
import { useLeague } from '@/lib/api/hooks/use-leagues';
import { isLeagueOrganizer } from '@/features/tournaments/permissions';
import {
  useJackpotStatus,
  useJackpotContributions,
  useJackpotUsages,
  useUseJackpot,
} from '@/lib/api/hooks/use-jackpot';
import { jackpotBalance } from '@/features/jackpot/jackpot-balance';

type SheetKind = 'expense' | 'tournament' | null;

export default function CaixinhaRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeLeagueId } = useActiveLeague();

  const [tab, setTab] = useState<'entradas' | 'saidas'>('entradas');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');

  // Queries
  const { data: league, isLoading: isLoadingL } = useLeague(activeLeagueId ?? '');

  const organizer = isLeagueOrganizer(league, user);
  const { data: status, isLoading: isLoadingS } = useJackpotStatus(activeLeagueId);
  const { data: contributions, isLoading: isLoadingC } = useJackpotContributions(activeLeagueId);
  const { data: usages, isLoading: isLoadingU } = useJackpotUsages(activeLeagueId);

  // Mutations
  const useJackpotMut = useUseJackpot(activeLeagueId);

  const openSheet = (kind: SheetKind) => {
    setSheet(kind);
    setDesc('');
    setVal('');
  };

  const submitSheet = () => {
    const amount = parseFloat(val.replace(',', '.')) || 0;
    if (!amount || !desc.trim()) return;

    useJackpotMut.mutate(
      { amount, description: desc.trim() },
      {
        onSuccess: () => {
          setSheet(null);
        },
      }
    );
  };

  if (!activeLeagueId) {
    return (
      <div className="p-4 text-center mt-10">
        <p className="text-muted-foreground">Nenhuma liga selecionada.</p>
        <Button className="mt-4" onClick={() => navigate('/app/ligas')}>Voltar</Button>
      </div>
    );
  }

  if (isLoadingL || isLoadingS || isLoadingC || isLoadingU) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const entriesTotal = contributions?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const usagesTotal = usages?.reduce((s, u) => s + u.amount, 0) ?? 0;
  const balance = jackpotBalance(contributions, usages);

  const safeEntries = contributions ?? [];
  const safeUsages = usages ?? [];

  return (
    <div className="pb-24 px-4 pt-3 relative min-h-full">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center size-9 rounded-[var(--radius-md)] text-muted-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-sans font-bold text-[19px] tracking-[-0.01em] leading-tight">
            Caixinha
          </h1>
          <p className="text-[12.5px] text-muted-foreground">{league?.name}</p>
        </div>
      </div>

      {/* Saldo hero */}
      <Card variant="gold" pad="lg" className="mb-3">
        <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-1">
          Saldo acumulado
        </div>
        <MoneyValue value={balance} cents={false} color="none" size="40px" />
        <div className="text-[12.5px] text-muted-foreground mt-1">
          Acumula{' '}
          <span className="font-mono font-bold text-gold-400">{status?.jackpotPercentage ?? 0}%</span> de cada prize
          pool
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <StatTile
          value={<MoneyValue value={entriesTotal} signed cents={false} size="16px" />}
          label="Entradas"
          center
          tone="positive"
          valueSize="16px"
        />
        <StatTile
          value={<MoneyValue value={-usagesTotal} cents={false} size="16px" />}
          label="Saídas"
          center
          tone="negative"
          valueSize="16px"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)] mb-3.5">
        {([
          { k: 'entradas', l: `Entradas · ${safeEntries.length}` },
          { k: 'saidas', l: `Saídas · ${safeUsages.length}` },
        ] as const).map((x) => {
          const active = x.k === tab;
          return (
            <button
              key={x.k}
              type="button"
              onClick={() => setTab(x.k)}
              className={
                'flex-1 h-9 rounded-[var(--radius-sm)] font-sans font-semibold text-[13px] transition-colors ' +
                (active
                  ? 'bg-[var(--felt-700)] text-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground')
              }
            >
              {x.l}
            </button>
          );
        })}
      </div>

      {/* Entradas list */}
      {tab === 'entradas' && (
        <div className="flex flex-col gap-2">
          {safeEntries.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground px-0.5 text-center py-4">
              Ainda não há contribuições.
            </p>
          ) : (
            safeEntries.map((e) => (
              <Card key={e.id} pad="md">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[14.5px] truncate">
                      {e.tournamentName}
                    </div>
                    <div className="font-mono text-[11.5px] text-muted-foreground mt-0.5">
                      {new Date(e.tournamentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · pool <MoneyValue value={e.tournamentPrizePool} cents={false} size="11.5px" color="none" /> · {e.percentageApplied}%
                    </div>
                  </div>
                  <MoneyValue value={e.amount} signed cents={false} size="15px" />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Saídas list */}
      {tab === 'saidas' && (
        <div className="flex flex-col gap-2">
          {safeUsages.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground px-0.5">
              Nenhuma saída ainda — quando a caixinha for usada, aparece aqui.
            </p>
          ) : (
            safeUsages.map((u) => (
              <Card key={u.id} pad="md">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[14.5px] truncate">{u.description}</div>
                    <div className="font-mono text-[11.5px] text-muted-foreground mt-0.5">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · saldo após <MoneyValue value={u.balanceAfter} cents={false} size="11.5px" color="none" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <MoneyValue value={-u.amount} cents={false} size="15px" />
                    <Badge tone="neutral">Uso / Gasto</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* Organizer-only usage buttons */}
          {organizer && (
            <div className="flex gap-2 mt-1.5">
              <Button
                variant="primary"
                icon={ShoppingCart}
                block
                onClick={() => openSheet('expense')}
              >
                Registrar gasto
              </Button>
              <Button
                variant="secondary"
                icon={Trophy}
                block
                onClick={() => openSheet('tournament')}
              >
                Usar em torneio
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      <p className="text-[12px] text-muted-foreground leading-relaxed mt-4 px-0.5">
        A caixinha guarda {status?.jackpotPercentage ?? 0}% de cada prize pool. O organizador usa para torneios
        especiais ou despesas da liga — baralhos, fichas, lanches.
      </p>

      {/* Expense / tournament sheet */}
      {sheet && (
        <Sheet
          fixed
          open
          onClose={() => setSheet(null)}
          title={sheet === 'expense' ? 'Registrar gasto da liga' : 'Usar em torneio especial'}
          subtitle={<>Saldo disponível: <MoneyValue value={balance} cents={false} color="none" /></>}
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Descrição
              </label>
              <Input
                placeholder={
                  sheet === 'expense' ? 'Ex.: Baralhos novos' : 'Ex.: Torneio de Natal'
                }
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Valor
              </label>
              <Input
                mono
                prefix="R$"
                inputMode="decimal"
                placeholder="0"
                value={val}
                onChange={(e) => setVal(e.target.value.replace(/[^0-9,.]/g, ''))}
              />
            </div>
            <Button
              variant="primary"
              icon={Check}
              block
              disabled={
                !desc.trim() || !val || (parseFloat(val.replace(',', '.')) || 0) > balance
              }
              onClick={submitSheet}
            >
              Confirmar
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
