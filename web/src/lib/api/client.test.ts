import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiError } from './client';

const STORAGE_TOKEN = 'ph.token';
const STORAGE_REFRESH = 'ph.refresh_token';
const STORAGE_USER = 'ph.user';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api()', () => {
  it('adiciona Authorization quando há token e retorna o body', async () => {
    localStorage.setItem(STORAGE_TOKEN, 'tok-123');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: '1' }]));

    const result = await api<Array<{ id: string }>>('/leagues');

    expect(result).toEqual([{ id: '1' }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('/api/leagues');
    expect((init!.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-123');
  });

  it('lança ApiError com detail do Problem em erro não-401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { detail: 'Conflito de estado.' }));

    const err = await api('/leagues').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).message).toBe('Conflito de estado.');
  });

  it('401 em rota normal: refresca e repete a request com o novo token', async () => {
    localStorage.setItem(STORAGE_TOKEN, 'tok-velho');
    localStorage.setItem(STORAGE_REFRESH, 'refresh-velho');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401)) // GET /leagues com token velho
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: 'tok-novo',
          refreshToken: 'refresh-novo',
          userId: 'u1',
          name: 'Anderson',
          email: 'a@a.com',
        }),
      ) // POST /auth/refresh
      .mockResolvedValueOnce(jsonResponse(200, [])); // retry GET /leagues

    const result = await api('/leagues');

    expect(result).toEqual([]);
    expect(localStorage.getItem(STORAGE_TOKEN)).toBe('tok-novo');
    expect(localStorage.getItem(STORAGE_REFRESH)).toBe('refresh-novo');
    const retryInit = fetchMock.mock.calls[2]![1]!;
    expect((retryInit.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-novo');
  });

  it('dois 401 concorrentes compartilham UM único refresh (anti-corrida)', async () => {
    localStorage.setItem(STORAGE_TOKEN, 'tok-velho');
    localStorage.setItem(STORAGE_REFRESH, 'refresh-velho');

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === '/api/auth/refresh') {
        await new Promise((r) => setTimeout(r, 10));
        return jsonResponse(200, {
          accessToken: 'tok-novo',
          refreshToken: 'refresh-novo',
          userId: 'u1',
          name: 'A',
          email: 'a@a.com',
        });
      }
      return jsonResponse(200, []);
    });
    // As duas primeiras chamadas (rotas normais com token velho) devolvem 401;
    // os `Once` têm precedência sobre o mockImplementation e são consumidos primeiro.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(401));

    await Promise.all([api('/leagues'), api('/leagues/abc')]);

    const refreshCalls = fetchMock.mock.calls.filter(
      ([u]) => String(u) === '/api/auth/refresh',
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('refresh falho limpa a sessão e propaga o 401', async () => {
    localStorage.setItem(STORAGE_TOKEN, 'tok-velho');
    localStorage.setItem(STORAGE_REFRESH, 'refresh-invalido');
    localStorage.setItem(STORAGE_USER, '{"userId":"u1"}');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401)) // rota normal
      .mockResolvedValueOnce(jsonResponse(401)); // refresh rejeitado

    const err = await api('/leagues').catch((e) => e);

    expect((err as ApiError).status).toBe(401);
    // sessão limpa — o redirect via window.location é best-effort (não assertado aqui)
    expect(localStorage.getItem(STORAGE_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_REFRESH)).toBeNull();
    expect(localStorage.getItem(STORAGE_USER)).toBeNull();
  });

  it('401 em /auth/login NÃO tenta refresh — erro sobe para o form', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { detail: 'E-mail ou senha inválidos.' }),
    );

    const err = await api('/auth/login', {
      method: 'POST',
      body: { email: 'x@x.com', password: 'errada' },
    }).catch((e) => e);

    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).message).toBe('E-mail ou senha inválidos.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
