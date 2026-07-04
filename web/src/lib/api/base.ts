/**
 * Resolve a URL base da API.
 * Dev: proxy do Vite encaminha /api -> http://localhost:5100, VITE_API_BASE_URL fica vazio.
 * Prod (SWA + Container App): VITE_API_BASE_URL aponta para a origem da API.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') as string;

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
