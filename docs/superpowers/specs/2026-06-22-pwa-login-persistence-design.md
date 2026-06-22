# Design — Persistência de login no PWA (fix de roteamento no cold-start)

**Data:** 2026-06-22
**Alvo:** app React em `web/` (PWA via vite-plugin-pwa). Sem mudança de backend.
**Tipo:** correção de bug de roteamento (não é problema de storage).

---

## Causa-raiz (verificada)

A sessão **é** persistida corretamente (`localStorage`: `ph.token`, `ph.refresh_token`,
`ph.user` permanecem após fechar o app). O usuário cai no login a cada cold-start por um
**bug de roteamento**, não por perda de sessão:

1. O manifest PWA tem `start_url: '/'` (`web/vite.config.ts:23`) → o PWA instalado **sempre
   abre em `/`**.
2. **Não há rota para `/`** em `web/src/App.tsx`. A rota cai no catch-all de topo
   `<Route path="*" element={<Navigate to="/login" replace />} />` (`App.tsx:129`).
3. `LoginRoute`/`LoginForm` **não verificam sessão existente** — renderizam o formulário
   mesmo com tokens válidos.

Resultado determinístico: **todo cold-start do PWA → `/login`**, independentemente de haver
sessão válida. Atinge especialmente o PWA instalado (sempre abre em `start_url`), enquanto no
navegador o usuário costuma cair direto em `/app`. Confirmado pelo usuário: **PWA instalado no
Android**.

A parte "manter logado por mais tempo" **já está atendida**: refresh token de 30 dias com
rotação (cada `/api/auth/refresh` emite um novo de 30 dias — uso ativo é praticamente
indefinido; ocioso = 30 dias), e o `api` client renova o access token (15 min) de forma
transparente no primeiro 401. Decisão do usuário: **manter 30 dias** → sem mudança de
backend/JWT.

---

## Escopo

Corrigir o roteamento de cold-start para que a sessão persistida seja efetivamente usada.
**Apenas frontend, apenas `web/src/App.tsx`** (+ testes). Sem mudanças no `AuthProvider`,
sem refresh proativo no boot (descartado pelo usuário "por enquanto"), sem backend, sem
migration.

---

## Design (Abordagem A — fix de roteamento)

Três ajustes em `web/src/App.tsx`:

1. **Guard `PublicOnly`** (novo, simétrico ao `Protected` existente):
   ```tsx
   function PublicOnly({ children }: { children: ReactNode }) {
     const { isAuthenticated } = useAuth();
     return isAuthenticated ? <Navigate to="/app" replace /> : <>{children}</>;
   }
   ```
   Envolve as rotas `/login` e `/cadastro`. Quem já tem sessão nunca mais vê o login no boot.

2. **Rota raiz explícita** para o `start_url: '/'` do PWA:
   ```tsx
   <Route path="/" element={<Navigate to="/app" replace />} />
   ```
   `/app` cai no `Protected`, que decide: com sessão → app; sem → `/login`.

3. **Catch-all de topo** muda de `→ /login` para `→ /app`:
   ```tsx
   <Route path="*" element={<Navigate to="/app" replace />} />
   ```
   Rota desconhecida cai no guard, que decide app vs login — consistente com (2) e evita que
   um 404 jogue um usuário logado para o login.

**Fluxo resultante:**
- Cold-start PWA em `/` → `/app` → `Protected` vê o token persistido → entra direto na liga.
- Sem sessão: `/` → `/app` → `Protected` → `/login`.
- Usuário logado que navegue para `/login` ou `/cadastro` → `PublicOnly` → `/app`.

O `Protected` permanece como está (`isAuthenticated = !!token`): com o access token presente
(mesmo expirado), entra; o primeiro fetch que receber 401 dispara o refresh transparente do
client. Sem mudança no `AuthProvider`.

---

## Não-objetivos (fora de escopo)

- Refresh silencioso no boot / basear o guard no refresh token (Abordagem B) — adiado.
- Alterar lifetimes de JWT (mantém 30 dias).
- Persistência alternativa (cookies httpOnly / IndexedDB) — Android PWA não tem o problema de
  eviction do iOS; localStorage é adequado.

---

## Testes

- Extrair os guards como unidades testáveis (`Protected` já existe; `PublicOnly` novo).
- Vitest + Testing Library com um router de memória e o `AuthProvider`:
  - Com `ph.token` no `localStorage` → renderizar a árvore em `/` resolve para conteúdo de
    `/app` (não o formulário de login); `/login` redireciona para `/app`.
  - Sem token → `/` resolve para `/login`; `/login` renderiza o formulário.
- Seguir os padrões de teste existentes em `web/src/**/*.test.tsx` (ex.: `auth-context.test.tsx`).
- Se testar `App` inteiro for inviável por causa do `BrowserRouter` fixo, extrair o bloco
  `<Routes>` para um componente `AppRoutes` que aceite um router injetável nos testes (mantendo
  `BrowserRouter` no `App` de produção) — melhoria de testabilidade alinhada ao escopo.

## Riscos

- Mudar o catch-all para `/app` faz URLs desconhecidas caírem no guard; para usuário não
  autenticado o efeito final ainda é `/login` (sem regressão), para autenticado vai para
  `/app/ligas` (comportamento desejado).
- Nenhum risco de segurança: os guards apenas redirecionam; nenhuma rota protegida é exposta.
