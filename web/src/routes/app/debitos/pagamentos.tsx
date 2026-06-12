/**
 * /app/debitos/pagamentos — Pagamentos do torneio (pós-encerramento).
 * Port de Pagamentos.jsx + tabelas de DesktopPagamentos.jsx. README item 11.
 *
 * Resumo (a receber · pendentes · confirmados · progresso),
 * Saldo do torneio (investimento · prêmio · saldo por jogador, caixinha, prize pool),
 * lista de transferências (quem paga quem, PIX copy, Pago → Confirmar state machine),
 * Recalcular / Cobrar todos.
 *
 * Desktop (lg:): tabelas conforme DesktopPagamentos.jsx.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  PiggyBank,
  RefreshCcw,
  Megaphone,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { MoneyValue } from '@/components/ui/money-value';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatTile } from '@/components/ui/stat-tile';
import { mockData, type MockTransfer, type MockTransferStatus } from '@/mocks/data';

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: MockTransferStatus }) {
  if (status === 'pending') return <Badge tone="warning">Pendente</Badge>;
  if (status === 'paid') return <Badge tone="neutral" icon={Clock}>Aguardando</Badge>;
  return <Badge tone="positive" icon={CheckCheck}>Confirmado</Badge>;
}

// ---------------------------------------------------------------------------
// Pagamentos route
// ---------------------------------------------------------------------------

export default function PagamentosRoute() {
  const navigate = useNavigate();
  const P = mockData.pagamentos;

  const [tab, setTab] = useState<'saldo' | 'pagamentos'>('saldo');
  const [transfers, setTransfers] = useState<MockTransfer[]>(() =>
    P.transfers.map((t) => ({ ...t })),
  );
  const [copied, setCopied] = useState<string | null>(null);

  // ---- PIX copy ----
  const copyPix = (transfer: MockTransfer) => {
    try {
      void navigator.clipboard.writeText(transfer.pix);
    } catch {
      // clipboard unavailable
    }
    setCopied(transfer.id);
    setTimeout(() => setCopied((c) => (c === transfer.id ? null : c)), 1600);
    toast.success('Chave copiada');
  };

  // ---- State machine: pending → paid → confirmed ----
  const advance = (id: string, toStatus: MockTransferStatus, msg: string) => {
    setTransfers((ts) => ts.map((t) => (t.id === id ? { ...t, status: toStatus } : t)));
    toast.success(msg);
  };

  // ---- Recalcular (mock) ----
  const recalculate = () => {
    setTransfers(P.transfers.map((t) => ({ ...t })));
    toast.success('Pagamentos recalculados');
  };

  // ---- Cobrar todos (mock) ----
  const chargeAll = () => {
    const pendingCount = transfers.filter((t) => t.status === 'pending').length;
    toast.success(`Lembrete enviado para ${pendingCount} pendentes`);
  };

  // ---- Derived ----
  const pending = transfers.filter((t) => t.status === 'pending').length;
  const paid = transfers.filter((t) => t.status === 'paid').length;
  const confirmed = transfers.filter((t) => t.status === 'confirmed').length;
  const totalReceber = transfers.reduce((s, t) => s + t.amount, 0);
  const pct = transfers.length > 0 ? Math.round((confirmed / transfers.length) * 100) : 0;

  const saldoOf = (p: { inv: number; prize: number }) => p.prize - p.inv;
  const sortedSaldo = [...P.saldo].sort((a, b) => saldoOf(b) - saldoOf(a));

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-[10px] mb-[14px] pt-1">
        <IconButton
          icon={ArrowLeft}
          aria-label="Voltar"
          size="md"
          onClick={() => navigate('/app/debitos')}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[17px]">Pagamentos</div>
          <div className="text-[12px] text-muted-foreground">{P.tournament} · encerrado</div>
        </div>
      </div>

      {/* ---- Desktop: stat tiles grid (lg: only) ---- */}
      <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr] gap-3 mb-5">
        <Card pad="md">
          <div className="text-[11.5px] uppercase tracking-[0.07em] text-muted-foreground">
            {P.tournament} · progresso do acerto
          </div>
          <div className="flex items-baseline gap-2 my-[6px]">
            <span className="font-mono font-bold text-[28px]">{pct}%</span>
            <span className="text-[12.5px] text-muted-foreground">
              {confirmed}/{transfers.length} confirmadas
            </span>
          </div>
          <ProgressBar value={pct} tone="emerald" />
        </Card>
        <StatTile
          icon={Clock}
          value={pending}
          label="Pendentes"
          tone={pending > 0 ? 'gold' : undefined}
          center
        />
        <StatTile icon={Check} value={paid} label="Aguardando" center />
        <StatTile icon={CheckCheck} value={confirmed} label="Confirmadas" tone="emerald" center />
      </div>

      {/* ---- Mobile: summary card ---- */}
      <Card variant="live" pad="lg" className="mb-[14px] lg:hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-start">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              A receber
            </div>
            <MoneyValue value={totalReceber} cents={false} size="26px" />
          </div>
          <div className="text-center">
            <div
              className={[
                'font-mono font-bold text-[20px]',
                pending > 0 ? 'text-warning' : 'text-positive',
              ].join(' ')}
            >
              {pending}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
              Pendentes
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono font-bold text-[20px] text-positive">{confirmed}</div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
              Confirmados
            </div>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={pct} tone="emerald" />
          <div className="text-[11.5px] text-muted-foreground mt-[6px] font-mono">
            {pct}% concluído
          </div>
        </div>
      </Card>

      {/* ---- Tabs ---- */}
      <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)] mb-[14px]">
        {([
          { k: 'saldo', l: 'Saldo do torneio' },
          { k: 'pagamentos', l: `Pagamentos · ${pending}` },
        ] as { k: 'saldo' | 'pagamentos'; l: string }[]).map((x) => {
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

      {/* ---- Saldo do torneio ---- */}
      {tab === 'saldo' && (
        <div className="flex flex-col gap-2">
          {/* Mobile: player cards */}
          <Card pad="none" className="lg:hidden">
            {sortedSaldo.map((p, i) => (
              <div
                key={p.id}
                className={[
                  'flex items-center gap-3 px-[14px] py-[10px]',
                  i < sortedSaldo.length - 1 ? 'border-b border-border' : '',
                ].join(' ')}
              >
                <Avatar name={p.name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground font-mono inline-flex items-center gap-1 flex-wrap">
                    inv <MoneyValue value={p.inv} cents={false} color="none" size="11.5px" />
                    {' · '}prêmio <MoneyValue value={p.prize} cents={false} color="none" size="11.5px" />
                  </div>
                </div>
                <MoneyValue value={saldoOf(p)} signed cents={false} size="15px" />
              </div>
            ))}
          </Card>

          {/* Desktop: table */}
          <Card pad="md" className="hidden lg:block">
            <div className="flex items-center justify-between mb-[10px]">
              <span className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Saldo do torneio
              </span>
              <Badge tone="gold" icon={PiggyBank}>
                Caixinha{' '}
                <MoneyValue value={P.caixinha} cents={false} color="none" size="11px" />
              </Badge>
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Jogador', 'Inv.', 'Prêmio', 'Saldo'].map((col, i) => (
                    <th
                      key={col}
                      className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground pb-2"
                      style={{ textAlign: i === 0 ? 'left' : 'right', padding: '0 8px 8px' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {P.saldo.map((s) => {
                  const net = s.prize - s.inv;
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={s.name} size={26} />
                          <span className="font-sans font-semibold text-[13px] whitespace-nowrap">
                            {s.name.split(' ')[0]}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 text-right">
                        <MoneyValue value={s.inv} cents={false} color="muted" size="12.5px" />
                      </td>
                      <td className="px-2 text-right">
                        <MoneyValue value={s.prize} cents={false} color="none" size="12.5px" />
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <MoneyValue value={net} signed cents={false} size="13px" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-between pt-[10px] mt-1 border-t border-border">
              <span className="text-[12.5px] text-muted-foreground">Prize pool</span>
              <MoneyValue value={P.prizePool} cents={false} color="none" size="14px" />
            </div>
          </Card>

          {/* Caixinha tile (mobile) */}
          <Card
            pad="md"
            className="lg:hidden"
            style={{
              background: 'color-mix(in oklab, var(--gold-500) 7%, var(--card))',
            }}
          >
            <div className="flex items-center gap-[10px]">
              <PiggyBank className="w-4 h-4 text-gold-400 shrink-0" />
              <span className="flex-1 text-[13.5px] font-medium">
                Contribuição para a caixinha
              </span>
              <MoneyValue value={P.caixinha} cents={false} color="none" size="14.5px" className="font-bold text-gold-400" />
            </div>
          </Card>

          {/* Prize pool (mobile) */}
          <Card pad="md" className="lg:hidden">
            <div className="flex items-center gap-[10px]">
              <span className="flex-1 text-[13.5px] font-medium">Total prize pool</span>
              <MoneyValue value={P.prizePool} cents={false} color="none" size="15px" />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <Button variant="secondary" icon={RefreshCcw} block onClick={recalculate}>
              Recalcular
            </Button>
            <Button variant="primary" icon={Megaphone} block onClick={chargeAll}>
              Cobrar todos
            </Button>
          </div>
        </div>
      )}

      {/* ---- Lista de pagamentos ---- */}
      {tab === 'pagamentos' && (
        <div className="flex flex-col gap-[10px]">
          {/* Desktop: header + actions */}
          <div className="hidden lg:flex items-center justify-between mb-2">
            <span className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Quem paga quem · {transfers.length}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" icon={RefreshCcw} size="sm" onClick={recalculate}>
                Recalcular
              </Button>
              <Button variant="secondary" icon={Megaphone} size="sm" onClick={chargeAll}>
                Cobrar todos
              </Button>
            </div>
          </div>

          {transfers.map((x) => (
            <Card key={x.id} pad="md">
              {/* Transfer header: from → to + type badge */}
              <div className="flex items-center gap-2 mb-[10px]">
                <span className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                  {x.from}
                </span>
                <ChevronRight className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
                <span className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                  {x.to}
                </span>
                <span className="ml-auto shrink-0">
                  {x.type === 'Caixinha' ? (
                    <Badge tone="gold">Caixinha</Badge>
                  ) : (
                    <Badge tone="neutral">{x.type}</Badge>
                  )}
                </span>
              </div>

              {/* Amount + PIX copy + status */}
              <div className="flex items-center gap-[10px]">
                <MoneyValue value={x.amount} cents={false} color="none" size="18px" />
                {x.type !== 'Caixinha' ? (
                  <button
                    type="button"
                    onClick={() => copyPix(x)}
                    aria-label={`Copiar chave PIX de ${x.from}`}
                    className={[
                      'inline-flex items-center gap-[5px] border-0 bg-transparent cursor-pointer',
                      'font-sans font-semibold text-[12px]',
                      copied === x.id ? 'text-positive' : 'text-gold-400',
                    ].join(' ')}
                  >
                    {copied === x.id ? (
                      <Check className="w-[13px] h-[13px]" />
                    ) : (
                      <Copy className="w-[13px] h-[13px]" />
                    )}
                    {copied === x.id ? 'Copiado' : 'PIX'}
                  </button>
                ) : null}
                <span className="ml-auto shrink-0">
                  <StatusBadge status={x.status} />
                </span>
              </div>

              {/* State machine buttons */}
              {x.status !== 'confirmed' ? (
                <div className="flex gap-2 mt-[10px]">
                  {x.status === 'pending' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      block
                      onClick={() =>
                        advance(x.id, 'paid', `${x.from} marcou como pago`)
                      }
                    >
                      Pago
                    </Button>
                  ) : null}
                  <Button
                    variant="primary"
                    size="sm"
                    block
                    onClick={() =>
                      advance(
                        x.id,
                        'confirmed',
                        `Recebimento de ${x.from} confirmado`,
                      )
                    }
                  >
                    Confirmar
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
