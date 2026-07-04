/**
 * /app/debitos — Acerto de contas (Settlement).
 * Refatorado na Fase 5 para consumir a API Real.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, ArrowRight, Copy, Check, CheckCheck, Clock, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { MoneyValue } from '@/components/ui/money-value';
import { PixQrSheet } from '@/features/payments/pix-qr-sheet';

import {
  useMyDebts,
  useMyCredits,
  useMarkAsPaid,
  useConfirmPayment,
  useOrganizerPayments,
  useAdminMarkAsPaid,
  useAdminConfirmPayment,
  PaymentStatus,
} from '@/lib/api/hooks/use-payments';
import { paymentTypeLabel } from '@/features/payments/payment-type-label';

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === PaymentStatus.Pending) return <Badge tone="warning">Pendente</Badge>;
  if (status === PaymentStatus.Paid) return <Badge tone="neutral" icon={Clock}>Aguardando</Badge>;
  if (status === PaymentStatus.Confirmed) return <Badge tone="positive" icon={CheckCheck}>Confirmado</Badge>;
  return <Badge tone="neutral">Cancelado</Badge>;
}

// ---------------------------------------------------------------------------
// Settlement route
// ---------------------------------------------------------------------------

export default function SettlementRoute() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<'pagar' | 'receber' | 'liga'>('pagar');
  const [copied, setCopied] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<{ key: string; name: string; amount: number } | null>(null);

  // ---- Queries ----
  const { data: debts, isLoading: isLoadingD } = useMyDebts();
  const { data: credits, isLoading: isLoadingC } = useMyCredits();

  // ---- Mutations ----
  const markPaidMut = useMarkAsPaid();
  const confirmMut = useConfirmPayment();

  // ---- Organizador: pagamentos de toda a liga (gestão) ----
  const { data: orgPayments } = useOrganizerPayments();
  const isOrganizer = (orgPayments?.length ?? 0) > 0;
  const orgPending = orgPayments?.filter((p) => p.status !== PaymentStatus.Confirmed) ?? [];
  const adminMarkMut = useAdminMarkAsPaid();
  const adminConfirmMut = useAdminConfirmPayment();

  if (isLoadingD || isLoadingC) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeDebts = debts?.filter(d => d.status !== PaymentStatus.Confirmed) ?? [];
  const pendingConfirmationDebts = debts?.filter(d => d.status === PaymentStatus.Paid) ?? [];
  const activeCredits = credits?.filter(c => c.status !== PaymentStatus.Confirmed && !c.isJackpotContribution) ?? [];

  const totalDebts = activeDebts.reduce((s, d) => s + d.amount, 0);
  const totalPendingConfirmation = pendingConfirmationDebts.reduce((s, d) => s + d.amount, 0);
  const totalCredits = activeCredits.reduce((s, c) => s + c.amount, 0);
  const netBalance = totalCredits - totalDebts;

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

  // ---- Actions ----
  const markPaid = (id: string, toName: string) => {
    markPaidMut.mutate(id, {
      onSuccess: () => toast.success(`Marcado como pago para ${toName.split(' ')[0]}`)
    });
  };

  const confirmCredit = (id: string, fromName: string) => {
    confirmMut.mutate(id, {
      onSuccess: () => toast.success(`Recebimento de ${fromName.split(' ')[0]} confirmado`)
    });
  };

  const adminMarkPaid = (id: string, name: string) => {
    adminMarkMut.mutate(id, {
      onSuccess: () => toast.success(`${name.split(' ')[0]} marcado como pago`),
    });
  };

  const adminConfirm = (id: string, name: string) => {
    adminConfirmMut.mutate(id, {
      onSuccess: () => toast.success(`Recebimento de ${name.split(' ')[0]} confirmado`),
    });
  };



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
            Todas as suas ligas
          </div>
        </div>
      </div>

      {/* ---- Net balance hero ---- */}
      <Card
        variant={netBalance >= 0 ? 'live' : 'default'}
        pad="lg"
        className="mb-[10px]"
      >
        <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-1">
          Saldo líquido
        </div>
        <MoneyValue value={netBalance} signed size="40px" />
        <div className="text-[13px] text-muted-foreground mt-1">
          {netBalance >= 0
            ? 'Você recebe mais do que paga.'
            : 'Você deve mais do que recebe.'}
        </div>
      </Card>

      {totalPendingConfirmation > 0 && (
        <Card pad="md" className="mb-[10px]">
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-muted-foreground">Aguardando confirmação</div>
            <MoneyValue value={-totalPendingConfirmation} size="15px" />
          </div>
        </Card>
      )}


      {/* ---- Link para Pagamentos do torneio (If user is organizer? Keep generic for now or hide if we don't have tournament context. In the mock it was linked to the 'current' tournament) ---- */}
      {/* 
        NOTE: "Pagamentos do Torneio" was accessed from here in the mock, but in the real app, 
        it is accessed from the Dashboard. If we want it here, we would need to know WHICH tournament. 
        For now, we leave the active tournament logic out of the player's wallet view.
      */}

      {/* ---- Tabs ---- */}
      <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)] mb-[14px]">
        {([
          { k: 'pagar', l: `A pagar · ${activeDebts.length}` },
          { k: 'receber', l: `A receber · ${activeCredits.length}` },
          ...(isOrganizer ? [{ k: 'liga', l: `Liga · ${orgPending.length}` }] : []),
        ] as { k: 'pagar' | 'receber' | 'liga'; l: string }[]).map((x) => {
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
          {activeDebts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Você não tem débitos pendentes.</div>
          )}
          {activeDebts.filter(d => d.status === PaymentStatus.Pending).map((d) => (
            <Card key={d.paymentId} pad="md">
              {/* Player row */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={d.creditorPlayerName} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[15px]">{d.creditorPlayerName}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {d.tournamentName} · {paymentTypeLabel(d.type)}
                  </div>
                </div>
                <div className="text-right">
                  <MoneyValue value={-d.amount} size="18px" />
                  <div className="mt-1">
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              </div>
              {/* PIX row */}
              {d.creditorPixKey ? (
                <div className="flex items-center gap-[10px] bg-secondary rounded-[var(--radius-md)] px-3 py-[10px] mb-2">
                  <ArrowLeftRight className="w-4 h-4 text-gold-400 shrink-0" />
                  <span className="flex-1 min-w-0 font-mono text-[13px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {d.creditorPixKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyPix(d.creditorPixKey!)}
                    aria-label="Copiar chave PIX"
                    className={[
                      'inline-flex items-center justify-center gap-[6px] shrink-0 cursor-pointer',
                      'min-h-[44px] px-[14px] rounded-[var(--radius-sm)] border border-border bg-transparent',
                      'font-sans font-semibold text-[13px]',
                      copied === d.creditorPixKey ? 'text-positive' : 'text-gold-400',
                    ].join(' ')}
                  >
                    {copied === d.creditorPixKey ? (
                      <Check className="w-[15px] h-[15px]" />
                    ) : (
                      <Copy className="w-[15px] h-[15px]" />
                    )}
                    {copied === d.creditorPixKey ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrFor({ key: d.creditorPixKey!, name: d.creditorPlayerName, amount: d.amount })}
                    aria-label="Mostrar QR Code PIX"
                    className="inline-flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] rounded-[var(--radius-sm)] border border-border bg-transparent text-foreground cursor-pointer"
                  >
                    <QrCode className="w-[18px] h-[18px]" />
                  </button>
                </div>
              ) : null}
              {/* Action button */}
              {d.status === PaymentStatus.Pending ? (
                <Button
                  variant="primary"
                  icon={Check}
                  block
                  onClick={() => markPaid(d.paymentId, d.creditorPlayerName)}
                >
                  Marcar como pago
                </Button>
              ) : null}
            </Card>
          ))}
          {pendingConfirmationDebts.map((d) => (
            <Card key={d.paymentId} pad="md">
              {/* Player row */}
              <div className="flex items-center gap-3">
                <Avatar name={d.creditorPlayerName} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[15px]">{d.creditorPlayerName}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {d.tournamentName} · {paymentTypeLabel(d.type)}
                  </div>
                </div>
                <div className="text-right">
                  <MoneyValue value={-d.amount} size="18px" />
                  <div className="mt-1">
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---- A receber ---- */}
      {tab === 'receber' && (
        <div className="flex flex-col gap-[10px]">
          {activeCredits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Você não tem créditos pendentes.</div>
          )}
          {activeCredits.map((c) => (
            <Card key={c.id} pad="md">
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={c.fromPlayerName} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[15px]">{c.fromPlayerName}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {c.tournamentName} · {paymentTypeLabel(c.type)}
                  </div>
                </div>
                <div className="text-right">
                  <MoneyValue value={c.amount} signed size="18px" />
                  <div className="mt-1">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </div>
              {c.status !== PaymentStatus.Confirmed ? (
                <Button
                  variant="secondary"
                  icon={CheckCheck}
                  block
                  onClick={() => confirmCredit(c.id, c.fromPlayerName)}
                >
                  Confirmar recebimento
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {/* ---- Liga (organizador): gestão de todos os pagamentos ---- */}
      {tab === 'liga' && (
        <div className="flex flex-col gap-[10px]">
          {(orgPayments ?? []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Nenhum pagamento na sua liga.</div>
          )}
          {(orgPayments ?? []).map((x) => (
            <Card key={x.id} pad="md">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                  {x.fromPlayerName.split(' ')[0]}
                </span>
                <ArrowRight className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
                <span className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                  {x.toPlayerName.split(' ')[0]}
                </span>
                <span className="ml-auto shrink-0">
                  <StatusBadge status={x.status} />
                </span>
              </div>
              <div className="flex items-center gap-[10px]">
                <MoneyValue value={x.amount} cents={false} color="none" size="18px" />
                <span className="text-[12px] text-muted-foreground truncate">{x.tournamentName}</span>
              </div>
              {x.status !== PaymentStatus.Confirmed ? (
                <div className="flex gap-2 mt-[10px]">
                  {x.status === PaymentStatus.Pending ? (
                    <Button variant="secondary" size="sm" block onClick={() => adminMarkPaid(x.id, x.fromPlayerName)}>
                      Pago
                    </Button>
                  ) : null}
                  <Button variant="primary" size="sm" block onClick={() => adminConfirm(x.id, x.fromPlayerName)}>
                    Confirmar
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {qrFor ? (
        <PixQrSheet
          open
          onClose={() => setQrFor(null)}
          pixKey={qrFor.key}
          recipientName={qrFor.name}
          amount={qrFor.amount}
        />
      ) : null}
    </div>
  );
}
