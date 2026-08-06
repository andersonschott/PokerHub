/**
 * /app/torneio — Tab Torneio (ligada à API real, Passo 2B).
 *
 * - Liga ativa com torneio ao vivo (InProgress|Paused) → TimerView: timer fiel via SignalR
 *   (fallback REST sem 00:00 enganoso, igual ao tv.tsx) + stats e listas reais.
 * - Sem torneio ao vivo → TorneioVazio: empty state + Próximos (agendados) + Realizados (finalizados).
 *
 * Reusa os padrões já reais de dashboard.tsx (transform de players, toggle de pausa) e de
 * tv.tsx (clock fiel + restFallbackClock). Sem mock, sem dinheiro novo, sem API nova.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Plus, Settings2, TimerOff, Tv, Users, Trophy, Repeat, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { SectionTitle } from '@/components/ui/section-title';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { Avatar } from '@/components/ui/avatar';
import { LevelControls } from '@/features/timer/level-controls';
import { TimerDisplay } from '@/features/timer/timer-display';
import { RealizadosList } from '@/features/timer/realizados-list';
import { useAuth } from '@/lib/auth-context';
import { useActiveLeague } from '@/features/leagues/league-context';
import { useLeague } from '@/lib/api/hooks/use-leagues';
import { isLeagueOrganizer } from '@/features/tournaments/permissions';
import {
  useTournaments,
  useTournament,
  useResumeTournament,
  usePauseTournament,
  useNextLevel,
  usePrevLevel,
  TournamentStatus,
  type TournamentDto,
} from '@/lib/api/hooks/use-tournaments';
import { useTournamentClock } from '@/lib/api/hooks/use-tournament-clock';
import {
  mapPlayersToTable,
  aggregateStats,
  eliminatedFromTable,
  isLiveClock,
} from '../tv-projection';
import { useTickingRestClock } from '../use-ticking-rest-clock';
import { levelChangeSound } from '@/features/timer/level-change-sound';
import { playLevelChange, playBreakStart, primeAudioOnGesture } from '@/lib/timer-sounds';
import { selectUpcoming, selectRealizados } from './torneio-lists';

// ---------------------------------------------------------------------------
// Timer (ao vivo)
// ---------------------------------------------------------------------------

function TimerView({ tournamentId }: { tournamentId: string }) {
  const navigate = useNavigate();
  // Poll de segurança (5s, igual /tv): jogadores/prêmios não vêm pelo SignalR e, se o hub
  // estiver inacessível, é o poll que traz a virada de nível para o fallback abaixo.
  const { data: tDetail, isLoading } = useTournament(tournamentId, { refetchInterval: 5000 });
  const { state: liveClock } = useTournamentClock(tournamentId);

  // Clock fiel via SignalR; sem 1º sync (level 0) → fallback REST que TICA localmente
  // (segundo a segundo mesmo com o hub fora). Nunca 00:00 mock.
  const hasLive = isLiveClock(liveClock);
  const restClock = useTickingRestClock(
    tDetail
      ? {
          status: tDetail.status,
          currentLevel: tDetail.currentLevel,
          timeRemainingSeconds: tDetail.timeRemainingSeconds,
          blindLevels: tDetail.blindLevels,
          currentLevelStartedAt: tDetail.currentLevelStartedAt,
        }
      : null,
  );
  const clock = hasLive ? liveClock : (restClock ?? liveClock);

  // Som na virada de nível — mesmo handler do /tv (espelha LevelChanged do Blazor). Observa o
  // clock EFETIVO (SignalR ou fallback REST): toca mesmo quando a virada chega só pelo poll.
  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    const sound = levelChangeSound(prevLevelRef.current, clock.level, clock.isBreak);
    prevLevelRef.current = clock.level;
    if (sound === 'break-start') playBreakStart();
    else if (sound === 'level-change') playLevelChange();
  }, [clock.level, clock.isBreak]);

  // Libera o áudio no 1º gesto do usuário (autoplay policy mobile/PWA instalado).
  useEffect(() => {
    primeAudioOnGesture();
  }, []);

  // Controles só para quem pode operar (organizador + delegado) — membro comum via
  // os botões e levava 403 do backend; agora vê apenas o atalho de TV.
  const canOperate = tDetail?.canOperate ?? false;

  // Controles do timer = mutations REST (espelha dashboard.tsx; não reinventa pause/resume).
  // Esta tela só monta com InProgress|Paused → retomar é /resume, nunca /start.
  const resumeMut = useResumeTournament(tournamentId);
  const pauseMut = usePauseTournament(tournamentId);
  const nextMut = useNextLevel(tournamentId);
  const prevMut = usePrevLevel(tournamentId);

  // Feedback de erro nas mutações de controle (o estado de sucesso chega via SignalR).
  const onTimerError = { onError: () => toast.error('Falha ao atualizar o timer') };

  // Wake Lock — mantém a tela ligada enquanto o timer está ativo.
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    let released = false;
    async function acquire() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // silencioso — wake lock pode ser negado (visibilidade, bateria)
      }
    }
    void acquire();
    return () => {
      released = true;
      void wakeLockRef.current?.release().catch(() => {}).finally(() => {
        if (!released) return;
        wakeLockRef.current = null;
      });
    };
  }, []);

  if (isLoading || !tDetail) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { displayLevel, isBreak, remainingSeconds, levelSeconds, paused, blinds, nextBlinds, elapsedPct } = clock;

  // players → shape de UI (mesmo transform de dashboard.tsx, já extraído/testado em tv-projection).
  const table = mapPlayersToTable(tDetail.players);
  const stats = aggregateStats(table);
  const inPlay = table.filter((p) => p.status === 'in');
  const out = eliminatedFromTable(table);

  // Toggle de pausa: pausado → resume (/resume); rodando → pause (/pause).
  const handleTogglePause = () =>
    paused ? resumeMut.mutate(undefined, onTimerError) : pauseMut.mutate(undefined, onTimerError);

  const openTv = () => window.open(`/tv/${tDetail.inviteCode}`, '_blank');

  return (
    <div
      className="flex flex-col min-h-full px-4 pb-24 transition-[background] duration-[var(--dur-slow,320ms)]"
      style={{ background: paused ? 'var(--tv-paused-bg)' : 'var(--tv-bg)' } as CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-3 gap-2">
        <IconButton
          icon={ArrowLeft}
          aria-label="Voltar"
          className="shrink-0"
          onClick={() => navigate(-1)}
        />
        <div className="min-w-0 font-sans font-bold text-base leading-none whitespace-nowrap overflow-hidden text-ellipsis">
          {tDetail.name}
        </div>
        <StatusPill status={paused ? 'paused' : 'live'} className="shrink-0" />
      </div>

      {/* Level label */}
      <div className="text-center mt-[18px]">
        <span
          className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: paused ? 'var(--warning)' : 'var(--emerald-400)' } as CSSProperties}
        >
          {paused ? 'Pausado' : isBreak ? 'Intervalo' : `Nível ${displayLevel}`}
        </span>
      </div>

      {/* Timer — container-query wrapper */}
      <div
        className="flex-1 flex flex-col"
        style={{ containerType: 'inline-size' } as CSSProperties}
      >
        <TimerDisplay
          remainingSeconds={remainingSeconds}
          levelSeconds={levelSeconds}
          paused={paused}
          blinds={blinds}
          nextBlinds={nextBlinds}
          elapsedPct={elapsedPct}
        />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2 mb-3.5">
        <StatTile
          icon={Users}
          value={`${stats.remaining}/${stats.players}`}
          label="Mesa"
          center
          valueSize="15px"
        />
        <StatTile
          icon={Trophy}
          value={<MoneyValue value={tDetail.prizePool} cents={false} color="none" size="15px" />}
          label="Pool"
          tone="emerald"
          center
          valueSize="15px"
        />
        <StatTile
          icon={Repeat}
          value={stats.rebuys}
          label="Rebuys"
          center
          valueSize="15px"
        />
        <StatTile
          icon={Plus}
          value={stats.addons}
          label="Add-on"
          center
          valueSize="15px"
        />
      </div>

      {/* Controls — timer para quem opera; demais têm o atalho de TV */}
      {canOperate ? (
        <>
          <LevelControls
            paused={paused}
            onPrev={() => prevMut.mutate(undefined, onTimerError)}
            onTogglePause={handleTogglePause}
            onNext={() => nextMut.mutate(undefined, onTimerError)}
            onTv={openTv}
          />
          <Button
            variant="primary"
            icon={Settings2}
            block
            className="mt-2"
            onClick={() => navigate('/app/torneio/dashboard')}
          >
            Operar mesa
          </Button>
        </>
      ) : (
        <Button variant="secondary" icon={Tv} block onClick={openTv}>
          Abrir modo TV
        </Button>
      )}

      {/* Participantes — somente leitura */}
      <div className="mt-4">
        {/* Na mesa */}
        <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-[18px] mb-2">
          Na mesa · {inPlay.length}
        </div>
        <Card pad="none">
          {inPlay.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-[9px]"
              style={{
                borderBottom: i < inPlay.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <Avatar name={p.name} size={34} />
              <span className="flex-1 min-w-0 font-sans font-medium text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                {p.name}
              </span>
              {p.rebuys > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground">{p.rebuys}R</span>
              )}
              {p.addons > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground">{p.addons}A</span>
              )}
            </div>
          ))}
        </Card>

        {/* Eliminados */}
        <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-[18px] mb-2">
          Eliminados · {out.length}
        </div>
        <Card pad="none">
          {out.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2 opacity-75"
              style={{
                borderBottom: i < out.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <span className="w-[26px] h-[26px] rounded-[7px] bg-secondary flex items-center justify-center font-mono font-bold text-[11.5px] text-muted-foreground shrink-0">
                {p.place}º
              </span>
              <span className="flex-1 font-sans font-medium text-[13.5px] text-muted-foreground">
                {p.name}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Torneio vazio (sem torneio ao vivo)
// ---------------------------------------------------------------------------

function TorneioVazio({
  tournaments,
  leagueName,
  isOrganizer,
}: {
  tournaments: readonly TournamentDto[] | undefined;
  leagueName: string;
  isOrganizer: boolean;
}) {
  const navigate = useNavigate();
  const upcoming = selectUpcoming(tournaments);
  const realizados = selectRealizados(tournaments);

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* Header */}
      <div className="mb-4 pt-4">
        <div className="font-sans font-bold text-[20px] tracking-[-0.01em]">Torneio</div>
        {leagueName && <div className="text-[12.5px] text-muted-foreground">{leagueName}</div>}
      </div>

      {/* Empty state card */}
      <Card pad="lg">
        <div className="flex flex-col items-center text-center gap-2.5 px-1 py-1.5">
          <div className="w-12 h-12 rounded-[14px] bg-secondary border border-border flex items-center justify-center">
            <TimerOff className="text-muted-foreground w-[22px] h-[22px]" />
          </div>
          <div className="font-sans font-bold text-[15.5px]">Nenhum torneio em andamento</div>
          <div className="text-[13px] text-muted-foreground max-w-[250px] leading-[1.45]">
            Quando um torneio começar, o timer ao vivo aparece aqui.
          </div>
          <div className="h-0.5" />
          {isOrganizer && (
            <Button variant="primary" icon={Plus} onClick={() => navigate('/app/torneio/novo')}>
              Criar torneio
            </Button>
          )}
        </div>
      </Card>

      <div className="h-[18px]" />

      {/* Próximos */}
      <SectionTitle icon={CalendarClock}>Próximos</SectionTitle>
      <div className="flex flex-col gap-2.5 mt-2">
        {upcoming.length === 0 ? (
          <div className="text-[13px] text-muted-foreground px-0.5">Nenhum torneio agendado.</div>
        ) : (
          upcoming.map((u) => (
            <Card
              key={u.id}
              interactive
              pad="md"
              onClick={() => navigate(`/app/torneio/${u.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[15px]">{u.name}</div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5">
                    {new Date(u.scheduledDateTime).toLocaleString('pt-BR')} · {u.playerCount} confirmados
                  </div>
                </div>
                <Badge tone="neutral"><MoneyValue value={u.buyIn} cents={false} color="none" /></Badge>
                {isOrganizer && (
                  <IconButton
                    icon={Pencil}
                    aria-label="Editar torneio"
                    size="sm"
                    variant="solid"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/torneio/novo?edit=1&id=${u.id}`);
                    }}
                    className="shrink-0"
                  />
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="h-[18px]" />

      {/* Realizados */}
      <RealizadosList
        limit={3}
        onSelect={(item) => navigate(`/app/torneio/historico/${item.id}`)}
        items={realizados.map((r) => ({
          id: r.id,
          name: r.name,
          scheduledDateTime: r.scheduledDateTime,
          players: r.playerCount,
          prizePool: r.prizePool,
        }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Router da aba Torneio
// ---------------------------------------------------------------------------

export default function TorneioRoute() {
  const { user } = useAuth();
  const { activeLeagueId } = useActiveLeague();
  const { data: league } = useLeague(activeLeagueId ?? '');
  const { data: tournaments, isLoading } = useTournaments(activeLeagueId ?? '');
  const isOrganizer = isLeagueOrganizer(league, user);

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeT = tournaments?.find(
    (t) => t.status === TournamentStatus.InProgress || t.status === TournamentStatus.Paused,
  );
  const leagueName = tournaments?.[0]?.leagueName ?? '';

  return activeT ? (
    <TimerView tournamentId={activeT.id} />
  ) : (
    <TorneioVazio tournaments={tournaments} leagueName={leagueName} isOrganizer={isOrganizer} />
  );
}
