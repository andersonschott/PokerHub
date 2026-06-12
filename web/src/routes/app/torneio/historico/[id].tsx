/**
 * /app/torneio/historico/:tournamentId — Detalhe de torneio encerrado.
 * Port de PHTorneioDetalhe de Historico.jsx (mobile) + DkHistorico (desktop).
 *
 * Mobile: detalhe da entrada selecionada via useParams + mockData.history.
 * Desktop lg:: lista à esquerda + detalhe à direita.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PiggyBank, Trophy, Users, Repeat, Wallet, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { PodiumStat } from '@/components/ui/podium-stat';
import { MoneyValue } from '@/components/ui/money-value';
import { SectionTitle } from '@/components/ui/section-title';
import { Avatar } from '@/components/ui/avatar';
import { mockData, type MockHistoricoItem } from '@/mocks/data';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Detail panel (shared mobile + desktop)
// ---------------------------------------------------------------------------

interface DetailPanelProps {
  h: MockHistoricoItem;
  onDuplicate: () => void;
  onViewPayments: () => void;
}

function DetailPanel({ h, onDuplicate, onViewPayments }: DetailPanelProps) {
  return (
    <>
      {/* Numbers */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <StatTile
          value={<MoneyValue value={h.prizePool} cents={false} color="none" size="15px" />}
          label="Prize pool"
          tone="emerald"
          center
        />
        <StatTile value={h.players} label="Jogadores" center />
        <StatTile value={h.rebuys} label="Rebuys" center />
      </div>

      {/* Podium */}
      <SectionTitle icon={Trophy}>Pódio</SectionTitle>
      <div className="flex flex-col gap-2 mb-4">
        {h.podium.map((p) => (
          <PodiumStat
            key={p.pos}
            position={p.pos}
            name={p.name}
            sub={p.pos === 1 ? 'Campeão da noite' : p.pos === 2 ? 'Vice' : '3º lugar'}
            prize={<MoneyValue value={p.prize} cents={false} signed size="15px" />}
          />
        ))}
      </div>

      {/* Caixinha */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-lg)] border border-border mb-2.5"
        style={{
          background: 'color-mix(in oklab, var(--gold-500) 7%, var(--card))',
        }}
      >
        <PiggyBank className="size-4 text-gold-400 shrink-0" />
        <span className="flex-1 text-[13.5px] font-medium">Contribuição para a caixinha</span>
        <MoneyValue value={h.caixinha} cents={false} color="none" size="14.5px" className="font-bold text-gold-400" />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button variant="secondary" icon={Wallet} block onClick={onViewPayments}>
          Ver pagamentos
        </Button>
        <Button variant="outline" icon={Copy} block onClick={onDuplicate}>
          Duplicar torneio
        </Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Desktop layout — history table + detail side by side
// ---------------------------------------------------------------------------

function DesktopHistorico({ tournamentId }: { tournamentId: string }) {
  const navigate = useNavigate();
  // fallback to first item if id not found
  const initial = mockData.history.find((x) => x.id === tournamentId) ?? mockData.history[0];
  const [sel, setSel] = useState<MockHistoricoItem>(initial);

  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(330px, 0.85fr)', alignItems: 'start' }}
    >
      {/* List table */}
      <Card pad="md">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Data', 'Torneio', 'Jog.', 'Campeão', 'Prize pool'].map((c, i) => (
                <th
                  key={c}
                  className={cn(
                    'pb-[10px] px-[10px] font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap',
                    i >= 2 ? (i === 4 ? 'text-right' : 'text-center') : 'text-left',
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockData.history.map((x) => {
              const active = x.id === sel.id;
              return (
                <tr
                  key={x.id}
                  onClick={() => setSel(x)}
                  className={cn(
                    'cursor-pointer border-t border-border',
                    'transition-colors duration-[var(--dur-fast,120ms)]',
                    active
                      ? 'bg-[color-mix(in_oklab,var(--gold-500)_9%,transparent)]'
                      : 'hover:bg-secondary',
                  )}
                >
                  <td className="px-[10px] py-3 font-mono text-[13px] text-muted-foreground whitespace-nowrap">
                    {x.date}
                  </td>
                  <td className="px-[10px] py-3 font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">
                    {x.name}
                  </td>
                  <td className="px-[10px] py-3 text-center font-mono text-[13px]">{x.players}</td>
                  <td className="px-[10px] py-3 text-center">
                    <div className="inline-flex items-center gap-[7px]">
                      <Avatar name={x.podium[0]?.name ?? '?'} size={22} podium="gold" />
                      <span className="text-[13px] font-sans font-semibold whitespace-nowrap">
                        {x.podium[0]?.name.split(' ')[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-[10px] py-3 text-right whitespace-nowrap">
                    <MoneyValue value={x.prizePool} cents={false} color="none" size="13.5px" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Detail */}
      <div className="flex flex-col gap-3.5">
        <Card pad="lg">
          <div className="flex items-center justify-between gap-2.5 mb-3.5">
            <div className="min-w-0">
              <div className="font-sans font-bold text-[18px] whitespace-nowrap overflow-hidden text-ellipsis">
                {sel.name}
              </div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5">
                {sel.date} · buy-in <MoneyValue value={sel.buyIn} cents={false} color="none" size="12.5px" />
              </div>
            </div>
            <Badge tone="neutral">Encerrado</Badge>
          </div>

          {/* Stats 2-col desktop */}
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <StatTile icon={Users} value={sel.players} label="Jogadores" center />
            <StatTile
              icon={Repeat}
              value={`${sel.rebuys} · ${sel.addons}`}
              valueSize="20px"
              label="Rebuys · Add-ons"
              center
            />
            <StatTile
              icon={Trophy}
              value={<MoneyValue value={sel.prizePool} cents={false} color="none" size="18px" />}
              label="Prize pool"
              tone="emerald"
              center
            />
            <StatTile
              icon={PiggyBank}
              value={<MoneyValue value={sel.caixinha} cents={false} color="none" size="18px" />}
              label="Caixinha"
              tone="gold"
              center
            />
          </div>

          {/* Podium */}
          <div className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground mb-2.5">
            Pódio
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {sel.podium.map((p) => {
              const podiumColors = ['var(--podium-gold)', 'var(--podium-silver)', 'var(--podium-bronze)'];
              const podiumBg = [
                'bg-[color-mix(in_oklab,var(--podium-gold)_12%,var(--card))]',
                'bg-secondary',
                'bg-secondary',
              ];
              const podiumTone = (['gold', 'silver', 'bronze'] as const)[p.pos - 1];
              return (
                <div
                  key={p.pos}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] border border-border',
                    podiumBg[p.pos - 1],
                  )}
                >
                  <span
                    className="font-mono font-bold text-[14px] w-6"
                    style={{ color: podiumColors[p.pos - 1] }}
                  >
                    {p.pos}º
                  </span>
                  <Avatar name={p.name} size={28} podium={podiumTone} />
                  <span className="flex-1 font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {p.name}
                  </span>
                  <MoneyValue value={p.prize} cents={false} signed size="14px" />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              icon={Wallet}
              block
              onClick={() => navigate('/app/debitos/pagamentos')}
            >
              Ver pagamentos
            </Button>
            <Button
              variant="secondary"
              icon={Copy}
              block
              onClick={() => navigate('/app/torneio/novo')}
            >
              Duplicar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main route component
// ---------------------------------------------------------------------------

export default function HistoricoDetalheRoute() {
  const navigate = useNavigate();
  const { tournamentId = '' } = useParams<{ tournamentId: string }>();

  const h = mockData.history.find((x) => x.id === tournamentId) ?? mockData.history[0];

  const handleDuplicate = () => {
    navigate('/app/torneio/novo');
  };

  const handleViewPayments = () => {
    navigate('/app/debitos/pagamentos');
  };

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <IconButton
            icon={ArrowLeft}
            aria-label="Voltar"
            onClick={() => navigate(-1)}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-sans font-bold text-[18px] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis">
              {h.name}
            </div>
            <div className="text-[12px] text-muted-foreground">
              <span className="font-mono">{h.date}</span> · buy-in <MoneyValue value={h.buyIn} cents={false} color="none" size="12px" />
            </div>
          </div>
          <Badge tone="neutral" className="shrink-0">
            Encerrado
          </Badge>
        </div>

        <DetailPanel h={h} onDuplicate={handleDuplicate} onViewPayments={handleViewPayments} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:block px-8 py-6">
        <DesktopHistorico tournamentId={tournamentId} />
      </div>
    </>
  );
}
