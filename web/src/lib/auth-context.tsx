import { createContext, useContext, useState, type ReactNode } from 'react';
import { apiUrl } from './api/base';

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clear: () => void;
  isAuthenticated: boolean;
};

const Ctx = createContext<AuthState | null>(null);

const STORAGE_TOKEN = 'ph.token';
const STORAGE_REFRESH = 'ph.refresh_token';
const STORAGE_USER = 'ph.user';

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_USER);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.userId || !parsed.name || !parsed.email) return null;
    return { userId: parsed.userId, name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
}

/**
 * Logout best-effort — revoga o refresh token no servidor. Falhas são engolidas:
 * o cliente já está descartando a sessão; se o backend estiver fora do ar o
 * clear() local precisa prosseguir mesmo assim.
 */
async function revokeRefreshTokenBestEffort(refreshToken: string): Promise<void> {
  try {
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      // keepalive deixa o fire-and-forget sobreviver à navegação de página.
      keepalive: true,
    });
  } catch {
    // ignora — a sessão local já está sendo derrubada
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN));
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(STORAGE_REFRESH),
  );
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const setSession = (accessToken: string, refresh: string, u: AuthUser) => {
    localStorage.setItem(STORAGE_TOKEN, accessToken);
    localStorage.setItem(STORAGE_REFRESH, refresh);
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    setToken(accessToken);
    setRefreshToken(refresh);
    setUser(u);
  };

  const clear = () => {
    const currentRefresh = localStorage.getItem(STORAGE_REFRESH);
    if (currentRefresh) {
      // fire-and-forget; não aguarda — a UI limpa imediatamente.
      void revokeRefreshTokenBestEffort(currentRefresh);
    }
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_USER);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{
        token,
        refreshToken,
        user,
        setSession,
        clear,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside <AuthProvider>');
  return c;
}
