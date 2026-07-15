import { apiUrl } from './base';

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type ApiOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: Record<string, string>;
};

const STORAGE_TOKEN = 'ph.token';
const STORAGE_REFRESH = 'ph.refresh_token';
const STORAGE_USER = 'ph.user';

/** Mesmo shape de todas as respostas de auth da PokerHub.Api. */
type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
};

/**
 * Promise única de refresh em andamento. Vários 401 concorrentes compartilham
 * a mesma tentativa em vez de competir — o segundo refresh daria 401 porque
 * o primeiro já rotacionou o token no servidor.
 */
let refreshPromise: Promise<AuthResponse> | null = null;

function clearSession() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_REFRESH);
  localStorage.removeItem(STORAGE_USER);
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function performRefresh(): Promise<AuthResponse> {
  const refreshToken = localStorage.getItem(STORAGE_REFRESH);
  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token available.');
  }

  const response = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'Refresh failed.');
  }

  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(STORAGE_TOKEN, data.accessToken);
  localStorage.setItem(STORAGE_REFRESH, data.refreshToken);
  localStorage.setItem(
    STORAGE_USER,
    JSON.stringify({ userId: data.userId, name: data.name, email: data.email }),
  );

  return data;
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    const result = await refreshPromise;
    return result.accessToken;
  }

  refreshPromise = performRefresh();
  try {
    const result = await refreshPromise;
    return result.accessToken;
  } finally {
    refreshPromise = null;
  }
}

async function rawFetch(path: string, opts: ApiOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(apiUrl(`/api${path}`), {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Extrai a melhor mensagem de erro de um corpo de resposta. Suporta o
 * ProblemDetails do ASP.NET Core: `detail` (Results.Problem) e a forma de
 * validação `errors: { campo: [msg, ...] }` (Results.ValidationProblem),
 * caindo para `title` e por fim para o `statusText`.
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body) return body;
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === 'string' && b.detail) return b.detail;
    if (b.errors && typeof b.errors === 'object') {
      const msgs = Object.values(b.errors as Record<string, unknown>)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (msgs.length > 0) return msgs[0];
    }
    if (typeof b.title === 'string' && b.title) return b.title;
    // Endpoints de negócio (ex.: self-register) retornam { message: "..." }.
    if (typeof b.message === 'string' && b.message) return b.message;
  }
  return fallback;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const token = localStorage.getItem(STORAGE_TOKEN);
  let response = await rawFetch(path, opts, token);

  // 401:
  //  - /auth/login   → credencial errada; erro sobe para o form, sem redirect.
  //  - /auth/refresh → o próprio refresh foi rejeitado; limpa + login.
  //  - /auth/logout  → best-effort, ignora.
  //  - resto         → refresh transparente + um retry.
  if (response.status === 401) {
    if (path.startsWith('/auth/login')) {
      // deixa cair no throw abaixo
    } else if (path.startsWith('/auth/refresh')) {
      clearSession();
      redirectToLogin();
    } else if (path.startsWith('/auth/logout')) {
      // ignora
    } else {
      try {
        const newAccessToken = await refreshAccessToken();
        response = await rawFetch(path, opts, newAccessToken);
      } catch {
        clearSession();
        redirectToLogin();
        // segue para lançar o 401 original abaixo
      }
    }
  }

  const body = await readBody(response);

  if (!response.ok) {
    const message = extractErrorMessage(body, response.statusText);
    throw new ApiError(response.status, message, body);
  }

  return body as T;
}
