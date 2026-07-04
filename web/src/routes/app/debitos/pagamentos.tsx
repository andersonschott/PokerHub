/**
 * /app/debitos/pagamentos — Pagamentos do torneio (pós-encerramento).
 * Refatorado na Fase 5 para consumir a API Real.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ListChecks,
  Clock,
  PiggyBank,
  RefreshCcw,
  Megaphone,
  Copy,
  ChevronRight,
  ChevronDown,
  Loader2,
  QrCode,
  Share2,
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
import { PixQrSheet } from '@/features/payments/pix-qr-sheet';
import { ShareCard } from '@/features/payments/share-card';
import { buildShareCardModel } from '@/features/payments/share-card-model';
import { BalanceShareCard } from '@/features/payments/balance-share-card';
import { buildBalanceShareCardModel } from '@/features/payments/balance-share-card-model';
import { toPng } from 'html-to-image';

import {
  useTournamentBalances,
  useTournamentPayments,
  useCalculatePayments,
  useAdminMarkAsPaid,
  useBulkConfirmPayments,
  useJackpotContribution,
  PaymentStatus,
} from '@/lib/api/hooks/use-payments';

import { useTournament as useTournamentData, useDelegates } from '@/lib/api/hooks/use-tournaments';
import { useAuth } from '@/lib/auth-context';
import { useLeague } from '@/lib/api/hooks/use-leagues';
import { canOperateTournament } from '@/features/tournaments/permissions';
import { aggregateDebts } from '@/features/payments/aggregate-debts';
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
// Pagamentos route
// ---------------------------------------------------------------------------

export default function PagamentosRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tId = searchParams.get('t');

  // ---- Queries ----
  const { data: tournament, isLoading: isLoadingT } = useTournamentData(tId ?? '');
  const { data: league } = useLeague(tournament?.leagueId ?? '');
  const { data: delegates } = useDelegates(tId ?? '');
  const canOperate = canOperateTournament(tId, user, league, delegates ?? []);

  const [tab, setTab] = useState<'saldo' | 'pagamentos'>('saldo');
  const [copied, setCopied] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<{ key: string; name: string; amount: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const balanceShareCardRef = useRef<HTMLDivElement>(null);

  const { data: balances, isLoading: isLoadingB } = useTournamentBalances(tId ?? '');
  const { data: payments, isLoading: isLoadingP } = useTournamentPayments(tId ?? '');
  const { data: jackpot } = useJackpotContribution(tId ?? '');

  // ---- Mutations ----
  const calcMut = useCalculatePayments(tId ?? '');
  const markPaidMut = useAdminMarkAsPaid();
  const bulkMut = useBulkConfirmPayments();

  // Auto-calculate on load if no payments exist
  useEffect(() => {
    if (tId && payments && payments.length === 0 && balances && balances.length === 0) {
      // If we literally have 0 payments and 0 balances, maybe we need to calculate
      // BUT let's require the user to press "Recalcular" manually to be safe,
      // or we can just trigger it once if tournament is finished.
    }
  }, [tId, payments, balances]);

  if (!tId || isLoadingT || isLoadingB || isLoadingP) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-4 text-center">
        <p>Torneio não encontrado.</p>
        <Button onClick={() => navigate('/app/debitos')}>Voltar</Button>
      </div>
    );
  }

  const transfers = payments ?? [];
  const saldo = balances ?? [];

  const aggregated = aggregateDebts(transfers);
  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ---- Actions ----
  const copyPix = (pixKey: string, id: string) => {
    try {
      void navigator.clipboard.writeText(pixKey);
    } catch {
      // clipboard unavailable
    }
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    toast.success('Chave copiada');
  };

  const recalculate = () => {
    calcMut.mutate(undefined, {
      onSuccess: () => toast.success('Pagamentos calculados com sucesso'),
      onError: () => toast.error('Falha ao calcular pagamentos')
    });
  };

  const adminMarkPaid = (id: string, name: string) => {
    markPaidMut.mutate(id, {
      onSuccess: () => toast.success(`${name} marcou como pago (via Admin)`)
    });
  };

  const bulkConfirm = () => {
    const ids = aggregated.filter((g) => !g.allConfirmed).flatMap((g) => g.paymentIds);
    if (ids.length === 0) return;
    bulkMut.mutate(ids, {
      onSuccess: (r) => toast.success(`${r?.confirmed ?? ids.length} pagamento(s) confirmado(s)`),
      onError: () => toast.error('Falha ao confirmar pagamentos'),
    });
  };

  const tName = tournament.name;
  const shareModel = buildShareCardModel(tName, tournament.scheduledDateTime, aggregated);
  const balanceShareModel = buildBalanceShareCardModel(
    tName,
    tournament.scheduledDateTime,
    saldo,
    jackpot?.amount ?? 0,
    tournament.prizePool,
  );

  const downloadPng = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const captureAndShare = async (
    node: HTMLDivElement | null,
    filename: string,
    title: string,
    text: string,
  ) => {
    if (!node) return;
    setIsSharing(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const opts = {
        pixelRatio: 2,
        backgroundColor: '#191816',
        width: node.offsetWidth,
        height: node.offsetHeight,
        // O card fica off-screen (position:fixed; left:-9999px); o html-to-image copia
        // esse deslocamento pro clone e o conteudo rasteriza fora do viewport (imagem so
        // com o fundo). Sobrescreve a posicao do clone para 0,0.
        style: { position: 'static', left: '0px', top: '0px', margin: '0' },
      };
      await toPng(node, opts);
      const dataUrl = await toPng(node, opts);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/png' });
      const shareData: ShareData = { title, text, files: [file] };
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
      } else {
        downloadPng(blob, filename);
        toast.info('Imagem baixada. Compartilhe manualmente no WhatsApp.');
      }
    } catch (err) {
      const isAbort = err instanceof Error && /abort|canceled|cancelled/i.test(err.message);
      if (!isAbort) {
        toast.error('Não foi possível compartilhar a imagem.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleShare = () =>
    captureAndShare(
      shareCardRef.current,
      'pendencias.png',
      `Pendências · ${shareModel.title}`,
      `Confira os pagamentos pendentes do ${shareModel.title}.`,
    );

  const handleShareBalance = () =>
    captureAndShare(
      balanceShareCardRef.current,
      'saldo.png',
      `Saldo · ${balanceShareModel.title}`,
      `Confira o saldo do ${balanceShareModel.title}.`,
    );

  // ---- Derived ----
  const pending = aggregated.filter((g) => !g.allConfirmed && g.hasPending).length;
  const paid = aggregated.filter((g) => !g.allConfirmed && !g.hasPending).length;
  const confirmed = aggregated.filter((g) => g.allConfirmed).length;
  const toConfirm = aggregated.filter((g) => !g.allConfirmed);
  const totalReceber = aggregated.reduce((s, g) => s + g.totalAmount, 0);
  const pct = aggregated.length > 0 ? Math.round((confirmed / aggregated.length) * 100) : 0;

  const sortedSaldo = [...saldo].sort((a, b) => b.balance - a.balance);

  const tPrizePool = tournament.prizePool;
  const tCaixinha = jackpot?.amount ?? 0;

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-[10px] mb-[14px] pt-1">
        <IconButton
          icon={ArrowLeft}
          aria-label="Voltar"
          size="md"
          onClick={() => navigate('/app/torneio')}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[17px]">Pagamentos</div>
          <div className="text-[12px] text-muted-foreground">{tName}</div>
        </div>
      </div>

      {/* ---- Desktop: stat tiles grid (lg: only) ---- */}
      <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr] gap-3 mb-5">
        <Card pad="md">
          <div className="text-[11.5px] uppercase tracking-[0.07em] text-muted-foreground">
            {tName} · progresso do acerto
          </div>
          <div className="flex items-baseline gap-2 my-[6px]">
            <span className="font-mono font-bold text-[28px]">{pct}%</span>
            <span className="text-[12.5px] text-muted-foreground">
              {confirmed}/{aggregated.length} confirmadas
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
                key={p.playerId}
                className={[
                  'flex items-center gap-3 px-[14px] py-[10px]',
                  i < sortedSaldo.length - 1 ? 'border-b border-border' : '',
                ].join(' ')}
              >
                <Avatar name={p.playerName} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {p.playerName}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground font-mono inline-flex items-center gap-1 flex-wrap">
                    inv <MoneyValue value={p.totalInvestment} cents={false} color="none" size="11.5px" />
                    {' · '}prêmio <MoneyValue value={p.prize} cents={false} color="none" size="11.5px" />
                  </div>
                </div>
                <MoneyValue value={p.balance} signed cents={false} size="15px" />
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
                <MoneyValue value={tCaixinha} cents={false} color="none" size="11px" />
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
                {sortedSaldo.map((s) => {
                  return (
                    <tr key={s.playerId} className="border-t border-border">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={s.playerName} size={26} />
                          <span className="font-sans font-semibold text-[13px] whitespace-nowrap">
                            {s.playerName.split(' ')[0]}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 text-right">
                        <MoneyValue value={s.totalInvestment} cents={false} color="muted" size="12.5px" />
                      </td>
                      <td className="px-2 text-right">
                        <MoneyValue value={s.prize} cents={false} color="none" size="12.5px" />
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <MoneyValue value={s.balance} signed cents={false} size="13px" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-between pt-[10px] mt-1 border-t border-border">
              <span className="text-[12.5px] text-muted-foreground">Prize pool</span>
              <MoneyValue value={tPrizePool} cents={false} color="none" size="14px" />
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
              <MoneyValue value={tCaixinha} cents={false} color="none" size="14.5px" className="font-bold text-gold-400" />
            </div>
          </Card>

          {/* Prize pool (mobile) */}
          <Card pad="md" className="lg:hidden">
            <div className="flex items-center gap-[10px]">
              <span className="flex-1 text-[13.5px] font-medium">Total prize pool</span>
              <MoneyValue value={tPrizePool} cents={false} color="none" size="15px" />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-1">
            {canOperate && (
              <Button variant="secondary" icon={RefreshCcw} block onClick={recalculate}>
                Calcular Pagamentos
              </Button>
            )}
            <Button
              variant="secondary"
              icon={Megaphone}
              block
              disabled
              title="Em breve"
              className="min-w-0"
            >
              <span className="block truncate">Cobrar todos · Em breve</span>
            </Button>
            <Button
              variant="secondary"
              icon={Share2}
              block
              onClick={handleShareBalance}
              disabled={isSharing}
              className="min-w-0"
            >
              <span className="block truncate">Compartilhar saldo</span>
            </Button>
          </div>
        </div>
      )}

      {/* ---- Lista de pagamentos ---- */}
      {tab === 'pagamentos' && (
        <div className="flex flex-col gap-[10px]">
          {/* Confirmar em lote — disponível no mobile e desktop */}
          {toConfirm.length > 0 && (
            <div
              className="flex items-center gap-[10px] px-3 py-[10px] rounded-[var(--radius-md)]"
              style={{
                border: '1px solid color-mix(in oklab, var(--positive) 28%, transparent)',
                background: 'color-mix(in oklab, var(--positive) 10%, var(--card))',
              }}
            >
              <ListChecks className="w-[18px] h-[18px] text-positive shrink-0" />
              <span className="flex-1 text-[13px]">
                {toConfirm.length} pagamento{toConfirm.length === 1 ? '' : 's'} em aberto
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={CheckCheck}
                onClick={bulkConfirm}
                disabled={bulkMut.isPending}
              >
                Confirmar todos
              </Button>
            </div>
          )}
          {/* Mobile: compartilhar pendências (no desktop fica no header abaixo) */}
          <Button
            variant="secondary"
            icon={Share2}
            block
            onClick={handleShare}
            disabled={isSharing}
            className="lg:hidden min-w-0"
          >
            <span className="block truncate">Compartilhar pendências</span>
          </Button>
          {/* Desktop: header + actions */}
          <div className="hidden lg:flex items-center justify-between mb-2">
            <span className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Quem paga quem · {transfers.length}
            </span>
            <div className="flex flex-wrap gap-2">
              {canOperate && (
                <Button variant="ghost" icon={RefreshCcw} size="sm" onClick={recalculate}>
                  Recalcular
                </Button>
              )}
              <Button
                variant="secondary"
                icon={Megaphone}
                size="sm"
                disabled
                title="Em breve"
                className="min-w-0"
              >
                <span className="block truncate">Cobrar todos · Em breve</span>
              </Button>
              <Button
                variant="secondary"
                icon={Share2}
                size="sm"
                onClick={handleShare}
                disabled={isSharing}
                className="min-w-0"
              >
                <span className="block truncate">Compartilhar</span>
              </Button>
            </div>
          </div>

          {aggregated.length === 0 && (
             <div className="text-center py-6 text-muted-foreground">
               Nenhum pagamento gerado. Use a aba Saldo para Calcular.
             </div>
          )}

          {aggregated.map((g) => {
            const isExpanded = expanded.has(g.key);
            const groupStatus = g.allConfirmed
              ? PaymentStatus.Confirmed
              : g.hasPending
                ? PaymentStatus.Pending
                : PaymentStatus.Paid;
            const copyId = `group-${g.key}`;

            return (
              <Card key={g.key} pad="md">
                {/* Transfer header: from → to + expand toggle */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(g.key)}
                  className="w-full flex items-center gap-2 mb-[10px] cursor-pointer text-left"
                >
                  <span className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                    {g.fromPlayerName.split(' ')[0]}
                  </span>
                  <ChevronRight className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
                  {g.isJackpot && <PiggyBank className="w-[15px] h-[15px] text-gold-400 shrink-0" />}
                  <span
                    className={[
                      'font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis min-w-0',
                      g.isJackpot ? 'text-gold-400' : '',
                    ].join(' ')}
                  >
                    {g.toPlayerName.split(' ')[0]}
                  </span>
                  <ChevronDown
                    className={[
                      'w-[16px] h-[16px] text-muted-foreground shrink-0 ml-auto transition-transform',
                      isExpanded ? 'rotate-180' : '',
                    ].join(' ')}
                  />
                </button>

                {/* Amount + PIX copy + status */}
                <div className="flex items-center gap-[10px]">
                  <MoneyValue value={g.totalAmount} cents={false} color="none" size="18px" />
                  {g.toPlayerPixKey ? (
                    <button
                      type="button"
                      onClick={() => copyPix(g.toPlayerPixKey!, copyId)}
                      aria-label={`Copiar chave PIX de ${g.toPlayerName}`}
                      className={[
                        'inline-flex items-center justify-center gap-[5px] shrink-0 cursor-pointer',
                        'min-h-[44px] px-3 rounded-[var(--radius-sm)] border border-border bg-transparent',
                        'font-sans font-semibold text-[12px]',
                        copied === copyId ? 'text-positive' : 'text-gold-400',
                      ].join(' ')}
                    >
                      {copied === copyId ? (
                        <Check className="w-[13px] h-[13px]" />
                      ) : (
                        <Copy className="w-[13px] h-[13px]" />
                      )}
                      {copied === copyId ? 'Copiado' : 'Copiar'}
                    </button>
                  ) : null}
                  {g.toPlayerPixKey ? (
                    <button
                      type="button"
                      onClick={() => setQrFor({ key: g.toPlayerPixKey!, name: g.toPlayerName, amount: g.totalAmount })}
                      aria-label="Mostrar QR Code PIX"
                      className="inline-flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] rounded-[var(--radius-sm)] border border-border bg-transparent text-foreground cursor-pointer"
                    >
                      <QrCode className="w-[18px] h-[18px]" />
                    </button>
                  ) : null}
                  <span className="ml-auto shrink-0">
                    <StatusBadge status={groupStatus} />
                  </span>
                </div>

                {/* Expanded breakdown */}
                {isExpanded && (
                  <div className="mt-[10px] pt-[10px] border-t border-border">
                    <div className="text-[12.5px] text-muted-foreground mb-2">
                      {g.breakdown.map((b, i) => (
                        <span key={b.type}>
                          {i > 0 && ' · '}
                          {paymentTypeLabel(b.type)}{' '}
                          <MoneyValue value={b.amount} cents={false} color="none" size="12.5px" />
                        </span>
                      ))}
                    </div>

                    {groupStatus !== PaymentStatus.Confirmed ? (
                      <div className="flex gap-2">
                        {groupStatus === PaymentStatus.Pending ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            block
                            onClick={() =>
                              g.pendingPaymentIds.forEach((id) =>
                                adminMarkPaid(id, g.fromPlayerName)
                              )
                            }
                          >
                            Pago
                          </Button>
                        ) : null}
                        <Button
                          variant="primary"
                          size="sm"
                          block
                          onClick={() => bulkMut.mutate(g.paymentIds, {
                            onSuccess: (r) => toast.success(`${r?.confirmed ?? g.paymentIds.length} pagamento(s) confirmado(s)`),
                            onError: () => toast.error('Falha ao confirmar pagamentos'),
                          })}
                          disabled={bulkMut.isPending}
                        >
                          Confirmar todos
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </Card>
            );
          })}
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

      <ShareCard model={shareModel} ref={shareCardRef} />
      <BalanceShareCard model={balanceShareModel} ref={balanceShareCardRef} />
    </div>
  );
}
