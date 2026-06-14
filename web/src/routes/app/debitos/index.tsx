/**
 * /app/debitos — Acerto de contas (Settlement).
 * Port de Settlement.jsx. README item 5.
 *
 * Saldo líquido hero, tabs A pagar / A receber, chave PIX com 1 toque,
 * state machine local: pendente → aguardando → confirmado.
 * Link para Pagamentos do torneio.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, ChevronRight, ArrowLeftRight, Copy, Check, CheckCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { MoneyValue } from '@/components/ui/money-value';
import { mockData, type MockTransferStatus, type MockSettlementDebt } from '@/mocks/data';

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: MockTransferStatus }) {
  if (status === 'pending') return <Badge tone="warning">Pendente</Badge>;
  if (status === 'paid') return <Badge tone="neutral" icon={Clock}>Aguardando</Badge>;
  return <Badge tone="positive" icon={CheckCheck}>Confirmado</Badge>;
}

// ---------------------------------------------------------------------------
// Settlement route
// ---------------------------------------------------------------------------

export default function SettlementRoute() {
  const navigate = useNavigate();
  const S = mockData.settlement;

  const [tab, setTab] = useState<'pagar' | 'receber'>('pagar');
  const [debts, setDebts] = useState<MockSettlementDebt[]>(() =>
    S.debts.map((d) => ({ ...d })),
  );
  const [credits, setCredits] = useState<MockSettlementDebt[]>(() =>
    S.credits.map((c) => ({ ...c })),
  );
  const [copied, setCopied] = useState<string | null>(null);

  // ---- PIX copy ----
  const copyPix = (pix: string) => {
    try {
      void navigator.clipboard.writeText(pix);
    } catch {
      // fallback — clipboard unavailable
    }
    setCopied(pix);
    setTimeout(() => setCopied((c) => (c === pix ? null : c)), 1600);
    toast.success('Chave copiada');
  };

  // ---- State machine: pending → paid ----
  const markPaid = (id: string) => {
    setDebts((ds) => ds.map((d) => (d.id === id ? { ...d, status: 'paid' as const } : d)));
    const debt = debts.find((d) => d.id === id);
    if (debt) toast.success(`Marcado como pago para ${debt.to}`);
  };

  // ---- State machine: paid → confirmed ----
  const confirmCredit = (id: string) => {
    setCredits((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'confirmed' as const } : c)));
    const credit = credits.find((c) => c.id === id);
    if (credit) toast.success(`Recebimento de ${credit.from} confirmado`);
  };

  const pendingCount = debts.filter((d) => d.status !== 'confirmed').length;

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-[10px] mb-[14px] pt-1">
        <IconButton
          icon={ArrowLeft}
          aria-label="Voltar"
          size="md"
          onClick={() => navigate(-1)}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[17px]">Acerto de contas</div>
          <div className="text-[12px] text-muted-foreground">
            {mockData.tournament.name} · encerrado
          </div>
        </div>
      </div>

      {/* ---- Net balance hero ---- */}
      <Card
        variant={S.netBalance >= 0 ? 'live' : 'default'}
        pad="lg"
        className="mb-[10px]"
      >
        <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-1">
          Saldo líquido
        </div>
        <MoneyValue value={S.netBalance} signed size="40px" />
        <div className="text-[13px] text-muted-foreground mt-1">
          {S.netBalance >= 0
            ? 'Você recebe mais do que paga nesta noite.'
            : 'Você deve mais do que recebe.'}
        </div>
      </Card>

      {/* ---- Link para Pagamentos do torneio ---- */}
      <Card
        interactive
        pad="md"
        className="mb-[16px]"
        onClick={() => navigate('/app/debitos/pagamentos')}
      >
        <div className="flex items-center gap-3">
          <Receipt className="w-[18px] h-[18px] text-gold-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-[14.5px]">Pagamentos do torneio</div>
            <div className="text-[12px] text-muted-foreground mt-[1px]">
              Saldo por jogador · quem paga quem · caixinha
            </div>
          </div>
          <Badge tone="warning">{pendingCount} pendentes</Badge>
          <ChevronRight className="w-[16px] h-[16px] text-muted-foreground shrink-0" />
        </div>
      </Card>

      {/* ---- Tabs ---- */}
      <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)] mb-[14px]">
        {([
          { k: 'pagar', l: `A pagar · ${debts.length}` },
          { k: 'receber', l: `A receber · ${credits.length}` },
        ] as { k: 'pagar' | 'receber'; l: string }[]).map((x) => {
          const active = x.k === tab;
          return (
            <button
              key={x.k}
              type="button"
              onClick={() => setTab(x.k)}
              className={[
                'flex-1 h-9 border-0 cursor-pointer rounded-[var(--radius-sm)]',
                'font-sans font-semibold text-[13px] transition-colors duration-[var(--dur-fast,120ms)]',
                active
                  ? 'bg-[var(--felt-700)] text-foreground'
                  : 'bg-transparent text-muted-foreground',
              ].join(' ')}
            >
              {x.l}
            </button>
          );
        })}
      </div>

      {/* ---- A pagar ---- */}
      {tab === 'pagar' && (
        <div className="flex flex-col gap-[10px]">
          {debts.map((d) => (
            <Card key={d.id} pad="md">
              {/* Player row */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={d.to} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[15px]">{d.to}</div>
                  <div className="text-[12px] text-muted-foreground">{d.type}</div>
                </div>
                <div className="text-right">
                  <MoneyValue value={-d.amount} size="18px" />
                  <div className="mt-1">
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              </div>
              {/* PIX row */}
              {d.pix ? (
                <div className="flex items-center gap-[10px] bg-secondary rounded-[var(--radius-md)] px-3 py-[10px] mb-2">
                  <ArrowLeftRight className="w-4 h-4 text-gold-400 shrink-0" />
                  <span className="flex-1 min-w-0 font-mono text-[13px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {d.pix}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyPix(d.pix!)}
                    aria-label="Copiar chave PIX"
                    className={[
                      'inline-flex items-center gap-[6px] border-0 bg-transparent cursor-pointer',
                      'font-sans font-semibold text-[13px]',
                      copied === d.pix ? 'text-positive' : 'text-gold-400',
                    ].join(' ')}
                  >
                    {copied === d.pix ? (
                      <Check className="w-[15px] h-[15px]" />
                    ) : (
                      <Copy className="w-[15px] h-[15px]" />
                    )}
                    {copied === d.pix ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              ) : null}
              {/* Action button */}
              {d.status === 'pending' ? (
                <Button
                  variant="primary"
                  icon={Check}
                  block
                  onClick={() => markPaid(d.id)}
                >
                  Marcar como pago
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {/* ---- A receber ---- */}
      {tab === 'receber' && (
        <div className="flex flex-col gap-[10px]">
          {credits.map((c) => (
            <Card key={c.id} pad="md">
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={c.from} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[15px]">{c.from}</div>
                  <div className="text-[12px] text-muted-foreground">{c.type}</div>
                </div>
                <div className="text-right">
                  <MoneyValue value={c.amount} signed size="18px" />
                  <div className="mt-1">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </div>
              {c.status !== 'confirmed' ? (
                <Button
                  variant="secondary"
                  icon={CheckCheck}
                  block
                  onClick={() => confirmCredit(c.id)}
                >
                  Confirmar recebimento
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
