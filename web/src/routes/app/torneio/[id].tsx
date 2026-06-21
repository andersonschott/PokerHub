/**
 * /app/torneio/:tournamentId — Detalhe de torneio agendado / próximo (somente leitura).
 *
 * Mostra header (voltar + nome + status + data/buy-in), stat tiles
 * (jogadores / buy-in / prize pool) e a lista de inscritos (players[])
 * com avatar, nome e indicador de check-in.
 *
 * Segue o padrão de historico/[id].tsx (mesmo design system).
 * Não controla nada — sem mutations, sem dinheiro novo. Para operar o
 * torneio ao vivo use /app/torneio/dashboard; para encerrados, o histórico.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Wallet, Trophy, CheckCircle2, Loader2 } from 'lucide-react';

import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { SectionTitle } from '@/components/ui/section-title';
import { Avatar } from '@/components/ui/avatar';

import { useTournament, TournamentStatus } from '@/lib/api/hooks/use-tournaments';
import { formatPtBrDate } from '@/routes/app/torneio/historico-map';

// ---------------------------------------------------------------------------
// Status → rótulo + tom do badge (derivado, sem campo novo no backend)
// ---------------------------------------------------------------------------

type StatusTone = 'neutral' | 'gold' | 'emerald' | 'positive' | 'negative' | 'warning';

function statusLabel(status: TournamentStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case TournamentStatus.Scheduled:
      return { label: 'Agendado', tone: 'gold' };
    case TournamentStatus.InProgress:
      return { label: 'Ao vivo', tone: 'positive' };
    case TournamentStatus.Paused:
      return { label: 'Pausado', tone: 'warning' };
    case TournamentStatus.Finished:
      return { label: 'Encerrado', tone: 'neutral' };
    case TournamentStatus.Cancelled:
      return { label: 'Cancelado', tone: 'negative' };
    default:
      return { label: 'Torneio', tone: 'neutral' };
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export default function TorneioDetalheRoute() {
  const navigate = useNavigate();
  const { tournamentId = '' } = useParams<{ tournamentId: string }>();

  const { data: detail, isLoading } = useTournament(tournamentId);

  const status = detail ? statusLabel(detail.status) : null;
  const players = detail?.players ?? [];
  const checkedInCount = players.filter((p) => p.isCheckedIn).length;

  return (
    <div className="px-4 pt-[14px] pb-24 min-h-full lg:px-8 lg:py-6">
      <div className="mx-auto w-full lg:max-w-[720px]">
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
              {detail?.name ?? 'Torneio'}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {detail ? (
                <>
                  <span className="font-mono">{formatPtBrDate(detail.scheduledDateTime)}</span>
                  {detail.location ? <> · {detail.location}</> : null} · buy-in{' '}
                  <MoneyValue value={detail.buyIn} cents={false} color="none" size="12px" />
                </>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
          </div>
          {status ? (
            <Badge tone={status.tone} className="shrink-0">
              {status.label}
            </Badge>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Torneio não encontrado
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <StatTile icon={Users} value={players.length} label="Jogadores" center />
              <StatTile
                icon={Wallet}
                value={<MoneyValue value={detail.buyIn} cents={false} color="none" size="18px" />}
                label="Buy-in"
                center
              />
              <StatTile
                icon={Trophy}
                value={<MoneyValue value={detail.prizePool} cents={false} color="none" size="18px" />}
                label="Prize pool"
                tone="emerald"
                center
              />
            </div>

            {/* Inscritos */}
            <SectionTitle icon={Users}>
              Inscritos · {players.length}
              {players.length > 0 ? ` · ${checkedInCount} confirmados` : ''}
            </SectionTitle>

            {players.length === 0 ? (
              <Card pad="lg">
                <div className="text-center text-[13px] text-muted-foreground py-2">
                  Nenhum jogador inscrito ainda.
                </div>
              </Card>
            ) : (
              <Card pad="none">
                {players.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-[10px]"
                    style={{
                      borderBottom: i < players.length - 1 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <Avatar name={p.playerName} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-[14.5px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {p.playerName}
                        {p.nickname ? (
                          <span className="text-muted-foreground font-normal text-[13px] ml-1">
                            @{p.nickname}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {p.isCheckedIn ? (
                      <Badge tone="positive" icon={CheckCircle2} className="shrink-0">
                        Check-in
                      </Badge>
                    ) : (
                      <Badge tone="neutral" className="shrink-0">
                        Aguardando
                      </Badge>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
