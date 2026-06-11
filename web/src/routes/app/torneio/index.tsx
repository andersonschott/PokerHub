/**
 * /app/torneio — Tab Torneio.
 * Se a liga ativa tem torneio ao vivo → timer com mock-clock.
 * Se não → agenda vazia + próximos + realizados (port de PHTorneioVazio + PHTimerTab).
 *
 * Fontes: Timer.jsx, DesktopTorneio.jsx.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Plus, TimerOff, Users, Trophy, Repeat } from 'lucide-react';
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
import { useMockClock } from '@/features/timer/use-mock-clock';
import { mockData } from '@/mocks/data';

// ---------------------------------------------------------------------------
// Timer (ao vivo)
// ---------------------------------------------------------------------------

function TimerView() {
  const navigate = useNavigate();
  const { state, togglePause, nextLevel, prevLevel } = useMockClock();
  const { level, remainingSeconds, levelSeconds, paused, blinds, nextBlinds, elapsedPct } = state;
  const t = mockData.tournament;

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

  const inPlay = mockData.table.filter((p) => p.status === 'in');
  const out = mockData.table.filter((p) => p.status === 'out').sort((a, b) => (a.place ?? 99) - (b.place ?? 99));

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
          {t.name}
        </div>
        <StatusPill status={paused ? 'paused' : 'live'} className="shrink-0" />
      </div>

      {/* Level label */}
      <div className="text-center mt-[18px]">
        <span
          className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: paused ? 'var(--warning)' : 'var(--emerald-400)' } as CSSProperties}
        >
          {paused ? 'Pausado' : `Nível ${level}`}
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
          value={`${t.remaining}/${t.players}`}
          label="Mesa"
          center
          valueSize="15px"
        />
        <StatTile
          icon={Trophy}
          value={<MoneyValue value={t.prizePool} cents={false} color="none" size="15px" />}
          label="Pool"
          tone="emerald"
          center
          valueSize="15px"
        />
        <StatTile
          icon={Repeat}
          value={t.rebuys}
          label="Rebuys"
          center
          valueSize="15px"
        />
        <StatTile
          icon={Plus}
          value={t.addons}
          label="Add-on"
          center
          valueSize="15px"
        />
      </div>

      {/* Controls */}
      <LevelControls
        paused={paused}
        onPrev={prevLevel}
        onTogglePause={togglePause}
        onNext={nextLevel}
        onTv={() => navigate('/app/tv')}
      />

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

function TorneioVazio() {
  const navigate = useNavigate();
  const d = mockData;
  const upcoming = d.upcoming.filter((u) => u.status !== 'live');

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* Header */}
      <div className="mb-4 pt-4">
        <div className="font-sans font-bold text-[20px] tracking-[-0.01em]">Torneio</div>
        <div className="text-[12.5px] text-muted-foreground">{d.league.name}</div>
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
          <Button variant="primary" icon={Plus} onClick={() => navigate('/app/torneio/novo')}>
            Criar torneio
          </Button>
        </div>
      </Card>

      <div className="h-[18px]" />

      {/* Próximos */}
      <SectionTitle icon={CalendarClock}>Próximos</SectionTitle>
      <div className="flex flex-col gap-2.5 mt-2">
        {upcoming.map((u, i) => (
          <Card key={i} pad="md">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-sans font-semibold text-[15px]">{u.name}</div>
                <div className="text-[12.5px] text-muted-foreground mt-0.5">
                  {u.when} · {u.confirmed} confirmados
                </div>
              </div>
              <Badge tone="neutral"><MoneyValue value={u.buyIn} cents={false} color="none" /></Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="h-[18px]" />

      {/* Realizados */}
      <RealizadosList limit={3} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Router da aba Torneio
// ---------------------------------------------------------------------------

export default function TorneioRoute() {
  const live = mockData.league.live;
  return live ? <TimerView /> : <TorneioVazio />;
}
