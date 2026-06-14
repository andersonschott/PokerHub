/**
 * use-mock-clock — relógio mock para o timer do torneio.
 * Usa setInterval 1s, pause/resume, próximo/anterior nível.
 *
 * Interface projetada para Fase 4 (SignalR): a forma do estado
 * { level, remainingSeconds, paused, blinds, nextBlinds } pode ser
 * preenchida por um hook SignalR sem mudar as telas.
 */
import { useState, useEffect, useCallback } from 'react';
import { mockData } from '@/mocks/data';

export interface BlindInfo {
  sb: number;
  bb: number;
  ante: number;
}

export interface MockClockState {
  level: number;
  remainingSeconds: number;
  levelSeconds: number;
  paused: boolean;
  blinds: BlindInfo;
  nextBlinds: BlindInfo;
  elapsedPct: number;
}

/** Round a blind value to nearest 25 for natural-looking progression. */
function roundBlind(v: number): number {
  return Math.round(v / 25) * 25;
}

function blindsForLevel(baseLevel: number, currentLevel: number): BlindInfo {
  const t = mockData.tournament;
  const delta = currentLevel - baseLevel;
  const factor = Math.pow(1.5, delta);
  return {
    sb: roundBlind(t.sb * factor),
    bb: roundBlind(t.bb * factor),
    ante: roundBlind(t.ante * (delta > 0 ? factor : 1)),
  };
}

export function useMockClock() {
  const t = mockData.tournament;

  const [level, setLevel] = useState(t.level);
  const [remainingSeconds, setRemainingSeconds] = useState(t.secondsRemaining);
  const [paused, setPaused] = useState(false);

  // Tick every second while not paused
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          // Level auto-advance on expiry
          setLevel((l) => l + 1);
          return t.levelSeconds;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, t.levelSeconds]);

  // When level changes reset timer
  const handleNextLevel = useCallback(() => {
    setLevel((l) => l + 1);
    setRemainingSeconds(t.levelSeconds);
  }, [t.levelSeconds]);

  const handlePrevLevel = useCallback(() => {
    setLevel((l) => Math.max(1, l - 1));
    setRemainingSeconds(t.levelSeconds);
  }, [t.levelSeconds]);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const blinds = blindsForLevel(t.level, level);
  const nextBlinds = blindsForLevel(t.level, level + 1);
  const elapsedPct = Math.round((1 - remainingSeconds / t.levelSeconds) * 100);

  const state: MockClockState = {
    level,
    remainingSeconds,
    levelSeconds: t.levelSeconds,
    paused,
    blinds,
    nextBlinds,
    elapsedPct,
  };

  return {
    state,
    togglePause,
    nextLevel: handleNextLevel,
    prevLevel: handlePrevLevel,
  };
}

/** Format seconds as MM:SS */
export function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
