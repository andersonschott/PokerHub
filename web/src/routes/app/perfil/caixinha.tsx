/**
 * Caixinha — saldo acumulado da liga (jackpot).
 * Port fiel de Caixinha.jsx do kit.
 * Dados mock: mockData.caixinha.
 * Funcionalidade: tab Entradas / Saídas, organizer sheets para registrar
 * gasto e uso em torneio — atualiza saldo local via useState.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Trophy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { Input } from '@/components/ui/input';
import { mockData, type MockCaixinhaUsage, type MockCaixinhaUsageType } from '@/mocks/data';

type SheetKind = 'expense' | 'tournament' | null;

export default function CaixinhaRoute() {
  const navigate = useNavigate();
  const C = mockData.caixinha;

  const [tab, setTab] = useState<'entradas' | 'saidas'>('entradas');
  const [usages, setUsages] = useState<MockCaixinhaUsage[]>(() =>
    C.usages.map((u) => ({ ...u })),
  );
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const entriesTotal = C.entries.reduce((s, e) => s + e.amount, 0);
  const usagesTotal = usages.reduce((s, u) => s + u.amount, 0);
  const balance = entriesTotal - usagesTotal;

  const openSheet = (kind: SheetKind) => {
    setSheet(kind);
    setDesc('');
    setVal('');
  };

  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const submitSheet = () => {
    const amount = parseInt(val, 10) || 0;
    if (!amount || !desc.trim()) return;
    const type: MockCaixinhaUsageType = sheet === 'expense' ? 'expense' : 'tournament';
    const newUsage: MockCaixinhaUsage = {
      id: `u${Date.now()}`,
      desc: desc.trim(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      amount,
      type,
      balanceAfter: balance - amount,
    };
    setUsages((prev) => [...prev, newUsage]);
    setSheet(null);
    fire(
      `${type === 'expense' ? 'Gasto registrado' : 'Uso em torneio registrado'}: R$ ${amount},00`,
    );
  };

  const typeBadge = (type: MockCaixinhaUsageType) =>
    type === 'tournament' ? (
      <Badge tone="gold">Torneio especial</Badge>
    ) : (
      <Badge tone="neutral">Gasto da liga</Badge>
    );

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
          <p className="text-[12.5px] text-muted-foreground">{mockData.league.name}</p>
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
          <span className="font-mono font-bold text-gold-400">{C.percent}%</span> de cada prize
          pool
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
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
        <StatTile
          value={C.entries.length}
          label="Torneios"
          center
          valueSize="16px"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)] mb-3.5">
        {([
          { k: 'entradas', l: `Entradas · ${C.entries.length}` },
          { k: 'saidas', l: `Saídas · ${usages.length}` },
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
          {C.entries.map((e, i) => (
            <Card key={i} pad="md">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[14.5px] truncate">
                    {e.tournament}
                  </div>
                  <div className="font-mono text-[11.5px] text-muted-foreground mt-0.5">
                    {e.date} · pool <MoneyValue value={e.prizePool} cents={false} size="11.5px" color="none" /> · {e.pct}%
                  </div>
                </div>
                <MoneyValue value={e.amount} signed cents={false} size="15px" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Saídas list */}
      {tab === 'saidas' && (
        <div className="flex flex-col gap-2">
          {usages.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground px-0.5">
              Nenhuma saída ainda — quando a caixinha for usada, aparece aqui.
            </p>
          ) : (
            usages.map((u) => (
              <Card key={u.id} pad="md">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[14.5px] truncate">{u.desc}</div>
                    <div className="font-mono text-[11.5px] text-muted-foreground mt-0.5">
                      {u.date} · saldo após <MoneyValue value={u.balanceAfter} cents={false} size="11.5px" color="none" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <MoneyValue value={-u.amount} cents={false} size="15px" />
                    {typeBadge(u.type)}
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* Organizer action buttons */}
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
        </div>
      )}

      {/* Info footer */}
      <p className="text-[12px] text-muted-foreground leading-relaxed mt-4 px-0.5">
        A caixinha guarda {C.percent}% de cada prize pool. O organizador usa para torneios
        especiais ou despesas da liga — baralhos, fichas, lanches.
      </p>

      {/* Expense / tournament sheet */}
      {sheet && (
        <Sheet
          fixed
          open
          onClose={() => setSheet(null)}
          title={sheet === 'expense' ? 'Registrar gasto da liga' : 'Usar em torneio especial'}
          subtitle={`Saldo disponível: R$ ${balance.toLocaleString('pt-BR')},00`}
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
                inputMode="numeric"
                placeholder="0"
                value={val}
                onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <Button
              variant="primary"
              icon={Check}
              block
              disabled={
                !desc.trim() || !val || (parseInt(val, 10) || 0) > balance
              }
              onClick={submitSheet}
            >
              Confirmar
            </Button>
          </div>
        </Sheet>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute left-4 right-4 bottom-20 z-[70] bg-[var(--felt-700)] border border-border rounded-[var(--radius-md)] px-[14px] py-3 flex items-center gap-2.5 shadow-lg">
          <Check className="w-[18px] h-[18px] text-positive shrink-0" />
          <span className="text-[14px] font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}
