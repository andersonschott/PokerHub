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
import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minimize2, Loader2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { StatusPill } from '@/components/ui/status-pill';
import { MoneyValue } from '@/components/ui/money-value';
import { fmtTime } from '@/features/timer/use-mock-clock';
import { useTournamentByInvite } from '@/lib/api/hooks/use-tournaments';
import { useTournamentClock } from '@/lib/api/hooks/use-tournament-clock';
import {
  mapPlayersToTable,
  aggregateStats,
  normalizePrizes,
  restFallbackClock,
  isLiveClock,
  tvPhase,
} from './tv-projection';

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

  // Responsive — collapse side panels on narrow viewports (≤900px).
  const [compact, setCompact] = useState(
    () => window.matchMedia('(max-width: 900px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fullscreen API — best-effort, silent on error.
  useEffect(() => {
    const el = document.documentElement;
    if (!document.fullscreenEnabled) return;
    void el.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // ESC keyboard shortcut → exit TV.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        navigate('/app/torneio');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  function handleExit() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    navigate('/app/torneio');
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
  const hasLive = isLiveClock(liveClock);
  const clock = hasLive
    ? liveClock
    : restFallbackClock({
        status: tReal.status,
        currentLevel: tReal.currentLevel,
        timeRemainingSeconds: tReal.timeRemainingSeconds,
        blindLevels: tReal.blindLevels,
      });
  const { displayLevel, isBreak, remainingSeconds, paused, blinds, nextBlinds } = clock;
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

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden text-foreground"
      style={{
        background: paused ? 'var(--tv-paused-bg)' : 'var(--tv-bg)',
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '1fr 1.6fr 1fr',
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
            onClick={handleExit}
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
          style={{ fontSize: 'clamp(18px, 5cqi, 28px)' } as CSSProperties}
        >
          {isBreak ? 'Intervalo' : `Nível ${displayLevel}`}
        </div>

        {/* Countdown (ao vivo) ou estado da fase (aguardando / encerrado) */}
        {phase === 'live' ? (
          <div
            className="font-mono font-bold tabular-nums whitespace-nowrap leading-[0.9] tracking-[-0.04em]"
            style={{
              fontSize: 'clamp(72px, 33cqi, 240px)',
              color: paused ? 'var(--warning)' : 'var(--foreground)',
            } as CSSProperties}
          >
            {fmtTime(remainingSeconds)}
          </div>
        ) : (
          <div
            className="font-sans font-bold whitespace-nowrap leading-[1] tracking-[-0.02em] text-muted-foreground text-center"
            style={{ fontSize: 'clamp(32px, 9cqi, 96px)' } as CSSProperties}
          >
            {phase === 'waiting' ? 'Aguardando início' : 'Torneio encerrado'}
          </div>
        )}

        {/* Current blinds */}
        <div
          className="font-mono font-bold text-gold-400 whitespace-nowrap tracking-[-0.02em] mt-2"
          style={{ fontSize: 'clamp(32px, 14cqi, 96px)' } as CSSProperties}
        >
          {blinds.sb} / {blinds.bb}
        </div>

        {/* Ante + next level */}
        <div
          className="font-mono whitespace-nowrap text-muted-foreground"
          style={{ fontSize: 'clamp(15px, 3.6cqi, 26px)' } as CSSProperties}
        >
          ante {blinds.ante} · próximo {nextBlinds.sb}/{nextBlinds.bb}
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
