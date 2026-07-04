/**
 * use-ticking-rest-clock — fallback REST que TICA localmente, segundo a segundo.
 *
 * O `restFallbackClock` puro é uma foto: exibe o timeRemainingSeconds do DTO e congela até o
 * próximo refetch. Sem SignalR (ex.: hub inacessível em produção), isso aparecia como timer
 * "pulando" a cada poll em vez de contar segundo a segundo. Este hook ancora a foto em
 * Date.now() no momento em que o DTO chega e projeta o restante a cada 250ms, igual à
 * projeção do clock SignalR — o timer anda sozinho entre polls.
 *
 * Só decrementa quando o torneio está InProgress (pausado/agendado ficam congelados, como no
 * restFallbackClock). Clamp em 0: a virada de nível continua vindo do servidor (SignalR ou
 * próximo poll) — o fallback nunca inventa nível.
 */
import { useEffect, useReducer, useRef } from 'react';
import { type MockClockState } from '@/features/timer/use-mock-clock';
import { TournamentStatus } from '@/lib/api/hooks/use-tournaments';
import { restFallbackClock, type RestClockInput } from './tv-projection';

/** Projeta a foto REST `base` após `elapsedSeconds` locais (pura, testável). */
export function tickRestClock(base: MockClockState, elapsedSeconds: number): MockClockState {
  if (base.paused) return base;
  return withRemaining(base, Math.ceil(base.remainingSeconds - elapsedSeconds));
}

/**
 * Projeta a foto REST a partir da âncora ABSOLUTA do servidor (currentLevelStartedAt):
 * remaining = duração − (agora − início do nível). Preferível a decrementar o
 * timeRemainingSeconds: o TournamentTimerService só persiste o remaining a cada 10s
 * (0–10s defasado no GET), mas persiste a âncora IMEDIATAMENTE em toda virada de nível
 * e controle manual — foi a causa do drift dashboard×TV quando o operar caía no fallback.
 * Erro residual = offset de relógio do aparelho (NTP), não a defasagem de persistência.
 */
export function anchorRestClock(
  base: MockClockState,
  levelStartedAtUtc: string,
  nowMs: number,
): MockClockState {
  if (base.paused) return base;
  const startedMs = parseUtc(levelStartedAtUtc);
  if (Number.isNaN(startedMs)) return base;
  return withRemaining(base, Math.ceil(base.levelSeconds - (nowMs - startedMs) / 1000));
}

/**
 * O backend persiste CurrentLevelStartedAt com Kind=Unspecified e o JSON sai SEM 'Z'
 * (diferente do LevelEndsAtUtc do hub, que recebe SpecifyKind). Sem sufixo/offset o
 * Date.parse interpretaria como hora LOCAL (erro de 3h no Brasil) — força UTC.
 */
function parseUtc(iso: string): number {
  const hasOffset = iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso);
  return Date.parse(hasOffset ? iso : `${iso}Z`);
}

function withRemaining(base: MockClockState, remainingRaw: number): MockClockState {
  // Clamp em [0, duração]: nunca inventa nível (virada vem do servidor) nem mostra mais
  // tempo que o nível tem (relógio do aparelho adiantado).
  const remaining = Math.min(Math.max(0, remainingRaw), base.levelSeconds || remainingRaw);
  let elapsedPct =
    base.levelSeconds > 0 ? Math.round((1 - remaining / base.levelSeconds) * 100) : 0;
  if (elapsedPct < 0) elapsedPct = 0;
  if (elapsedPct > 100) elapsedPct = 100;

  return { ...base, remainingSeconds: remaining, elapsedPct };
}

export function useTickingRestClock(rest: RestClockInput | null): MockClockState | null {
  const [, bump] = useReducer((x: number) => x + 1, 0);

  // Âncora local (plano B, sem currentLevelStartedAt): re-ancora quando a foto REST muda.
  const key = rest ? `${rest.status}|${rest.currentLevel}|${rest.timeRemainingSeconds}` : '';
  const anchorRef = useRef({ key, atMs: Date.now() });
  if (anchorRef.current.key !== key) anchorRef.current = { key, atMs: Date.now() };

  const running = rest?.status === TournamentStatus.InProgress;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(bump, 250);
    return () => clearInterval(id);
  }, [running]);

  if (!rest) return null;
  const base = restFallbackClock(rest);
  if (rest.currentLevelStartedAt) {
    return anchorRestClock(base, rest.currentLevelStartedAt, Date.now());
  }
  const elapsed = (Date.now() - anchorRef.current.atMs) / 1000;
  return tickRestClock(base, elapsed);
}
