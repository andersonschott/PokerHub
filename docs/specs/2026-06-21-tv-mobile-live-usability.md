# Revisão de usabilidade mobile do torneio ao vivo

**Data:** 2026-06-21 · **Branch:** `feat/revisao-usabilidade-mobile` · **App:** React (`web/`) — Blazor intocado.

## Contexto

Validação manual no celular revelou 3 problemas de layout + 2 funcionalidades que o
Blazor tem na tela de timer e que ainda não foram portadas para o React:

1. `/tv` quebra no celular em **retrato** — o timer estoura a largura.
2. Header do dashboard ao vivo trunca o título para "2..." (excesso de itens na linha).
3. No card do timer do dashboard o blind fica num caption de 11px (ilegível p/ quem monitora só por ali).
4. (porta do Blazor) Wake Lock: tela cheia no celular não pode deixar a tela bloquear.
5. (porta do Blazor) Som: tocar aviso sonoro na virada de nível.

Decisões de layout tomadas com o dono (mockups aprovados): /tv mobile = **Hero + essenciais + prêmios**;
header = **uma linha enxuta** (sem subtítulo, sem badge "Operando", **sem pill "AO VIVO"**);
card do timer = **blind em linha própria**.

## 1. `/tv` no celular em pé — Hero + essenciais + prêmios
**Arquivo:** `web/src/routes/app/tv.tsx`

- **Causa raiz:** timer `fontSize: clamp(72px, 33cqi, 240px)` + `whitespace-nowrap`. No retrato (~429px) o termo `33cqi` (~141px) torna `00:00` mais largo que a viewport.
- O modo `compact` atual (≤900px) foi desenhado para **celular deitado** (mini-TV, "phone propped on the table"). Separar os dois casos:
  - **Retrato estreito** — `(max-width: 900px) and (orientation: portrait)` → novo layout empilhado dedicado.
  - **Paisagem estreita** — mantém o compact atual (mini-TV).
  - **≥900px** — mantém o grid 3 colunas (TV/monitor) intocado.
- **Layout retrato (coluna única, vertical):**
  - Header enxuto existente (♠ + nome truncável + StatusPill).
  - **Hero centralizado:** `NÍVEL n` (ou "Intervalo") → tempo → blind atual (ouro) → `ante n · próximo sb/bb`.
    - O tempo **sempre cabe**: trocar a base do clamp para algo limitado pela largura da viewport (ex.: `min(20vw…, 33cqi)` com teto), garantindo que `00:00` nunca exceda a largura. Verificar a 360px e 320px.
  - Linha de essenciais: `x/y na mesa · R$ pool` (reusa `stats` + `MoneyValue`).
  - **Seção Prêmios** abaixo (pool hero + 1º/2º/3º…), rolável. Reusa o bloco de prêmios já existente do desktop.
  - **Sem** a lista de jogadores ativos no retrato (segue só no desktop/TV).
- Estados não-live (aguardando/encerrado) seguem o tratamento atual (sem `00:00` enganoso).

## 2. Header do dashboard — uma linha enxuta
**Arquivo:** `web/src/routes/app/torneio/dashboard.tsx` (bloco Header, ~l.234-263)

- Remover: subtítulo "Você controla a mesa e o nível", `<Badge>Operando</Badge>`, e `<StatusPill>` ("AO VIVO").
- Linha única: `← voltar` · **título** (`flex-1 min-w-0`, trunca só se faltar espaço de verdade) · ícones **TV** (`MonitorPlay`) e **Configurar** (`Settings2`) menores, `shrink-0`.
- Estado pausado permanece visível via o card do timer (cor + ícone play/pause).

## 3. Card do timer no dashboard — blind em linha própria
**Arquivo:** `web/src/features/live/level-control.tsx`

- `NÍVEL n` como label pequeno no topo; controles `‹ ⏸ ›` à direita (como hoje).
- **Tempo maior** (~40px; hoje `text-[30px]`).
- **Blind `sb / bb` em linha própria, ouro, ~20px** (hoje embutido no caption de 11px).
- Linha `ante n · próximo sb/bb` abaixo (próximo derivado de `state.nextBlinds`).
- Sem mudança de dados/lógica: continua consumindo `state: MockClockState`. Pausado mantém `var(--warning)` no tempo.

## 4. Wake Lock — `/tv`
**Novo:** `web/src/lib/wake-lock.ts` (hook `useWakeLock(active: boolean)`), consumido em `tv.tsx`.

- Espelha `wwwroot/js/wakelock.js`: `navigator.wakeLock.request('screen')` quando ativo;
  **re-acquire** em `visibilitychange` (volta ao foco — o lock cai sozinho quando a aba some);
  `release()` no cleanup. Best-effort: ausência da API ou rejeição = no-op silencioso (Safari iOS).
- Ativado enquanto a `/tv` está montada (a tela já entra em fullscreen best-effort no mount).

## 5. Som de fim de nível — `/tv`
**Novo:** `web/src/lib/timer-sounds.ts` + hook de disparo.

- `timer-sounds.ts` espelha `wwwroot/js/timer-sounds.js` (Web Audio API): expõe ao menos
  `playLevelChange()` e `playBreakStart()` (mesmas notas/sequências do Blazor). `AudioContext`
  lazy + `resume()` se `suspended`. Erros engolidos (`console.warn`).
- **Disparo:** hook que observa `clock.level`. Numa transição de nível (valor anterior live e diferente
  do novo; **nunca no 1º render nem saindo do estado loading/level 0**) → `clock.isBreak ? playBreakStart() : playLevelChange()`.
  Semântica idêntica ao handler `LevelChanged` do Blazor (`Public.razor` l.492-498).
- **Edge case mobile (autoplay policy):** áudio pode ficar `suspended` sem gesto do usuário.
  Mitigação: registrar um listener único de `pointerdown`/`touchstart` que faz `resume()` na 1ª
  interação, além do `resume()` antes de cada play. Documentar que pode exigir 1 toque para liberar o som.

## Fora de escopo
- Qualquer alteração no Blazor.
- Controles na `/tv` (segue **só-visualização**).
- Tornar a `/tv` realmente pública (`AllowAnonymous` no `by-invite`/hub) — decisão de segurança do dono, separada.
- Lista de jogadores no retrato da `/tv`.

## Testes (vitest, funções puras)
- **Detecção de virada de nível:** dada uma sequência de estados de clock, retorna o som correto
  (`level-change` | `break-start` | nenhum), sem disparar no 1º render nem na saída do loading.
- **Seleção de layout:** dado `{ maxWidth, orientation }`, retorna `portrait` | `landscape-compact` | `wide`.
- Wake lock e Web Audio (efeitos de browser) ficam como **verificação manual** no celular.

## Critérios de aceitação
- [ ] `/tv` em retrato 360px e 320px: timer cabe, sem overflow horizontal; prêmios visíveis e roláveis.
- [ ] `/tv` em paisagem no celular: mini-TV atual preservado; ≥900px: grid 3-col intocado.
- [ ] Header do dashboard: título legível (não "2..."), sem subtítulo/badge/pill; TV e Configurar acessíveis.
- [ ] Card do timer: tempo ~40px e blind em ouro legível; pausado pinta o tempo de aviso.
- [ ] `/tv` em fullscreen no celular não bloqueia a tela (Wake Lock; onde a API existe).
- [ ] Som toca na virada de nível (e som de intervalo quando o novo nível é break), após 1 gesto.
- [ ] `tsc -b` limpo · vitest verde (novos testes inclusos).
