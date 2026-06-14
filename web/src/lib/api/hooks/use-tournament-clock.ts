import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { type MockClockState, type BlindInfo } from '@/features/timer/use-mock-clock';
import { mockData } from '@/mocks/data';

export interface TimerStateSyncDto {
  seq: number;
  tournamentId: string;
  status: string;
  currentLevel: number;
  currentBlindLevel?: number;
  nextBlindLevel?: number;
  levelEndsAtUtc?: string;
  pausedRemainingSeconds?: number;
  serverNowUtc: string;
}

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

export function useTournamentClock(tournamentId: string) {
  const t = mockData.tournament;
  const levelSeconds = t.levelSeconds;

  const [state, setState] = useState<MockClockState>({
    level: t.level,
    remainingSeconds: t.secondsRemaining,
    levelSeconds,
    paused: true,
    blinds: blindsForLevel(t.level, t.level),
    nextBlinds: blindsForLevel(t.level, t.level + 1),
    elapsedPct: 0,
  });

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const dtoRef = useRef<TimerStateSyncDto | null>(null);
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    if (!tournamentId) return;

    const url = import.meta.env.VITE_API_URL + '/hub/tournaments';
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.on("TimerStateSync", (dto: TimerStateSyncDto) => {
      const serverTime = new Date(dto.serverNowUtc).getTime();
      const localTime = Date.now();
      offsetRef.current = serverTime - localTime;
      dtoRef.current = dto;
    });

    connection.start().then(() => {
      connection.invoke("JoinTorneio", tournamentId).catch(err => {
        console.error("Error joining tournament group:", err);
      });
    }).catch(err => console.error("SignalR start error", err));

    return () => {
      connection.stop();
    };
  }, [tournamentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const dto = dtoRef.current;
      if (!dto) return;

      let remaining = 0;
      let paused = true;

      if (dto.levelEndsAtUtc) {
        const endsAt = new Date(dto.levelEndsAtUtc).getTime();
        const nowServer = Date.now() + offsetRef.current;
        remaining = (endsAt - nowServer) / 1000;
        paused = false;
      } else if (dto.pausedRemainingSeconds !== undefined && dto.pausedRemainingSeconds !== null) {
        remaining = dto.pausedRemainingSeconds;
        paused = true;
      }

      if (remaining < 0) remaining = 0;
      const roundedRemaining = Math.ceil(remaining);

      const currentLevel = dto.currentLevel;
      const blinds = blindsForLevel(t.level, currentLevel);
      const nextBlinds = blindsForLevel(t.level, currentLevel + 1);
      
      let elapsedPct = Math.round((1 - (roundedRemaining / levelSeconds)) * 100);
      if (elapsedPct < 0) elapsedPct = 0;
      if (elapsedPct > 100) elapsedPct = 100;

      setState({
        level: currentLevel,
        remainingSeconds: roundedRemaining,
        levelSeconds,
        paused,
        blinds,
        nextBlinds,
        elapsedPct
      });
    }, 250);

    return () => clearInterval(interval);
  }, [levelSeconds, t.level]);

  // Mock handlers as Phase 4 might implement them later via SignalR
  const togglePause = useCallback(() => {
    console.warn("togglePause not fully implemented with SignalR");
  }, []);

  const nextLevel = useCallback(() => {
    console.warn("nextLevel not fully implemented with SignalR");
  }, []);

  const prevLevel = useCallback(() => {
    console.warn("prevLevel not fully implemented with SignalR");
  }, []);

  return {
    state,
    togglePause,
    nextLevel,
    prevLevel
  };
}
