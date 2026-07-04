# PokerHub App — UI kit

A high-fidelity, click-through recreation of the PokerHub mobile PWA, built on the design-system primitives (`window.PokerHubDesignSystem_b95f9b`). It is a **mock**, not production code — interactions are faked — but the visuals and flows are faithful to the "felt table at night" direction.

Open `index.html` for the **mobile** app or `desktop.html` for the **PC** version (collapsible sidebar + dashboard). The two are cross-linked.

**Responsive:** on a real phone (≤640px) the mobile app drops the device mockup and fills the whole screen (`100dvh`); on desktop it renders inside a 390px phone frame for presentation.

**Tema claro/escuro:** dark is the brand default ("mesa de feltro à noite"). A sun/moon toggle lives in the mobile Home header and in **Perfil → Aparência**, and in the desktop topbar; the choice persists in `localStorage` (`ph-theme`) and applies before paint (no flash). Light theme is driven entirely by the design-system tokens (`[data-theme="light"]` in `tokens/colors.css`).

## Screens (priority order)

1. **Home / League lobby** (`Home.jsx`) — league header, the **live tournament hero** (compact timer + blinds + prize pool + *Operar*/*Assistir*), and a segmented control for Torneios / Jogadores / Ranking with a custom bottom-nav.
2. **Timer — mobile** (`Timer.jsx`) — remaining time dominant (≥40%), current/next blinds, level, live stat row, level controls, and an unmistakable **paused** state (amber backdrop). The TV icon enters fullscreen. The giant digits scale with **container-query units** (`cqi` against `.ph-screen`), so they never overflow — neither on real narrow phones nor inside the desktop phone mockup.
3. **Timer — TV** (`TimerTV.jsx`) — landscape, lamp-lit felt backdrop, three columns (prizes · giant timer + blinds · players/stats), legible at 3 m. On narrow screens (≤900px) the side panels collapse and fullscreen becomes the timer itself — the "phone propped on the table" mode.
4. **Live dashboard** (`Dashboard.jsx`) — organizer control: level control, live prize pool, players list. Tapping a player opens a **bottom-sheet** with check-in / rebuy / add-on / eliminar; *eliminar* leads to a second sheet to pick **who eliminated**.
5. **Settlement / PIX** (`Settlement.jsx`) — post-tournament acerto de contas: net balance, A pagar / A receber, **PIX key with 1-tap copy**, and pendente / aguardando / confirmado states.
6. **Ranking** (`Ranking.jsx`) — the dedicated standings destination: season header + progress, a raised **podium hero** (2nd·1st·3rd, gold glow on the leader), a **Lucro · ROI · ITM** sort toggle, and a one-hand-scannable standings list. Tapping any player opens the **PlayerStats** detail (same file): hero stats, pódios, a tinted **ROI card**, performance bars (taxa de vitória / ITM / posição média), the financeiro list (investido · prêmios · lucro · melhor · pior), and a recent-tournaments history.
7. **Lobby de ligas** (`Lobby.jsx`) — the **Ligas** tab: every league you belong to, split into **Organizo** / **Participo**, the active one highlighted (gold glow + *Atual*), members/tournaments chips, live indicator, organizer **Convite** + **Administrar** buttons, and an "entrar com código" affordance. Tapping a league switches the active context (`PH_DATA.league`); if the chosen league has no live tournament the Home hero becomes a compact empty banner ("Nenhum torneio em andamento" → *Criar*). The Home league header is also a one-tap switcher.
8. **Caixinha** (`Caixinha.jsx`) — league kitty: saldo acumulado hero, % do prize pool, **Entradas** (contribuição por torneio) / **Saídas** (torneio especial · gasto da liga), and organizer sheets to **Registrar gasto** / **Usar em torneio** (working mock — updates the balance). Reached from Home → Torneios tab shortcut, Perfil, and Administração.
9. **Administração da liga** (`Admin.jsx`) — organizer hub: editar dados da liga (sheet), código de convite, caixinha, temporada (progresso + encerrar), tabela de premiação and gestão de jogadores (remover/convidar). Reached from Perfil and the Lobby **Administrar** button.
10. **Cadastro** (`Forms.jsx` + `TorneioWizard.jsx`) — **Criar liga** (nome, descrição, bloquear check-in com débitos, % caixinha) and the **Criar/Configurar torneio wizard** in 5 steps mirroring `Torneio/Create.razor`: Informações (with **copiar configurações** from a past tournament) · Valores (buy-in, stacks, rebuy por nível, add-on, check-in tardio) · **Blinds** (Turbo 10' / Regular 15' / Deep 20' / Custom templates, level table with antes and intervals) · Premiação (tabela da liga, percentual/valor fixo, +/− posições, validação 100%) · Confirmação. Shared field primitives (`PHInput`, `PHSwitch`, `PHChips`) live in `Forms.jsx`.
11. **Pagamentos do torneio** (`Pagamentos.jsx`) — post-tournament prize/payment calc mirroring `TournamentPayments.razor`: resumo (a receber · pendentes · confirmados · progresso), **Saldo do torneio** (investimento · prêmio · saldo por jogador, contribuição da caixinha, prize pool), and the **transfer list** (quem paga quem, PIX copy, Pago → Confirmar state machine), plus Recalcular / Cobrar todos. Reached from Débitos and the Dashboard's **Encerrar torneio**.

The **Ranking** also has a season selector sheet (Temporada 3/2/1 · **Geral acumulado**) — the Geral view swaps in the all-time dataset (`PH_DATA.rankingGeral`) with participation %.

12. **Torneios realizados** (`Historico.jsx`) — the consultable history: a reusable **Realizados** list (Home → Torneios tab and the Torneio tab's empty state) with date · players · champion · prize pool, and a **detail screen** per tournament (stat tiles, pódio via `PodiumStat`, caixinha contribution, *Ver pagamentos* and *Duplicar torneio* — the latter jumps into the wizard).

## Desktop (`desktop.html` + `Desktop.jsx` + `DesktopParts.jsx`)
A PC layout built from the same data and components: a **collapsible sidebar** (wordmark, league switcher, nav with live dot, collapse toggle, user) and a content area with views for **Início** (live hero + stat tiles + full standings table + right rail with próximos & acerto rápido), **Ranking** (podium + full classification table mirroring the columns of `Liga/Seasons/Ranking.razor`), **Débitos** (a pagar / a receber), and **Jogadores**. The sidebar league button opens a dropdown switcher; clicking any standings row opens a **player-stats modal**.

`App.jsx` is the shell (phone frame, routing, bottom-nav); `data.js` holds the fake Liga dos Amigos dataset.

## How to navigate the mock
- Bottom-nav: Ligas · Torneio · Débitos · Ranking · Perfil.
- **Ligas** → lobby (switch leagues); tap a league → its Home; **Criar** → criar liga; **Administrar** (organizer cards) → administração.
- On Home, the live banner → timer (tap) or dashboard (gear); the league header (top-left) is a switcher; Torneios tab has the **Caixinha** shortcut.
- **Torneio** tab → live timer with read-only participant list — or, with no live tournament, the agenda + *Criar torneio*.
- In the **Dashboard**, tap a player → sheet with rebuy/add-on **steppers** (+/− undo) and eliminar; eliminated players get **Desfazer**; the header gear → configurar torneio.
- **Ranking** tab → standings; tap a player → full stats; ← returns to the standings.
- **Perfil** → Administração da liga · Caixinha da liga · tema claro/escuro.
- Footer link **Abrir versão PC →** opens the desktop layout; the desktop's phone icon returns to mobile.

## Notes
- Components are read from the compiled bundle; this kit will render blank until `_ds_bundle.js` is built (end of turn). Each screen is its own `text/babel` file exporting to `window` (shared scope).
- Money is always `<MoneyValue>`; status is `<StatusPill>` / `<Badge>`; actions live in `<Sheet>`.
