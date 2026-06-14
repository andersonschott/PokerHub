# Fase 1+ — Front completo (web/) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `web/` (Vite + React 19 + TS strict + Tailwind v4) implementando o **design system "clube privado à meia-noite"** (handoff em `docs/design-system/`) com **todas as telas do UI kit** — tema escuro (padrão) e claro, responsivo mobile (375) → desktop (1200) — mock-first: auth + ligas ligados na API real da Fase 0; demais telas com dados mock tipados, prontas para ligar na API fase a fase.

**Architecture:** SPA em `web/` no monorepo. **Fonte de verdade visual: `docs/design-system/`** (readme.md = guia completo; `tokens/*.css` = tokens oklch; `components/*/*.jsx` = primitives de referência; `ui_kits/pokerhub_app/*.jsx` = telas mock de alta fidelidade a portar; `ui_kits/pokerhub_app/README.md` = comportamento esperado de cada tela). Infra de auth espelha o health-system (`/home/aschott/Projects/health-system/web`). API Fase 0 em `http://localhost:5100`, CORS para `:5173`. Contrato de auth (camelCase): `POST /api/auth/register {name,email,password}`, `/api/auth/login {email,password}`, `/api/auth/refresh {refreshToken}`, `/api/auth/logout {refreshToken}` → `AuthResponse {accessToken, refreshToken, userId, name, email}`; Ligas: `GET/POST /api/leagues`, `GET /api/leagues/{id}`, `GET /api/leagues/{id}/players`, `PUT/DELETE /api/leagues/{id}`, `POST /api/leagues/join/{inviteCode}`, `POST /api/leagues/{id}/leave`, `POST /api/leagues/{id}/regenerate-invite`.

**Decisões de tema (handoff 2026-06-11, confirmadas com o usuário):**
- Tema **escuro = padrão** (tokens `:root` de `docs/design-system/tokens/colors.css`), claro opt-in via `[data-theme="light"]`, persistido em `localStorage('ph-theme')` e aplicado **antes do paint** (script inline no index.html — sem flash).
- Tema claro de produção = paleta **"Clube diurno"** (bloco `html[data-palette="clube"]` de `docs/design-system/ui_kits/pokerhub_app/palettes.css`) **fixada** como o `[data-theme="light"]` único (sem mecanismo data-palette).
- Accent **"ouro" fixado** como rampa dourada canônica nos dois temas (valores do bloco `data-accent="ouro"` do palettes.css): dark `--gold-400: oklch(0.820 0.130 84); --gold-500: oklch(0.770 0.142 80); --gold-600: oklch(0.700 0.148 74);` · light `--gold-400: oklch(0.580 0.135 76); --gold-500: oklch(0.620 0.140 78); --gold-600: oklch(0.520 0.140 72);` (sem mecanismo data-accent).
- O protótipo verde-feltro antigo (`~/Projects/pokerhub/`) está **superado** pelo design system — não copiar nada visual de lá.

**Regras de port (kit JSX → produção TSX) — valem para TODAS as tasks de tela:**
1. TypeScript strict, arquivos kebab-case, componentes com named export, rotas com default export.
2. CSS-in-JS injetado (`const CSS = ...`) e `style={{...}}` inline → utilities Tailwind v4 mapeadas aos tokens via `@theme inline` (ex.: `bg-card`, `text-gold-400`, `font-mono`, `rounded-lg`, `shadow-glow-gold`, `animate-ph-fade-in`). Valores que não mapeiam → arbitrary values (`h-[52px]`). NUNCA hardcodar cor — sempre token.
3. Ícones: `lucide-react` (import PascalCase: `data-lucide="trending-up"` → `<TrendingUp />`), nunca CDN/createIcons.
4. `window.PH*`/globals → imports ES. `window.PH_DATA` → `@/mocks/data` tipado.
5. Interatividade mock preservada com useState (sheets, steppers, toggles, undo) — onde existir endpoint real (auth, ligas) ligar com TanStack Query.
6. Dinheiro SEMPRE via `<MoneyValue>`; números/timer/percentuais sempre `font-mono` tabular. Sem emoji decorativo — Lucide + naipes ♠♥♦♣.
7. Navegação: react-router (rotas abaixo), não state-string. `go('x')` → `navigate(rota)`.
8. Responsivo de verdade: cada tela funciona em 375px (bottom-nav, sheets, toques ≥44px) e ≥1024px (sidebar colapsável; usar os layouts `Desktop*.jsx` do kit como referência da variante desktop). Breakpoint `md:`/`lg:` do Tailwind, mobile-first.
9. Acessibilidade mínima: focus-visible (já no base), `aria-label` em icon-buttons, contraste dos tokens (já AA).

**Mapa de rotas:**

| Rota | Tela (fonte no kit) |
|---|---|
| `/login`, `/cadastro` | auth (visual próprio seguindo DS + lockup do `Splash.jsx`) |
| `/app/ligas` | `Lobby.jsx` (ligas REAIS da API) |
| `/app/ligas/nova` | `Forms.jsx` (criar liga — API real) |
| `/app/ligas/:leagueId` | `Home.jsx` (header liga real; hero ao vivo + tabs mock) |
| `/app/torneio` | `Timer.jsx` (tab torneio: timer mock ou agenda vazia) |
| `/app/torneio/dashboard` | `Dashboard.jsx` (painel organizador mock) |
| `/app/torneio/novo` (+`/editar`) | `TorneioWizard.jsx` |
| `/app/torneio/historico/:id` | `Historico.jsx` (detalhe) |
| `/app/tv` | `TimerTV.jsx` (fullscreen, fora do shell) |
| `/app/debitos` | `Settlement.jsx` |
| `/app/debitos/pagamentos` | `Pagamentos.jsx` |
| `/app/ranking` | `Ranking.jsx` (+ PlayerStats no mesmo arquivo) |
| `/app/perfil` | Perfil (em `App.jsx` do kit) |
| `/app/perfil/caixinha` | `Caixinha.jsx` |
| `/app/perfil/admin` | `Admin.jsx` |

**Tech Stack:** React 19, Vite 6, TypeScript strict, Tailwind v4 (`@tailwindcss/vite`), react-router-dom 7, TanStack Query 5, react-hook-form + zod 4, lucide-react, sonner, @fontsource-variable/geist (+geist-mono), @sentry/react (no-op sem DSN), vitest + happy-dom + @testing-library/react.

**Convenções:** kebab-case em arquivos, npm (não pnpm), commits em inglês `feat:/test:/chore:` sem escopo. localStorage keys: `ph.token`, `ph.refresh_token`, `ph.user`, `ph-theme`. Branch `feature/fase1-front-scaffold`.

**Fora de escopo (não implementar):** PWA/manifest/service worker (Fase 7), SignalR real (Fase 4 — timer aqui é mock com setInterval), endpoints novos no backend (stream paralelo cuida), DataTable/Recharts (gráficos de stats podem usar barras CSS como no kit), ESLint, geração de tipos OpenAPI, painel de tweaks (`tweaks-panel.jsx`, `PaletteTweaks.jsx` — NÃO portar).

---

### Task 0: Branch

- [ ] **Step 1: Criar a branch a partir de develop**

Run: `cd /var/home/aschott/Projects/PokerHub && git checkout develop && git checkout -b feature/fase1-front-scaffold`
Expected: `Switched to a new branch 'feature/fase1-front-scaffold'`

---

### Task 1: Scaffold web/ com tokens do tema

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Copy: `web/src/index.css` (do protótipo, com ajuste de fontes)
- Copy: `web/src/lib/utils.ts` (do protótipo)
- Modify: `.gitignore`

- [ ] **Step 1: package.json**

Criar `web/package.json`:

```json
{
  "name": "pokerhub-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@fontsource-variable/geist": "^5.2.8",
    "@fontsource-variable/geist-mono": "^5.2.8",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-tabs": "^1.1.3",
    "@tanstack/react-query": "^5.100.9",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.474.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.75.0",
    "react-router-dom": "^7.15.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.0.1",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.6",
    "@types/node": "^24.12.2",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.6",
    "typescript": "~5.7.3",
    "vite": "^6.1.0"
  }
}
```

- [ ] **Step 2: vite.config.ts com proxy para a API (porta 5100)**

Criar `web/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Tudo sob /api vai para a PokerHub.Api local (launchSettings: http://localhost:5100).
      // /hubs (SignalR) entra só na Fase 4.
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: tsconfig.json**

Criar `web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: index.html (theme bootstrap antes do paint + fontes via @fontsource)**

Criar `web/index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="theme-color" content="#211f1a" />
    <title>PokerHub</title>
    <script>
      // Tema persistido aplicado ANTES do paint — sem flash. Dark é o padrão.
      (function () {
        try {
          var t = localStorage.getItem('ph-theme') || 'dark';
          document.documentElement.setAttribute('data-theme', t);
        } catch (e) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Montar `web/src/index.css` a partir dos tokens do design system**

Fontes (ler antes): `docs/design-system/tokens/colors.css`, `typography.css`, `spacing.css`, `base.css` e `docs/design-system/ui_kits/pokerhub_app/palettes.css`.

Estrutura do `web/src/index.css` (nesta ordem):

1. `@import "tailwindcss";` e `@import "tw-animate-css";`
2. **Bloco `:root` (tema escuro, padrão):** copiar TODO o conteúdo do `:root` de `tokens/colors.css` + as variáveis de `typography.css` (`--font-display/--font-body/--font-mono` ajustadas para `'Geist Variable'`/`'Geist Mono Variable'`, pesos, type scale, trackings, line-heights) + as de `spacing.css` (spacing, semantic, safe-areas, bottom-nav, radius, hit-target, shadows, glows, motion). **Substituir a rampa dourada** pelos valores do accent ouro dark: `--gold-400: oklch(0.820 0.130 84); --gold-500: oklch(0.770 0.142 80); --gold-600: oklch(0.700 0.148 74);`
3. **Bloco `[data-theme="light"]`:** copiar o bloco `html[data-palette="clube"][data-theme="light"]` de `palettes.css` (seletor trocado para `[data-theme="light"]`), **substituindo a rampa dourada** pelos valores do accent ouro light: `--gold-400: oklch(0.580 0.135 76); --gold-500: oklch(0.620 0.140 78); --gold-600: oklch(0.520 0.140 72);`
4. **`@theme inline`** mapeando tokens → Tailwind:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-positive: var(--positive);
  --color-negative: var(--negative);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-gold-400: var(--gold-400);
  --color-gold-500: var(--gold-500);
  --color-gold-600: var(--gold-600);
  --color-emerald-400: var(--emerald-400);
  --color-emerald-500: var(--emerald-500);
  --color-podium-gold: var(--podium-gold);
  --color-podium-silver: var(--podium-silver);
  --color-podium-bronze: var(--podium-bronze);
  --color-suit-red: var(--suit-red);
  --color-suit-dark: var(--suit-dark);
  --color-felt-950: var(--felt-950);
  --color-felt-900: var(--felt-900);
  --color-felt-850: var(--felt-850);
  --color-felt-800: var(--felt-800);
  --color-felt-750: var(--felt-750);
  --color-felt-700: var(--felt-700);
  --color-felt-600: var(--felt-600);
  --color-ink-100: var(--ink-100);
  --color-ink-300: var(--ink-300);
  --color-ink-500: var(--ink-500);
  --color-ink-600: var(--ink-600);

  --font-sans: var(--font-body);
  --font-mono: var(--font-mono);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);

  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-sheet: var(--shadow-sheet);
  --shadow-glow-gold: var(--glow-gold);
  --shadow-glow-emerald: var(--glow-emerald);
  --shadow-glow-amber: var(--glow-amber);

  --animate-ph-fade-in: ph-fade-in 0.3s var(--ease-out) both;
  --animate-ph-sheet-up: ph-sheet-up 0.32s var(--ease-out) both;
  --animate-ph-pulse: ph-pulse 1.6s ease-in-out infinite;
  --animate-ph-level-pop: ph-level-pop 0.4s var(--ease-spring);
}
```

5. **Keyframes** (`ph-fade-in`, `ph-sheet-up`, `ph-pulse`, `ph-level-pop`) copiados de `spacing.css`.
6. **`@layer base`:** port do `tokens/base.css` — body com `background`/`foreground`/`font-body`/antialiased, headings com `--font-display` bold tracking-tight, `::selection` gold 28%, scrollbars finas (`--felt-700`), `:focus-visible` com `--ring`. `html { color-scheme: dark; }` e `[data-theme="light"] { color-scheme: light; }` (via CSS: `html:has(...)` não — usar `:root { color-scheme: dark } [data-theme="light"] { color-scheme: light }`).
7. **`@layer utilities`:** `.tnum` (tabular-nums), `.safe-top`/`.safe-bottom` (env safe-area), `.ph-num` (recipe mono de número: font-mono semibold tabular tracking-snug).

Criar também `web/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: main.tsx e App.tsx mínimos (provisórios — Task 5 substitui)**

Criar `web/src/main.tsx`:

```tsx
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Criar `web/src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <h1 className="text-2xl font-bold text-primary">PokerHub</h1>
    </div>
  );
}
```

- [ ] **Step 7: .gitignore do repo**

Adicionar ao final de `/var/home/aschott/Projects/PokerHub/.gitignore`:

```
# front (web/)
web/node_modules/
web/dist/
```

- [ ] **Step 8: Instalar e buildar**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm install && npm run build`
Expected: install sem erros; `tsc -b` limpo; `vite build` gera `dist/`.

- [ ] **Step 9: Commit**

```bash
cd /var/home/aschott/Projects/PokerHub
git add web .gitignore
git commit -m "feat: scaffold web frontend (Vite, React 19, Tailwind v4, felt-table theme tokens)"
```

---

### Task 2: Primitives do design system (port JSX → TSX)

**Files (todos em `web/src/components/ui/`):**
- Create: `button.tsx`, `icon-button.tsx`, `badge.tsx`, `status-pill.tsx`, `avatar.tsx`, `card.tsx`, `section-title.tsx`, `stat-tile.tsx`, `money-value.tsx`, `podium-stat.tsx`, `progress-bar.tsx`, `sheet.tsx`
- Create: `input.tsx`, `label.tsx`, `switch.tsx`, `chips.tsx` (port dos field primitives `PHInput`/`PHSwitch`/`PHChips` de `docs/design-system/ui_kits/pokerhub_app/Forms.jsx`)
- Create: `sonner.tsx`

- [ ] **Step 1: Portar os componentes de `docs/design-system/components/`**

Fontes: `components/core/{Button,IconButton,Badge,StatusPill,Avatar}.jsx`, `components/surfaces/{Card,SectionTitle}.jsx`, `components/data/{MoneyValue,StatTile,PodiumStat,ProgressBar}.jsx`, `components/navigation/BottomNav.jsx` (fica para a Task 7), `components/overlay/Sheet.jsx`. Cada um tem um `*.prompt.md` ao lado com a API esperada — **manter os nomes de props** do kit (variant, size, block, icon, tone, signed, cents, etc.).

Aplicar as regras de port do cabeçalho: CSS injetado → Tailwind + CVA (variants/sizes idênticos aos do kit: Button `primary|secondary|outline|ghost|destructive` × `sm|md|lg` + `block`; etc.), ícones por componente Lucide passado como `icon={NomeDoIcone}` (tipo `LucideIcon`) em vez de string CDN. `MoneyValue` mantém a lógica exata de formatação BRL (sinal − para negativo, `+` quando `signed`, centavos esmaecidos via `dimCents`). `Sheet` vira overlay controlado (`open`/`onClose`) com backdrop, animação `animate-ph-sheet-up`, radius `--radius-xl` no topo, `safe-bottom`, fechamento por backdrop/X — sem Radix (port fiel do kit, que é simples e mobile-first).

- [ ] **Step 2: input.tsx, label.tsx, switch.tsx, chips.tsx**

Port dos primitives de `Forms.jsx` (PHInput com label + mono opcional + erro, PHSwitch toggle 42×24, PHChips de seleção) mantendo o visual (inputs radius `--radius-md`, altura ≥44px, focus ring gold). `Input`/`Label` seguem a API shadcn usual (`React.ComponentProps<"input">`, `@radix-ui/react-label`) para os forms RHF das Tasks 6/15 funcionarem com `{...register(...)}` e `aria-invalid`.

- [ ] **Step 3: sonner.tsx**

Criar `web/src/components/ui/sonner.tsx`:

```tsx
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
```

(Sem prop `theme` fixa — as cores vêm dos tokens, que já flipam com `[data-theme]`.)

- [ ] **Step 4: Página de demonstração temporária + verificação visual**

Substituir o conteúdo de `web/src/App.tsx` (provisório da Task 1) por uma grade de demonstração renderizando TODOS os primitives portados (variants de Button, Badge tones, StatusPill AO VIVO/PAUSADO, MoneyValue positivo/negativo/signed, StatTile, PodiumStat 1º/2º/3º, ProgressBar, Avatar com badge, Sheet abrindo por botão, Input/Switch/Chips) — isso é o harness de verificação visual desta task e será substituído na Task 5.

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm run build`
Expected: `tsc -b` + `vite build` sem erros.

Verificação visual (Playwright MCP): `npm run dev` + abrir `http://localhost:5173`, conferir a grade nos DOIS temas (executar `document.documentElement.setAttribute('data-theme','light')` no console para o claro) e em 375px/1200px. Screenshot de cada combinação. Os componentes devem bater com os cards de referência do kit (`docs/design-system/components/*/*.card.html` descrevem o esperado).

- [ ] **Step 5: Commit**

```bash
cd /var/home/aschott/Projects/PokerHub
git add web/src
git commit -m "feat: port design-system primitives to TSX/Tailwind (button, money, sheet, pills, stats)"
```

---

### Task 3: API client com refresh transparente (TDD)

**Files:**
- Create: `web/vitest.config.ts`
- Create: `web/src/lib/api/base.ts`
- Create: `web/src/lib/api/client.ts`
- Test: `web/src/lib/api/client.test.ts`

> Padrão copiado do health-system (`web/src/lib/api/client.ts`): promise única de refresh (anti-corrida), retry único pós-refresh, tratamento especial para `/auth/login|refresh|logout`. Adaptações PokerHub: keys `ph.*`, `AuthResponse` com `{userId, name, email}` (sem tenant/role/professionalId).

- [ ] **Step 1: Instalar vitest + happy-dom + testing-library**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm install -D vitest happy-dom @testing-library/react`
Expected: instala sem erros (versões latest resolvidas pelo npm).

- [ ] **Step 2: vitest.config.ts**

Criar `web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'happy-dom',
    // URL base para que window.location.href = '/login' resolva sem erro.
    environmentOptions: { happyDOM: { url: 'http://localhost:5173/app' } },
  },
});
```

- [ ] **Step 3: base.ts**

Criar `web/src/lib/api/base.ts`:

```ts
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
```

- [ ] **Step 4: Escrever os testes do client (falhando)**

Criar `web/src/lib/api/client.test.ts`:

```ts
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
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm test`
Expected: FAIL — `./client` não existe.

- [ ] **Step 6: Implementar client.ts**

Criar `web/src/lib/api/client.ts`:

```ts
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
    const message =
      typeof body === 'object' && body !== null && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : typeof body === 'string'
          ? body
          : response.statusText;
    throw new ApiError(response.status, message, body);
  }

  return body as T;
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm test`
Expected: PASS — 6 testes.
Nota: se o teste de anti-corrida falhar por detalhe do mock (ordem do mockImplementation vs mockResolvedValueOnce: os `Once` têm precedência e são consumidos primeiro — esse é o comportamento esperado do vitest), investigar a mensagem real antes de mudar o client.

- [ ] **Step 8: Commit**

```bash
cd /var/home/aschott/Projects/PokerHub
git add web/src/lib/api web/vitest.config.ts web/package.json web/package-lock.json
git commit -m "feat: add API client with transparent refresh-token rotation (race-safe)"
```

---

### Task 4: Auth context (TDD)

**Files:**
- Create: `web/src/lib/auth-context.tsx`
- Test: `web/src/lib/auth-context.test.tsx`

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `web/src/lib/auth-context.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth-context';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthProvider', () => {
  it('hidrata sessão válida do localStorage', () => {
    localStorage.setItem('ph.token', 'tok');
    localStorage.setItem('ph.refresh_token', 'ref');
    localStorage.setItem(
      'ph.user',
      JSON.stringify({ userId: 'u1', name: 'Anderson', email: 'a@a.com' }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ userId: 'u1', name: 'Anderson', email: 'a@a.com' });
  });

  it('ignora user corrompido no localStorage', () => {
    localStorage.setItem('ph.token', 'tok');
    localStorage.setItem('ph.user', '{nao-e-json');

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it('setSession persiste e autentica', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.setSession('tok', 'ref', {
        userId: 'u1',
        name: 'Anderson',
        email: 'a@a.com',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('ph.token')).toBe('tok');
    expect(localStorage.getItem('ph.refresh_token')).toBe('ref');
    expect(JSON.parse(localStorage.getItem('ph.user')!)).toEqual({
      userId: 'u1',
      name: 'Anderson',
      email: 'a@a.com',
    });
  });

  it('clear limpa a sessão e revoga o refresh token (best-effort)', () => {
    localStorage.setItem('ph.token', 'tok');
    localStorage.setItem('ph.refresh_token', 'ref');
    localStorage.setItem(
      'ph.user',
      JSON.stringify({ userId: 'u1', name: 'A', email: 'a@a.com' }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.clear();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('ph.token')).toBeNull();
    expect(localStorage.getItem('ph.refresh_token')).toBeNull();
    expect(localStorage.getItem('ph.user')).toBeNull();

    const logoutCall = fetchMock.mock.calls.find(([u]) => String(u) === '/api/auth/logout');
    expect(logoutCall).toBeDefined();
    expect(JSON.parse(String(logoutCall![1]!.body))).toEqual({ refreshToken: 'ref' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm test`
Expected: FAIL — `./auth-context` não existe (testes do client continuam PASS).

- [ ] **Step 3: Implementar auth-context.tsx**

Criar `web/src/lib/auth-context.tsx`:

```tsx
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm test`
Expected: PASS — 10 testes (6 client + 4 auth-context).

- [ ] **Step 5: Commit**

```bash
cd /var/home/aschott/Projects/PokerHub
git add web/src/lib/auth-context.tsx web/src/lib/auth-context.test.tsx
git commit -m "feat: add auth context with localStorage session and best-effort logout"
```

---

### Task 5: Sentry skeleton + App.tsx com router e Protected

**Files:**
- Create: `web/src/instrument.ts`
- Create: `web/src/routes/app/em-breve.tsx`
- Modify: `web/src/main.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Instalar @sentry/react**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm install @sentry/react`
Expected: instala sem erros.

- [ ] **Step 2: instrument.ts (no-op sem DSN)**

Criar `web/src/instrument.ts`:

```ts
/**
 * Init do Sentry — PRIMEIRO import do main.tsx, antes do React, para capturar
 * erros durante o load dos módulos. Sem VITE_SENTRY_DSN configurado (estado
 * atual) o bloco inteiro é um no-op — o projeto Sentry será criado quando o
 * app for a produção (Fase 7).
 */
import React from 'react';
import * as Sentry from '@sentry/react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'pokerhub-web@dev',
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost'],
  });
}
```

- [ ] **Step 3: Placeholder em-breve**

Criar `web/src/routes/app/em-breve.tsx`:

```tsx
import { Spade } from 'lucide-react';

export default function EmBreveRoute({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center animate-deal-in">
      <div className="chip-surface flex size-14 items-center justify-center rounded-2xl">
        <Spade className="size-6 text-gold-dim" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Em construção — esta mesa ainda está sendo montada.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: main.tsx definitivo**

Substituir `web/src/main.tsx` por:

```tsx
// Sentry PRIMEIRO — antes do React e de qualquer código do app.
import './instrument';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { reactErrorHandler } from '@sentry/react';
import App from './App.tsx';

createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: theme-context.tsx + splash.tsx**

Criar `web/src/lib/theme-context.tsx`:

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
type ThemeState = { theme: Theme; toggle: () => void };

const Ctx = createContext<ThemeState | null>(null);

function readTheme(): Theme {
  try {
    return (localStorage.getItem('ph-theme') as Theme) || 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // O atributo data-theme já foi aplicado pelo script inline do index.html
  // antes do paint — aqui só mantemos o estado React em sincronia.
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('ph-theme', next);
    } catch {
      // storage indisponível — o tema vale só para a sessão
    }
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be inside <ThemeProvider>');
  return c;
}
```

Criar `web/src/components/splash.tsx`: port fiel de `docs/design-system/ui_kits/pokerhub_app/Splash.jsx` (lockup ♠ + wordmark sob `--tv-bg`, naipes como loader, auto-dismiss 2.1s/1.1s reduced-motion, toque para pular, `prefers-reduced-motion` respeitado) — CSS injetado vira Tailwind/arbitrary values; export `Splash({ onDone })`.

- [ ] **Step 6: App.tsx com router completo, QueryClient e Protected**

Substituir `web/src/App.tsx` por:

```tsx
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Toaster } from '@/components/ui/sonner';
import { Splash } from '@/components/splash';
import LoginRoute from '@/routes/login';
import CadastroRoute from '@/routes/cadastro';
import { AppShell } from '@/components/app-shell/app-shell';
import EmBreveRoute from '@/routes/app/em-breve';

// Cada task de tela troca o placeholder pelo lazy import real, ex.:
// const LigasRoute = lazy(() => import('@/routes/app/ligas'));
const RouteFallback = () => (
  <div className="flex min-h-dvh items-center justify-center">
    <div className="animate-ph-pulse text-sm text-muted-foreground">Carregando…</div>
  </div>
);

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  // Splash uma vez por load (padrão do kit), por cima de tudo.
  const [splash, setSplash] = useState(true);

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginRoute />} />
                <Route path="/cadastro" element={<CadastroRoute />} />
                {/* TV mode: protegido mas FORA do AppShell (fullscreen, sem nav) */}
                <Route
                  path="/app/tv"
                  element={
                    <Protected>
                      <EmBreveRoute title="Timer TV" />
                    </Protected>
                  }
                />
                <Route
                  path="/app"
                  element={
                    <Protected>
                      <AppShell />
                    </Protected>
                  }
                >
                  <Route index element={<Navigate to="/app/ligas" replace />} />
                  <Route path="ligas" element={<EmBreveRoute title="Ligas" />} />
                  <Route path="ligas/nova" element={<EmBreveRoute title="Criar liga" />} />
                  <Route path="ligas/:leagueId" element={<EmBreveRoute title="Liga" />} />
                  <Route path="torneio" element={<EmBreveRoute title="Torneio" />} />
                  <Route path="torneio/dashboard" element={<EmBreveRoute title="Painel ao vivo" />} />
                  <Route path="torneio/novo" element={<EmBreveRoute title="Criar torneio" />} />
                  <Route path="torneio/historico/:tournamentId" element={<EmBreveRoute title="Torneio realizado" />} />
                  <Route path="debitos" element={<EmBreveRoute title="Débitos" />} />
                  <Route path="debitos/pagamentos" element={<EmBreveRoute title="Pagamentos do torneio" />} />
                  <Route path="ranking" element={<EmBreveRoute title="Ranking" />} />
                  <Route path="perfil" element={<EmBreveRoute title="Perfil" />} />
                  <Route path="perfil/caixinha" element={<EmBreveRoute title="Caixinha" />} />
                  <Route path="perfil/admin" element={<EmBreveRoute title="Administração da liga" />} />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
          {splash && <Splash onDone={() => setSplash(false)} />}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

> Nota: este step referencia `routes/login`, `routes/cadastro` (Task 6) e `app-shell` (Task 7), que ainda não existem — o build só volta a ficar verde no fim da Task 7. Para manter o commit desta task compilando, criar agora **stubs mínimos** que a Task 6/7 substituem:

Criar `web/src/routes/login.tsx` (stub):

```tsx
export default function LoginRoute() {
  return <div className="p-8">login — em construção (Task 6)</div>;
}
```

Criar `web/src/routes/cadastro.tsx` (stub):

```tsx
export default function CadastroRoute() {
  return <div className="p-8">cadastro — em construção (Task 6)</div>;
}
```

Criar `web/src/components/app-shell/app-shell.tsx` (stub):

```tsx
import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <main className="p-4">
      <Outlet />
    </main>
  );
}
```

- [ ] **Step 7: Build + testes**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm run build && npm test`
Expected: build verde, 10 testes PASS.

- [ ] **Step 8: Commit**

```bash
cd /var/home/aschott/Projects/PokerHub
git add web/src web/package.json web/package-lock.json
git commit -m "feat: add router, theme provider, splash, Sentry skeleton and route placeholders"
```

---

### Task 6: Telas de login e cadastro

**Files:**
- Create: `web/src/features/auth/login-form.tsx`
- Create: `web/src/features/auth/register-form.tsx`
- Create: `web/src/features/auth/auth-layout.tsx`
- Modify: `web/src/routes/login.tsx` (substituir stub)
- Modify: `web/src/routes/cadastro.tsx` (substituir stub)

- [ ] **Step 1: Layout compartilhado das telas de entrada**

Visual: mesmo lockup do `Splash.jsx` (mark ♠ em gradiente dourado + wordmark "Poker**Hub**" com o Hub em gold) sobre o backdrop `--tv-bg` (lâmpada), card de form uma camada acima.

Criar `web/src/features/auth/auth-layout.tsx`:

```tsx
import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 safe-top safe-bottom"
      style={{ background: 'var(--tv-bg)' }}
    >
      <div className="animate-ph-fade-in mb-8 flex flex-col items-center gap-4">
        <div
          className="flex size-[64px] items-center justify-center rounded-[18px] text-[34px] leading-none text-primary-foreground shadow-glow-gold"
          style={{ background: 'linear-gradient(160deg, var(--gold-400), var(--gold-600))' }}
        >
          ♠
        </div>
        <span className="text-[28px] font-extrabold tracking-[-0.03em] text-foreground">
          Poker<span className="text-gold-400">Hub</span>
        </span>
      </div>
      <div className="animate-ph-fade-in w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-md">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Form de login**

Criar `web/src/features/auth/login-form.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Schema = z.object({
  email: z.email('E-mail inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});
type FormData = z.infer<typeof Schema>;

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
};

export function LoginForm() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api<AuthResponse>('/auth/login', { method: 'POST', body: data }),
    onSuccess: (resp) => {
      setSession(resp.accessToken, resp.refreshToken, {
        userId: resp.userId,
        name: resp.name,
        email: resp.email,
      });
      navigate('/app', { replace: true });
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {mutation.error instanceof ApiError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {mutation.error.status === 401
            ? 'E-mail ou senha inválidos.'
            : `Erro ${mutation.error.status}: ${mutation.error.message}`}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Entrando…' : 'Entrar'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Primeira vez na mesa?{' '}
        <Link to="/cadastro" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Form de cadastro**

Criar `web/src/features/auth/register-form.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Schema = z
  .object({
    name: z.string().min(2, 'Nome é obrigatório.'),
    email: z.email('E-mail inválido.'),
    password: z.string().min(6, 'Mínimo de 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof Schema>;

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
};

/** Extrai as mensagens do ValidationProblem do Identity ({errors: {register: [...]}}). */
function identityErrors(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const details = err.details as { errors?: { register?: string[] } } | undefined;
  return details?.errors?.register?.join(' ') ?? null;
}

export function RegisterForm() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { name: data.name, email: data.email, password: data.password },
      }),
    onSuccess: (resp) => {
      setSession(resp.accessToken, resp.refreshToken, {
        userId: resp.userId,
        name: resp.name,
        email: resp.email,
      });
      navigate('/app', { replace: true });
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {mutation.error instanceof ApiError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {identityErrors(mutation.error) ??
            `Erro ${mutation.error.status}: ${mutation.error.message}`}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem cadeira na mesa?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Rotas substituindo os stubs**

Substituir `web/src/routes/login.tsx` por:

```tsx
import { AuthLayout } from '@/features/auth/auth-layout';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginRoute() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
```

Substituir `web/src/routes/cadastro.tsx` por:

```tsx
import { AuthLayout } from '@/features/auth/auth-layout';
import { RegisterForm } from '@/features/auth/register-form';

export default function CadastroRoute() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
```

- [ ] **Step 5: Build + testes**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm run build && npm test`
Expected: build verde, 10 testes PASS.

- [ ] **Step 6: Commit**

```bash
cd /var/home/aschott/Projects/PokerHub
git add web/src/features web/src/routes
git commit -m "feat: add login and register screens with RHF+Zod validation"
```

---

### Task 7: App shell responsivo (bottom-nav mobile + sidebar desktop)

**Files:**
- Create: `web/src/components/app-shell/logo.tsx`
- Create: `web/src/components/app-shell/nav-items.ts`
- Create: `web/src/components/app-shell/bottom-nav.tsx`
- Create: `web/src/components/app-shell/sidebar.tsx`
- Create: `web/src/components/app-shell/app-shell.tsx` (substituir stub)

**Fontes no kit:** `components/navigation/BottomNav.jsx` (nav mobile com dot de notificação), `ui_kits/pokerhub_app/App.jsx` (itens PH_NAV: Ligas/layers · Torneio/timer · Débitos/wallet+dot · Ranking/trending-up · Perfil/user), `ui_kits/pokerhub_app/Desktop.jsx` + `DesktopParts.jsx` (sidebar colapsável: wordmark, switcher de liga, nav com dot ao vivo, toggle de colapso, usuário no rodapé, topbar com toggle de tema).

- [ ] **Step 1: logo.tsx + nav-items.ts**

`Logo`: mark ♠ (gradiente dourado, rounded-lg) + wordmark "Poker**Hub**" (`Hub` em `text-gold-400`), prop `collapsed` para mostrar só o mark.
`NAV_ITEMS`: fonte única para os dois navs — `{ to, label, icon }` com `lucide-react` (`Layers`, `Timer`, `Wallet`, `TrendingUp`, `User`) seguindo o mapa de rotas do cabeçalho (`/app/ligas`, `/app/torneio`, `/app/debitos`, `/app/ranking`, `/app/perfil`).

- [ ] **Step 2: bottom-nav.tsx (mobile, port do BottomNav.jsx)**

Port fiel: fixed bottom, altura `--bottom-nav-h` + `safe-bottom`, fundo `--felt-850`/popover com hairline border-t, 5 destinos NavLink (ícone + label 10px), ativo em `text-gold-400` (transição rápida), suporte a `dot` (bolinha `--negative`, usada em Débitos), `md:hidden`. Alvos ≥44px.

- [ ] **Step 3: sidebar.tsx (desktop, port da sidebar do Desktop.jsx)**

`hidden md:flex`, fixa à esquerda, w-60 (colapsada: w-[68px], persistir em useState apenas), conteúdo: Logo (collapsed-aware), NavLinks com ícone+label (ativo: fundo `--accent` + texto gold), rodapé com avatar/nome/email do `useAuth().user` + botões de toggle de tema (`useTheme`) e sair (`clear()` + navigate `/login`). Toggle de colapso (chevron) na borda.

- [ ] **Step 4: app-shell.tsx definitivo**

Estrutura: `<Sidebar />` + header mobile sticky (`md:hidden`: Logo + toggle tema + sair) + `<main>` com `px-4 pb-[calc(var(--bottom-nav-h)+24px)] pt-4 md:ml-60 md:px-8 md:pb-8` (ml acompanha colapso via CSS var ou state lift — manter simples: `md:ml-[var(--sidebar-w)]` setado pela própria sidebar em `document.documentElement.style`) + `<BottomNav />`. `<Outlet />` dentro do main.

- [ ] **Step 5: Build + testes + verificação visual**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm run build && npm test`
Expected: verde, 10 testes PASS.
Visual (Playwright): logar não é possível ainda sem tela real? — É: Task 6 já entregou login. Logar com usuário de teste (se a API estiver de pé) OU navegar direto após setar tokens fake no localStorage (`ph.token` qualquer string) para ver o shell com placeholders. Conferir: 375px = bottom-nav, sem sidebar; 1200px = sidebar, sem bottom-nav; colapso funciona; toggle de tema flipa tudo.

- [ ] **Step 6: Commit**

```bash
cd /var/home/aschott/Projects/PokerHub
git add web/src/components/app-shell
git commit -m "feat: add responsive app shell (mobile bottom-nav, collapsible desktop sidebar)"
```

---

### Task 8: Mock dataset tipado

**Files:**
- Create: `web/src/mocks/data.ts`

- [ ] **Step 1: Portar `docs/design-system/ui_kits/pokerhub_app/data.js` para TS tipado**

Ler o `data.js` inteiro e criar `data.ts` com: interfaces para cada entidade (`MockLeague`, `MockTournament`, `MockPlayer`, `MockBlindLevel`, `MockTransfer`, `MockRankingEntry`, `MockPlayerStats`, `MockCaixinha`, `MockHistoricoItem`, etc. — nomes derivados do shape real do data.js) e o dataset exportado (`PH_DATA` → export nomeado `mockData` + exports individuais). Manter TODOS os valores idênticos (a Liga dos Amigos é o conteúdo de demonstração). Comentário no topo: `// Mock da Fase 1+ — substituir por hooks TanStack Query conforme os endpoints nascem (ver roadmap).`

- [ ] **Step 2: Build + commit**

Run: `cd /var/home/aschott/Projects/PokerHub/web && npm run build`

```bash
cd /var/home/aschott/Projects/PokerHub
git add web/src/mocks
git commit -m "feat: add typed mock dataset from design-system UI kit"
```

---

### Task 9: Ligas — Lobby (API real) + Home da liga

**Files:**
- Create: `web/src/lib/api/hooks/use-leagues.ts`
- Create: `web/src/routes/app/ligas/index.tsx` (Lobby)
- Create: `web/src/routes/app/ligas/nova.tsx` (Criar liga)
- Create: `web/src/routes/app/ligas/[id].tsx` (Home da liga)
- Create: `web/src/features/leagues/*` (componentes da feature conforme necessário)
- Modify: `web/src/App.tsx` (trocar placeholders pelos lazy imports reais)

**Fontes no kit:** `Lobby.jsx`, `Home.jsx`, `Forms.jsx` (criar liga), `DesktopLiga.jsx` (variante desktop do lobby/home). Comportomento esperado: `ui_kits/pokerhub_app/README.md` itens 1 e 7.

**API real (hooks TanStack Query em `use-leagues.ts`):** `useLeagues()` → GET `/leagues`; `useLeague(id)` → GET `/leagues/{id}`; `useLeaguePlayers(id)` → GET `/leagues/{id}/players`; `useCreateLeague()` → POST `/leagues` (body `CreateLeagueDto`: `{name, description?, blockCheckInWithDebt, jackpotPercentage?}` — conferir shape real em `src/PokerHub.Application/DTOs/League/`); `useJoinLeague()` → POST `/leagues/join/{inviteCode}`; `useLeaveLeague(id)`; `useRegenerateInvite(id)`. Tipos TS espelhando os DTOs .NET com comentário de origem.

- [ ] **Step 1:** Hooks de API (`use-leagues.ts`) com tipos.
- [ ] **Step 2:** Lobby — port do `Lobby.jsx`: seções **Organizo**/**Participo** (separar pelo `organizerId === user.userId`), card de liga (membros/torneios chips — usar contagens reais se o DTO trouxer; senão omitir o chip), liga ativa destacada (gold + "Atual"; persistir liga ativa em `localStorage('ph-active-league')` + contexto leve), botão **Convite** (sheet com código + copiar) e **Administrar** para organizador, "entrar com código" (sheet + `useJoinLeague`), FAB/botão **Criar** → `/app/ligas/nova`. Estados: loading skeleton, vazio que ensina ("Nenhuma liga ainda" → CTA criar/entrar).
- [ ] **Step 3:** Criar liga — port do form do `Forms.jsx` com RHF+Zod (nome obrigatório, descrição, switch bloquear check-in com débito, % caixinha 0-100) → `useCreateLeague` → navega para a nova liga com toast.
- [ ] **Step 4:** Home da liga — port do `Home.jsx`: header com nome/switcher (dados reais via `useLeague`), **hero do torneio ao vivo** (mock: `mockData.liveTournament` — timer compacto + blinds + prize pool + Operar/Assistir) ou banner vazio "Nenhum torneio em andamento" → Criar; tabs Torneios (lista mock + atalho Caixinha + Realizados) / Jogadores (REAL: `useLeaguePlayers`) / Ranking (resumo mock → link `/app/ranking`).
- [ ] **Step 5:** Variante desktop (referência `DesktopLiga.jsx`): grid 2 colunas no `lg:` (hero + stat tiles à esquerda, próximos torneios/acerto rápido à direita); tabela de jogadores em vez de cards.
- [ ] **Step 6:** `npm run build && npm test` verdes; smoke visual nas duas larguras/temas.
- [ ] **Step 7:** Commit `feat: add leagues lobby and league home wired to real API`.

---

### Task 10: Timer mobile + Timer TV

**Files:**
- Create: `web/src/routes/app/torneio/index.tsx` (tab Torneio = timer ou agenda vazia)
- Create: `web/src/routes/app/tv.tsx`
- Create: `web/src/features/timer/*` (use-mock-clock.ts, timer-display.tsx, level-controls.tsx…)
- Modify: `web/src/App.tsx`

**Fontes:** `Timer.jsx`, `TimerTV.jsx`, `DesktopTorneio.jsx`. README itens 2-3.

- [ ] **Step 1:** `use-mock-clock.ts` — relógio mock (setInterval 1s, pause/resume, próximo/anterior nível, blinds do `mockData`); interface pensada para na Fase 4 trocar por SignalR sem mudar as telas (mesmo shape de estado: `{level, remainingSeconds, paused, blinds, nextBlinds}`).
- [ ] **Step 2:** Timer mobile — port fiel do `Timer.jsx`: tempo restante dominante (≥40% da tela, mono, **container-query units `cqi`** como no kit para nunca estourar), blinds atuais/próximos, nível, stat row (jogadores, prize pool, avg stack), controles de nível (organizador), estado **PAUSADO inconfundível** (backdrop `--tv-paused-bg` + hazard + pill âmbar), botão TV → `/app/tv`, Wake Lock API (`navigator.wakeLock?.request('screen')` com release no unmount — try/catch silencioso).
- [ ] **Step 3:** Timer TV — port do `TimerTV.jsx`: fullscreen (Fullscreen API no mount com fallback), landscape 3 colunas (prêmios · timer gigante + blinds · jogadores/stats), backdrop `--tv-bg`, legível a 3m; ≤900px colapsa painéis ("phone propped on the table"); ESC/botão sair → `/app/torneio`.
- [ ] **Step 4:** Tab Torneio sem torneio ao vivo: agenda (próximos mock) + Realizados (lista `Historico.jsx` reusável) + CTA Criar torneio.
- [ ] **Step 5:** Build/test verdes + smoke visual (pausado e rodando, mobile/desktop/temas). Commit `feat: add mock blind timer (mobile + TV fullscreen mode)`.

---

### Task 11: Dashboard ao vivo do organizador

**Files:**
- Create: `web/src/routes/app/torneio/dashboard.tsx`
- Create: `web/src/features/live/*` (player-row, action-sheet, eliminate-sheet, level-control…)
- Modify: `web/src/App.tsx`

**Fontes:** `Dashboard.jsx` (+ stat patterns de `DesktopTorneio.jsx`). README item 4 e seção "How to navigate".

- [ ] **Step 1:** Port do `Dashboard.jsx`: controle de nível (compacto, mesmo mock-clock da Task 10 via contexto/módulo), prize pool ao vivo, lista de jogadores (status: ativo/eliminado/aguardando check-in) com tap → **bottom-sheet de ações** (check-in / rebuy / add-on com steppers +/− e undo / eliminar). Eliminar → segundo sheet "quem eliminou" (lista dos ativos). Eliminados ganham **Desfazer**. Tudo useState sobre `mockData`, com as transições do kit.
- [ ] **Step 2:** Header: nome do torneio + engrenagem → `/app/torneio/novo?edit=1` (wizard em modo edição, Task 15). Botão **Encerrar torneio** → `/app/debitos/pagamentos` (Task 12).
- [ ] **Step 3:** Desktop `lg:`: duas colunas (controle+stats | jogadores), sheets viram painéis laterais? NÃO — manter sheets (consistência), só layout em colunas.
- [ ] **Step 4:** Build/test + smoke. Commit `feat: add live tournament dashboard with organizer action sheets`.

---

### Task 12: Débitos — Settlement + Pagamentos do torneio

**Files:**
- Create: `web/src/routes/app/debitos/index.tsx` (Settlement)
- Create: `web/src/routes/app/debitos/pagamentos.tsx`
- Create: `web/src/features/payments/*`
- Modify: `web/src/App.tsx`

**Fontes:** `Settlement.jsx`, `Pagamentos.jsx`, `DesktopPagamentos.jsx`. README itens 5 e 11.

- [ ] **Step 1:** Settlement — port: saldo líquido hero (MoneyValue grande), seções **A pagar** / **A receber**, cada transfer com avatar, valor, **chave PIX com copy em 1 toque** (navigator.clipboard + toast "Chave copiada"), estados pendente/aguardando/confirmado (state machine local: marcar pago → aguardando confirmação → confirmar).
- [ ] **Step 2:** Pagamentos do torneio — port: resumo (a receber · pendentes · confirmados · progresso), **Saldo do torneio** por jogador (investimento · prêmio · saldo, contribuição da caixinha, prize pool), lista de transferências (quem paga quem) com mesma state machine, ações Recalcular / Cobrar todos (toast mock).
- [ ] **Step 3:** Desktop: tabelas (colunas do `DesktopPagamentos.jsx`).
- [ ] **Step 4:** Build/test + smoke. Commit `feat: add settlement and tournament payments screens with PIX copy`.

---

### Task 13: Ranking + estatísticas do jogador

**Files:**
- Create: `web/src/routes/app/ranking.tsx`
- Create: `web/src/features/rankings/*` (podium, standings-list, player-stats, season-sheet…)
- Modify: `web/src/App.tsx`

**Fontes:** `Ranking.jsx` (Ranking + PlayerStats no mesmo arquivo), tabela desktop em `DesktopParts.jsx`/`Desktop.jsx`. README item 6 + nota do seletor de temporada.

- [ ] **Step 1:** Ranking — port: header de temporada + progresso, **pódio hero** (2º·1º·3º com `PodiumStat`, glow no líder), toggle de ordenação **Lucro · ROI · ITM**, lista de classificação escaneável com uma mão. Seletor de temporada (sheet: Temporada 3/2/1 · **Geral acumulado** → troca para `mockData.rankingGeral` com % de participação).
- [ ] **Step 2:** PlayerStats — port: hero stats, pódios, card ROI tintado, barras de performance (taxa de vitória / ITM / posição média — barras CSS), financeiro (investido · prêmios · lucro · melhor · pior), histórico de torneios recentes. Navegação: tap na linha → stats; ← volta (state interno ou rota filha — seguir o kit: state).
- [ ] **Step 3:** Desktop `lg:`: tabela completa de classificação (colunas do kit) + clique na linha abre **modal** de PlayerStats (port do player-stats modal do `Desktop.jsx`).
- [ ] **Step 4:** Build/test + smoke. Commit `feat: add ranking with podium, sort toggle and player stats`.

---

### Task 14: Perfil + Caixinha + Administração da liga

**Files:**
- Create: `web/src/routes/app/perfil/index.tsx`
- Create: `web/src/routes/app/perfil/caixinha.tsx`
- Create: `web/src/routes/app/perfil/admin.tsx`
- Modify: `web/src/App.tsx`

**Fontes:** Perfil dentro de `App.jsx` do kit, `Caixinha.jsx`, `Admin.jsx`, `DesktopPerfil.jsx`. README itens 8-9.

- [ ] **Step 1:** Perfil — port: avatar + nome/email REAIS (`useAuth().user`), stat cards (lucro temporada/ITM — mock), **Aparência** (toggle claro/escuro via `useTheme` — port fiel do switch do kit), lista: Administração da liga → admin, Caixinha (saldo trail) → caixinha, Minha chave PIX (sheet de edição, localStorage), WhatsApp (sheet com máscara `(11) 98765-4321` — port da `fmtPhone`), Notificações (disabled), **Sair** (REAL: `useAuth().clear()` → `/login`).
- [ ] **Step 2:** Caixinha — port: saldo hero, % do prize pool, Entradas/Saídas, sheets organizador **Registrar gasto** / **Usar em torneio** (mock funcional — atualiza saldo local).
- [ ] **Step 3:** Admin — port: editar dados da liga (sheet com form RHF — pode chamar `PUT /leagues/{id}` REAL se a liga ativa for real; senão mock), código de convite (REAL: regenerate + copy), caixinha (link), temporada (progresso + encerrar com confirm), tabela de premiação, gestão de jogadores (remover/convidar — mock com confirm sheets).
- [ ] **Step 4:** Build/test + smoke. Commit `feat: add profile, league kitty and league administration screens`.

---

### Task 15: Criar liga avançado, Wizard de torneio e Histórico

**Files:**
- Create: `web/src/routes/app/torneio/novo.tsx` (wizard, suporta `?edit=1`)
- Create: `web/src/routes/app/torneio/historico/[id].tsx`
- Create: `web/src/features/tournaments/*` (wizard-steps, blind-table, prize-table…)
- Modify: `web/src/App.tsx`

**Fontes:** `TorneioWizard.jsx`, `DesktopWizard.jsx`, `Historico.jsx`, `DesktopHistorico.jsx`. README itens 10 e 12.

- [ ] **Step 1:** Wizard 5 passos — port fiel (stepper mobile-first): **Informações** (nome, data/hora, copiar configurações de torneio passado — sheet), **Valores** (buy-in, stacks, rebuy por nível, add-on, check-in tardio — inputs mono), **Blinds** (templates Turbo 10' / Regular 15' / Deep 20' / Custom; tabela de níveis com antes e intervalos, editável), **Premiação** (tabela da liga, percentual/valor fixo, +/− posições, validação soma 100%), **Confirmação** (resumo). Estado todo local (RHF por passo ou useState estruturado — seguir o kit). Modo edição via query param pré-preenche.
- [ ] **Step 2:** Histórico — port: lista Realizados (data · jogadores · campeão · prize pool) reusável (já parcialmente na Task 10 — extrair para `features/tournaments/realizados-list.tsx` se ainda não) + tela de detalhe (stat tiles, pódio `PodiumStat`, contribuição caixinha, **Ver pagamentos** → `/app/debitos/pagamentos`, **Duplicar torneio** → wizard pré-preenchido).
- [ ] **Step 3:** Desktop variantes (`DesktopWizard.jsx`/`DesktopHistorico.jsx`): wizard em card central maior com stepper horizontal; histórico em tabela.
- [ ] **Step 4:** Build/test + smoke. Commit `feat: add tournament wizard, league creation and tournament history`.

---

### Task 16: Gate — E2E completo (login real + navegação total, 2 temas × 2 larguras)

> ⚠️ A API usa o Azure SQL real do grupo. O smoke cria UM usuário de teste via `/api/auth/register` (`claude-fase1@pokerhub.test` / `SenhaF1!2026`) e UMA liga de teste ("Liga E2E Claude" — pode apagar depois via DELETE). Anotar para limpeza futura.

- [ ] **Step 1:** Subir API (`dotnet run --project src/PokerHub.Api`, esperar `/health` Healthy) e front (`npm run dev`).
- [ ] **Step 2:** Playwright (MCP): fluxo completo —
  1. `/` → redirect `/login` (splash aparece e some; lockup dourado).
  2. Cadastro do usuário de teste (ou login se já existir) → cai em `/app/ligas`.
  3. Criar "Liga E2E Claude" → aparece em **Organizo**, navegar para a Home dela (hero vazio → CTA criar).
  4. Navegar TODAS as rotas: torneio (timer mock rodando + pausar), dashboard (sheet de ações abre), tv (fullscreen layout), débitos (copy PIX → toast), pagamentos, ranking (pódio + toggle + player stats), perfil, caixinha, admin, criar torneio (wizard avança os 5 passos com template Regular), histórico (detalhe).
  5. Toggle de tema no Perfil → tudo flipa para o claro "clube diurno"; reload mantém (localStorage).
  6. Viewport 375px: bottom-nav presente, sheets a partir do fundo, timer legível; 1200px: sidebar colapsável.
  7. Logout → `/login`; login de novo OK; senha errada → mensagem inline.
- [ ] **Step 3:** Screenshots de registro (dark/light × mobile/desktop das telas-chave: home, timer, dashboard, ranking, settlement) salvos em `docs/superpowers/plans/evidence/fase1/`.
- [ ] **Step 4:** Corrigir o que o smoke pegar; commits `fix:`. Encerrar processos. Commit final `test: verify full navigation E2E (Fase 1+ gate)` (--allow-empty se nada mudou).

---

### Task 17: Tracker no vault + merge

- [ ] **Step 1:** Atualizar `~/Documents/Obsidian/1 - Projetos/Migracao PokerHub React/03-roadmap-fases.md`: Fase 0 ✅ (2026-06-10, db160d2); Fase 1 ✅ expandida (2026-06-11 — "todas as telas do UI kit em mock-first, tema claro/escuro, design system docs/design-system/"); nota de que Fases 2-6 do front viram "ligar telas na API" (telas já existem); `date_updated`; nota de que o protótipo verde `~/Projects/pokerhub` está superado e pode ser apagado.
- [ ] **Step 2:** REQUIRED SUB-SKILL superpowers:finishing-a-development-branch — merge `--no-ff` na `develop` com mensagem `merge: Fase 1+ — complete web frontend (design system, all screens mock-first, light/dark)`. **Coordenar com o stream do backend:** se `feature/fase2-api-endpoints` já tiver mergeado, rebase/merge develop antes.

---

## Fora de escopo desta fase (não implementar)

- PWA (manifest, service worker, ícones) — Fase 7.
- SignalR real / timer server-side — Fase 4 (o mock-clock já tem a interface).
- Ligar telas mock em endpoints novos (acontece fase a fase conforme o backend entrega).
- Recharts, geração de tipos OpenAPI, ESLint, painel de tweaks de paleta.
- Deploy (SWA/Container App/Bicep/CI).
