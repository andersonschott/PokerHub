/**
 * Lightweight context that tracks the "active league" (the one shown in Home).
 * Persisted to localStorage('ph-active-league') so the choice survives reload.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'ph-active-league';

type LeagueContextState = {
  activeLeagueId: string | null;
  setActiveLeagueId: (id: string) => void;
};

const Ctx = createContext<LeagueContextState | null>(null);

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function ActiveLeagueProvider({ children }: { children: ReactNode }) {
  const [activeLeagueId, setActiveLeagueIdState] = useState<string | null>(readStored);

  const setActiveLeagueId = (id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable — keep in memory
    }
    setActiveLeagueIdState(id);
  };

  return (
    <Ctx.Provider value={{ activeLeagueId, setActiveLeagueId }}>{children}</Ctx.Provider>
  );
}

export function useActiveLeague(): LeagueContextState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useActiveLeague must be inside <ActiveLeagueProvider>');
  return c;
}
