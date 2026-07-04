/**
 * seed.ts — utilitários de E2E que falam diretamente com a PokerHub.Api (:5100).
 *
 * Estratégia híbrida: o seed pesado (auth, liga, jogadores, torneio, ciclo de vida)
 * vai por API com o JWT do organizer; os testes dirigem a parte crítica pela UI.
 *
 * Cada run usa e-mails ÚNICOS (timestamp + random) — a tabela de usuários persiste
 * entre execuções (banco local isolado), então e-mails fixos colidiriam.
 */
import type { BrowserContext, Page } from '@playwright/test';

export const API = 'http://localhost:5100';
export const PASSWORD = 'E2ePass@123';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
}

export interface SeededPlayer {
  id: string;
  name: string;
}

export interface SeededTournament {
  id: string;
  inviteCode: string;
  leagueId: string;
}

/** PixKeyType.Email no enum do backend (Cpf=0, Cnpj=1, Phone=2, Email=3, Random=4). */
const PIX_KEY_TYPE_EMAIL = 3;

function uniqueEmail(prefix: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e+${prefix}-${stamp}@test.local`;
}

async function apiJson<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Registra um organizer novo e devolve a sessão (tokens + identidade). */
export async function registerOrganizer(prefix = 'org'): Promise<AuthSession> {
  const email = uniqueEmail(prefix);
  return apiJson<AuthSession>('POST', '/api/auth/register', {
    name: `E2E ${prefix}`,
    email,
    password: PASSWORD,
  });
}

/** Cria uma liga sob o organizer informado. */
export async function createLeague(token: string, name: string): Promise<string> {
  const league = await apiJson<{ id: string }>(
    'POST',
    '/api/leagues',
    { name, blockCheckInWithDebt: false },
    token,
  );
  return league.id;
}

/** Cria N jogadores (com chave PIX) na liga. */
export async function createPlayers(
  token: string,
  leagueId: string,
  count: number,
): Promise<SeededPlayer[]> {
  const players: SeededPlayer[] = [];
  for (let i = 1; i <= count; i++) {
    const p = await apiJson<{ id: string; name: string }>(
      'POST',
      `/api/leagues/${leagueId}/players-list`,
      {
        name: `Jogador ${i}`,
        nickname: `P${i}`,
        pixKey: `pix${i}-${Date.now()}@test.local`,
        pixKeyType: PIX_KEY_TYPE_EMAIL,
      },
      token,
    );
    players.push({ id: p.id, name: p.name });
  }
  return players;
}

/** Cria um torneio agendado com `levels` níveis de blind (sempre >= 1). */
export async function createTournament(
  token: string,
  leagueId: string,
  name: string,
  levels = 3,
): Promise<SeededTournament> {
  const blindLevels = Array.from({ length: Math.max(1, levels) }, (_, idx) => {
    const order = idx + 1;
    return {
      order,
      smallBlind: 25 * order,
      bigBlind: 50 * order,
      ante: 0,
      durationMinutes: 15,
      isBreak: false,
      breakDescription: null,
    };
  });

  const t = await apiJson<{ id: string; inviteCode: string }>(
    'POST',
    `/api/leagues/${leagueId}/tournaments`,
    {
      name,
      scheduledDateTime: '2026-06-21T20:00:00Z',
      location: 'E2E',
      buyIn: 50,
      startingStack: 10000,
      rebuyValue: 50,
      rebuyStack: 10000,
      rebuyLimitLevel: null,
      rebuyLimitMinutes: null,
      rebuyLimitType: 0,
      addonValue: null,
      addonStack: null,
      prizeStructure: null,
      prizeDistributionType: 0,
      usePrizeTable: false,
      prizeTableId: null,
      allowCheckInUntilLevel: null,
      blindLevels,
    },
    token,
  );

  return { id: t.id, inviteCode: t.inviteCode, leagueId };
}

/** Adiciona um jogador ao torneio como admin (sem check-in). */
export async function addPlayerToTournament(
  token: string,
  tournamentId: string,
  playerId: string,
): Promise<void> {
  await apiJson<void>(
    'POST',
    `/api/tournaments/${tournamentId}/players`,
    { playerId },
    token,
  );
}

/** Inicia o torneio (Scheduled -> InProgress). */
export async function startTournament(token: string, tournamentId: string): Promise<void> {
  await apiJson<void>('POST', `/api/tournaments/${tournamentId}/start`, undefined, token);
}

/** Check-in de um jogador. */
export async function checkInPlayer(
  token: string,
  tournamentId: string,
  playerId: string,
): Promise<void> {
  await apiJson<void>(
    'POST',
    `/api/tournaments/${tournamentId}/players/${playerId}/checkin`,
    undefined,
    token,
  );
}

/** Avança o nível pelo timer (rota usada pelo botão do dashboard). */
export async function nextLevel(token: string, tournamentId: string): Promise<void> {
  await apiJson<void>(
    'POST',
    `/api/tournaments/${tournamentId}/timer/next-level`,
    undefined,
    token,
  );
}

export interface TournamentDetail {
  id: string;
  status: number;
  currentLevel: number;
  inviteCode: string;
}

/** Lê o detalhe REST do torneio (status/currentLevel/inviteCode). */
export async function getTournamentDetail(
  token: string,
  tournamentId: string,
): Promise<TournamentDetail> {
  return apiJson<TournamentDetail>('GET', `/api/tournaments/${tournamentId}`, undefined, token);
}

/**
 * Injeta a sessão (tokens + user) e a liga ativa no localStorage ANTES de qualquer
 * script da app rodar — replica exatamente o que client.ts/auth-context/league-context leem.
 */
export async function injectSession(
  context: BrowserContext,
  session: AuthSession,
  activeLeagueId?: string,
): Promise<void> {
  const user = { userId: session.userId, name: session.name, email: session.email };
  await context.addInitScript(
    ([token, refresh, userJson, leagueId]) => {
      localStorage.setItem('ph.token', token);
      localStorage.setItem('ph.refresh_token', refresh);
      localStorage.setItem('ph.user', userJson);
      if (leagueId) localStorage.setItem('ph-active-league', leagueId);
    },
    [session.accessToken, session.refreshToken, JSON.stringify(user), activeLeagueId ?? ''] as const,
  );
}

/** Pequena espera por uma condição assíncrona (poll), p/ propagação de estado server-side. */
export async function waitFor(
  predicate: () => Promise<boolean>,
  { timeout = 15_000, interval = 300 }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline) throw new Error('waitFor: timeout');
    await new Promise((r) => setTimeout(r, interval));
  }
}

/** Helper de navegação que garante que a app montou (splash some). */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path);
}
