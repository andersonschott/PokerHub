/**
 * /tv/:inviteCode — Timer TV mode (fullscreen, legível a 3m).
 * Port fiel do TimerTV.jsx do kit, agora ligado à API real (Passo 2).
 *
 * - Fullscreen API no mount (com fallback silencioso).
 * - Landscape 3 colunas (prêmios · timer gigante + blinds · jogadores/stats).
 * - ≤900px colapsa painéis laterais (phone propped on the table).
 * - ESC/botão sair → /app/torneio.
 * - Clock REAL via useTournamentClock (SignalR). Sem sync ainda (torneio agendado/pausado, ou
 *   1º sync não chegou) → fallback gracioso derivado do DTO REST; nunca relógio mock nem 00:00 enganoso.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minimize2, Loader2, Users, Trophy, Repeat, Plus } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { StatusPill } from '@/components/ui/status-pill';
import { MoneyValue } from '@/components/ui/money-value';
import { StatTile } from '@/components/ui/stat-tile';
import { ProgressBar } from '@/components/ui/progress-bar';
import { fmtTime } from '@/features/timer/use-mock-clock';
import { levelChangeSound } from '@/features/timer/level-change-sound';
import { nextLevelLabel } from '@/features/timer/next-level-label';
import { useTournamentByInvite } from '@/lib/api/hooks/use-tournaments';
import { useTournamentClock } from '@/lib/api/hooks/use-tournament-clock';
import { useWakeLock } from '@/lib/wake-lock';
import { playLevelChange, playBreakStart, primeAudioOnGesture } from '@/lib/timer-sounds';
import { selectTvLayout, type TvLayout } from './tv-layout';
import {
  mapPlayersToTable,
  aggregateStats,
  normalizePrizes,
  isLiveClock,
  tvPhase,
} from './tv-projection';
import { useTickingRestClock } from './use-ticking-rest-clock';

// ---------------------------------------------------------------------------
// Panel helper
// ---------------------------------------------------------------------------

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div
        className="font-sans font-semibold text-[18px] uppercase tracking-[0.18em] text-muted-foreground pb-3"
        style={{ borderBottom: '1px solid var(--border)' } as CSSProperties}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timer TV
// ---------------------------------------------------------------------------

export default function TvRoute() {
  const navigate = useNavigate();
  const { inviteCode } = useParams<{ inviteCode: string }>();

  // Fetch from API using public invite code endpoint (TournamentDetailDto: players[], blindLevels[], prizes[]).
  // Poll a cada 5s: jogadores ativos e premiação (prize pool/prêmios) não vêm pelo SignalR (só o timer),
  // então o polling os mantém ao vivo na TV (rebuys/eliminações refletem em até 5s).
  const { data: tReal, isLoading, error } = useTournamentByInvite(inviteCode ?? '', {
    refetchInterval: 5000,
  });

  // Clock fiel via SignalR. Id vazio enquanto carrega → hook não conecta (no-op).
  const { state: liveClock } = useTournamentClock(tReal?.id ?? '');

  // Fallback REST que tica localmente (SignalR indisponível → timer continua andando entre polls).
  const restClock = useTickingRestClock(
    tReal
      ? {
          status: tReal.status,
          currentLevel: tReal.currentLevel,
          timeRemainingSeconds: tReal.timeRemainingSeconds,
          blindLevels: tReal.blindLevels,
          currentLevelStartedAt: tReal.currentLevelStartedAt,
        }
      : null,
  );
  const hasLive = isLiveClock(liveClock);
  const clock = hasLive ? liveClock : (restClock ?? liveClock);

  // Som na virada de nível — espelha o handler LevelChanged do Blazor (Public.razor).
  // Observa o clock EFETIVO (SignalR ou fallback REST); nível 0 = loading → não dispara.
  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    const sound = levelChangeSound(prevLevelRef.current, clock.level, clock.isBreak);
    prevLevelRef.current = clock.level;
    if (sound === 'break-start') playBreakStart();
    else if (sound === 'level-change') playLevelChange();
  }, [clock.level, clock.isBreak]);

  // Responsive — wide (≥900px, grid 3-col) · landscape-compact (mini-TV) · portrait (empilhado).
  const [layout, setLayout] = useState<TvLayout>(() =>
    selectTvLayout(
      window.matchMedia('(max-width: 900px)').matches,
      window.matchMedia('(orientation: portrait)').matches,
    ),
  );

  useEffect(() => {
    const mqNarrow = window.matchMedia('(max-width: 900px)');
    const mqPortrait = window.matchMedia('(orientation: portrait)');
    const update = () => setLayout(selectTvLayout(mqNarrow.matches, mqPortrait.matches));
    mqNarrow.addEventListener('change', update);
    mqPortrait.addEventListener('change', update);
    return () => {
      mqNarrow.removeEventListener('change', update);
      mqPortrait.removeEventListener('change', update);
    };
  }, []);
  const compact = layout === 'landscape-compact';

  // Mantém a tela acesa enquanto a TV está aberta (porta do wakelock.js do Blazor).
  useWakeLock(true);

  // Libera o áudio no 1º gesto do usuário (autoplay policy mobile).
  useEffect(() => {
    primeAudioOnGesture();
  }, []);

  // Fullscreen estilo Blazor: tocar na tela alterna tela cheia (entra/sai).
  // Sem auto-fullscreen no mount — browsers bloqueiam sem gesto; o tap garante o gesto
  // do usuário (e também é o gesto que libera o áudio via primeAudioOnGesture).
  function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // Sair da TV com segurança. A /tv é rota PÚBLICA e costuma abrir em nova aba (window.open),
  // então NÃO navegamos para uma rota protegida (cairia no /login). Saímos do fullscreen e
  // fechamos a aba; se ela não foi aberta por script, voltamos no histórico como fallback.
  function handleExit() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    window.close();
    setTimeout(() => {
      if (!window.closed) navigate(-1);
    }, 120);
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--tv-bg)] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !tReal) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-[var(--tv-bg)] text-muted-foreground">
        <p>Torneio não encontrado ou acesso inválido.</p>
        <button onClick={handleExit} className="underline hover:text-foreground">Voltar</button>
      </div>
    );
  }

  // ---- Derived state from real data ----------------------------------------
  const { displayLevel, isBreak, remainingSeconds, paused, blinds, nextBlinds, nextIsBreak, elapsedPct } = clock;
  const phase = tvPhase(tReal.status, hasLive);

  const table = mapPlayersToTable(tReal.players);
  const stats = aggregateStats(table);
  const inPlay = table.filter((p) => p.status === 'in');
  const prizes = normalizePrizes(tReal.prizes);

  const podiumColors = [
    'var(--podium-gold)',
    'var(--podium-silver)',
    'var(--podium-bronze)',
  ];

  // ---------------------------------------------------------------------------
  // Portrait (celular em pé) — modelo da aba Torneio: hero ocupa 100% da altura,
  // barra de progresso + 4 indicadores. Timer por vw → SEMPRE cabe na largura.
  // Tocar na tela alterna fullscreen (estilo Blazor).
  // ---------------------------------------------------------------------------
  if (layout === 'portrait') {
    return (
      <div
        onClick={toggleFullscreen}
        className="fixed inset-0 z-[100] flex flex-col text-foreground"
        style={{
          background: paused ? 'var(--tv-paused-bg)' : 'var(--tv-bg)',
          transition: 'background var(--dur-slow, 320ms)',
          paddingBottom: 'var(--safe-bottom, 0px)',
        } as CSSProperties}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 pb-3 shrink-0"
          style={{
            paddingTop: 'calc(14px + var(--safe-top, 0px))',
            borderBottom: '1px solid var(--border)',
          } as CSSProperties}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="shrink-0 rounded-xl flex items-center justify-center text-primary-foreground"
              style={{
                width: 34,
                height: 34,
                background: 'linear-gradient(160deg, var(--gold-400), var(--gold-600))',
                fontSize: 18,
              } as CSSProperties}
            >
              ♠
            </div>
            <div className="font-sans font-bold text-[17px] tracking-[-0.02em] truncate">
              {tReal.name}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <StatusPill status={paused ? 'paused' : 'live'} />
            <IconButton
              icon={Minimize2}
              aria-label="Sair do modo TV"
              variant="solid"
              onClick={(e) => {
                e.stopPropagation();
                handleExit();
              }}
            />
          </div>
        </div>

        {/* Hero — preenche 100% do espaço restante */}
        <div
          className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-3 px-5 relative"
          style={{ containerType: 'inline-size' } as CSSProperties}
        >
          {/* Suit watermark */}
          <div
            aria-hidden
            className="absolute pointer-events-none select-none font-serif opacity-[0.025]"
            style={{ fontSize: 'min(90cqi, 420px)', color: 'var(--suit-dark)' } as CSSProperties}
          >
            ♠
          </div>

          <div
            className="font-sans font-bold uppercase tracking-[0.3em] relative"
            style={{
              fontSize: 'clamp(15px, 5vw, 24px)',
              color: paused ? 'var(--warning)' : 'var(--emerald-400)',
            } as CSSProperties}
          >
            {paused ? 'Pausado' : isBreak ? 'Intervalo' : `Nível ${displayLevel}`}
          </div>

          {phase === 'live' ? (
            <div
              className="font-mono font-bold tabular-nums whitespace-nowrap leading-[0.9] tracking-[-0.04em] relative"
              style={{
                fontSize: 'clamp(72px, 27vw, 220px)',
                color: paused ? 'var(--warning)' : 'var(--foreground)',
              } as CSSProperties}
            >
              {fmtTime(remainingSeconds)}
            </div>
          ) : (
            <div
              className="font-sans font-bold leading-[1.05] tracking-[-0.02em] text-muted-foreground relative"
              style={{ fontSize: 'clamp(30px, 8vw, 60px)' } as CSSProperties}
            >
              {phase === 'waiting' ? 'Aguardando início' : 'Torneio encerrado'}
            </div>
          )}

          <div
            className="font-mono font-bold text-gold-400 whitespace-nowrap tracking-[-0.02em] relative"
            style={{ fontSize: 'clamp(28px, 12vw, 64px)' } as CSSProperties}
          >
            {blinds.sb} / {blinds.bb}
          </div>
          <div
            className="font-mono whitespace-nowrap text-muted-foreground relative"
            style={{ fontSize: 'clamp(13px, 3.6vw, 18px)' } as CSSProperties}
          >
            ante {blinds.ante}
          </div>

          {/* Barra de progresso do nível */}
          {phase === 'live' && (
            <div className="w-full max-w-[440px] mt-2 relative">
              <ProgressBar value={elapsedPct} tone={paused ? 'warning' : 'emerald'} size="lg" />
              <div
                className="flex justify-between mt-2 font-mono text-muted-foreground"
                style={{ fontSize: 'clamp(12px, 3.4vw, 16px)' } as CSSProperties}
              >
                <span>próximo: {nextLevelLabel(nextBlinds, nextIsBreak)}</span>
                <span>em {fmtTime(remainingSeconds)}</span>
              </div>
            </div>
          )}

          {/* Premiação por posição — ocupa o espaço livre, sem rolagem */}
          {prizes.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 relative w-full max-w-[460px]">
              {prizes.map((p) => (
                <div
                  key={p.position}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card"
                  style={{ border: '1px solid var(--border)' } as CSSProperties}
                >
                  <span
                    className="font-mono font-bold text-[13px]"
                    style={{ color: podiumColors[p.position - 1] ?? 'var(--muted-foreground)' } as CSSProperties}
                  >
                    {p.position}º
                  </span>
                  <MoneyValue value={p.amount} cents={false} color="none" size="14px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicadores — Mesa · Pool · Rebuys · Add-on */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-4 shrink-0">
          <StatTile icon={Users} value={`${stats.remaining}/${stats.players}`} label="Mesa" center valueSize="15px" />
          <StatTile
            icon={Trophy}
            value={<MoneyValue value={tReal.prizePool} cents={false} color="none" size="15px" />}
            label="Pool"
            tone="emerald"
            center
            valueSize="15px"
          />
          <StatTile icon={Repeat} value={stats.rebuys} label="Rebuys" center valueSize="15px" />
          <StatTile icon={Plus} value={stats.addons} label="Add-on" center valueSize="15px" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={toggleFullscreen}
      className="fixed inset-0 z-[100] overflow-hidden text-foreground"
      style={{
        background: paused ? 'var(--tv-paused-bg)' : 'var(--tv-bg)',
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '0.85fr 1.9fr 0.85fr',
        gridTemplateRows: compact ? 'auto 1fr auto' : 'auto 1fr',
        gap: compact ? '20px' : '40px',
        padding: compact
          ? '20px 20px calc(20px + var(--safe-bottom, 0px))'
          : '36px 48px',
        transition: 'background var(--dur-slow, 320ms)',
      } as CSSProperties}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header — full width                                                */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex items-center justify-between gap-3 pb-3.5 md:pb-[18px]"
        style={{
          gridColumn: '1 / -1',
          borderBottom: '1px solid var(--border)',
        } as CSSProperties}
      >
        {/* Logo + tournament name */}
        <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
          <div
            className="shrink-0 rounded-xl md:rounded-[12px] flex items-center justify-center text-primary-foreground"
            style={{
              width: compact ? 36 : 44,
              height: compact ? 36 : 44,
              background: 'linear-gradient(160deg, var(--gold-400), var(--gold-600))',
              fontSize: compact ? 19 : 24,
            } as CSSProperties}
          >
            ♠
          </div>
          <div
            className="font-sans font-bold tracking-[-0.02em] whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: compact ? 19 : 30 } as CSSProperties}
          >
            {tReal.name}
          </div>
        </div>

        {/* Status + exit */}
        <div className="flex items-center shrink-0" style={{ gap: compact ? 10 : 20 } as CSSProperties}>
          <StatusPill status={paused ? 'paused' : 'live'} />
          <IconButton
            icon={Minimize2}
            aria-label="Sair do modo TV"
            variant="solid"
            onClick={(e) => {
              e.stopPropagation();
              handleExit();
            }}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Left panel — prizes (desktop only). Lista vazia → coluna preservada */}
      {/* ------------------------------------------------------------------ */}
      {!compact && (
        prizes.length > 0 ? (
          <Panel title="Premiação">
            {/* Prize pool hero */}
            <div
              className="rounded-[20px] p-6 text-center"
              style={{
                background:
                  'linear-gradient(150deg, color-mix(in oklab, var(--emerald-500) 12%, transparent), transparent)',
                border:
                  '1px solid color-mix(in oklab, var(--emerald-500) 28%, transparent)',
              } as CSSProperties}
            >
              <div className="text-base text-muted-foreground uppercase tracking-[0.1em] mb-1">
                Prize pool
              </div>
              <MoneyValue value={tReal.prizePool} cents={false} color="none" size="46px" />
            </div>

            {/* Per-position prizes */}
            {prizes.map((p) => {
              const ring = podiumColors[p.position - 1] ?? 'var(--secondary)';
              return (
                <div
                  key={p.position}
                  className="flex items-center gap-4 px-[18px] py-4 rounded-2xl bg-card"
                  style={{ border: '1px solid var(--border)' } as CSSProperties}
                >
                  <span
                    className="shrink-0 rounded-xl flex items-center justify-center font-mono font-bold text-[20px]"
                    style={{
                      width: 44,
                      height: 44,
                      background: ring,
                      color: 'var(--felt-950)',
                    } as CSSProperties}
                  >
                    {p.position}º
                  </span>
                  <div className="flex-1">
                    <MoneyValue value={p.amount} cents={false} color="none" size="26px" />
                  </div>
                  <span className="font-mono text-[17px] text-muted-foreground">
                    {p.pct}%
                  </span>
                </div>
              );
            })}
          </Panel>
        ) : (
          // Sem premiação calculada (prize pool zerado): esconde o painel, mantém o grid 3-col.
          <div aria-hidden />
        )
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Center — timer dominante                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex flex-col items-center justify-center gap-2 relative min-w-0"
        style={{ containerType: 'inline-size' } as CSSProperties}
      >
        {/* Suit watermark */}
        <div
          aria-hidden
          className="absolute pointer-events-none select-none font-serif opacity-[0.025]"
          style={{
            fontSize: 'min(110cqi, 520px)',
            color: 'var(--suit-dark)',
          } as CSSProperties}
        >
          ♠
        </div>

        {/* Level label */}
        <div
          className="font-sans font-bold uppercase tracking-[0.3em] text-emerald-400"
          style={{ fontSize: 'clamp(20px, 5cqi, 34px)' } as CSSProperties}
        >
          {isBreak ? 'Intervalo' : `Nível ${displayLevel}`}
        </div>

        {/* Countdown (ao vivo) ou estado da fase (aguardando / encerrado) */}
        {phase === 'live' ? (
          <div
            className="font-mono font-bold tabular-nums whitespace-nowrap leading-[0.9] tracking-[-0.04em]"
            style={{
              fontSize: 'clamp(88px, 33cqi, 300px)',
              color: paused ? 'var(--warning)' : 'var(--foreground)',
            } as CSSProperties}
          >
            {fmtTime(remainingSeconds)}
          </div>
        ) : (
          <div
            className="font-sans font-bold whitespace-nowrap leading-[1] tracking-[-0.02em] text-muted-foreground text-center"
            style={{ fontSize: 'clamp(36px, 9cqi, 110px)' } as CSSProperties}
          >
            {phase === 'waiting' ? 'Aguardando início' : 'Torneio encerrado'}
          </div>
        )}

        {/* Current blinds */}
        <div
          className="font-mono font-bold text-gold-400 whitespace-nowrap tracking-[-0.02em] mt-2"
          style={{ fontSize: 'clamp(40px, 16cqi, 120px)' } as CSSProperties}
        >
          {blinds.sb} / {blinds.bb}
        </div>

        {/* Ante + next level */}
        <div
          className="font-mono whitespace-nowrap text-muted-foreground"
          style={{ fontSize: 'clamp(17px, 3.8cqi, 30px)' } as CSSProperties}
        >
          ante {blinds.ante} · próximo {nextLevelLabel(nextBlinds, nextIsBreak)}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right panel — players + stats (desktop only)                      */}
      {/* ------------------------------------------------------------------ */}
      {!compact && (
        <Panel title="Mesa">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { v: `${stats.remaining}/${stats.players}`, l: 'Jogadores' },
              { v: stats.rebuys, l: 'Rebuys' },
              { v: stats.addons, l: 'Add-ons' },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 text-center bg-card"
                style={{ border: '1px solid var(--border)' } as CSSProperties}
              >
                <div className="font-mono font-bold tracking-[-0.02em] text-[38px] leading-none">
                  {s.v}
                </div>
                <div className="text-[14px] text-muted-foreground uppercase tracking-[0.06em] mt-1">
                  {s.l}
                </div>
              </div>
            ))}
            <div
              className="rounded-2xl p-5 text-center bg-card"
              style={{ border: '1px solid var(--border)' } as CSSProperties}
            >
              <div className="font-mono font-bold tracking-[-0.02em] text-[38px] leading-none">
                <MoneyValue value={tReal.buyIn} cents={false} size="38px" />
              </div>
              <div className="text-[14px] text-muted-foreground uppercase tracking-[0.06em] mt-1">
                Buy-in
              </div>
            </div>
          </div>

          {/* Jogadores ativos (ao vivo) */}
          <div
            className="rounded-2xl p-5 flex-1 min-h-0 bg-card flex flex-col"
            style={{ border: '1px solid var(--border)' } as CSSProperties}
          >
            <div className="text-[14px] text-muted-foreground uppercase tracking-[0.06em] mb-3">
              Jogadores ativos
            </div>
            <div className="flex flex-col gap-2.5 overflow-y-auto">
              {inPlay.length === 0 ? (
                <div className="text-[15px] text-muted-foreground">Ninguém na mesa.</div>
              ) : (
                inPlay.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{ background: 'var(--emerald-400)' } as CSSProperties}
                    />
                    <span className="font-sans font-semibold text-[19px] flex-1 min-w-0 truncate">
                      {p.name}
                    </span>
                    {p.rebuys > 0 ? (
                      <span className="font-mono text-[15px] text-muted-foreground shrink-0">
                        {p.rebuys}R
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Compact footer — essentials under timer (phone/narrow)            */}
      {/* ------------------------------------------------------------------ */}
      {compact && (
        <div
          className="flex items-center justify-center gap-6 pb-2 font-mono text-[15px] text-muted-foreground whitespace-nowrap"
        >
          <span>
            {stats.remaining}/{stats.players} na mesa
          </span>
          <span className="text-emerald-400">
            <MoneyValue value={tReal.prizePool} cents={false} color="none" className="text-emerald-400" />{' '}pool
          </span>
        </div>
      )}
    </div>
  );
}
