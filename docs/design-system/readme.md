# PokerHub — Design System

> Agregador de ligas de poker caseiro: ranking, cadastro, salas, timer de blinds, débitos e PIX. Brazilian Portuguese, BRL, **mobile-first**, dark-first.

This is the brand + UI foundation for **PokerHub**, a mobile-first PWA for organizing home-game poker leagues — weekly tournaments among friends, real money settled by PIX. It manages leagues (ligas), tournaments (torneios), a real-time blind **timer** (mobile + TV mode), player **rankings & stats**, and **payments/debts** between players. It is a "scoreboard for your kitchen-table poker night": numbers everywhere, money always in context, the live tournament at the center.

**Visual direction — "clube privado à meia-noite" (a private members' club at midnight).** Dark mode is the default. A deep **warm graphite** (charcoal with a candlelight undertone — never green, never blue-grey) under a single hanging lamp; surfaces stack like poker chips; a restrained **champagne gold** is reserved for actions and prizes; card suits (♠♥♦♣) appear only as discreet ornament. Green survives strictly as *semantics* — sober money-positive and the AO VIVO signal — never as decoration. Type is **Geist** (UI) + **Geist Mono** (timer & money). The register to aim for: a sophisticated Brazilian digital-bank app (Nubank-like) that happens to run a private poker club. Explicitly avoid generic admin-dashboard look, any "childish casino" cliché (neon, glows, giant playing cards) and the saturated-green-felt trope. Built on **shadcn/ui** primitives with **oklch** CSS-variable tokens, mobile-first (375 / 768 / 1200), a custom bottom-nav, and iOS safe-area insets.

> This system is a deliberate **redesign**, not a clone of the current production UI. The shipped app is Blazor + MudBlazor (Material, bright green); the product *domain, copy and money conventions* below are taken from it, but the *visual language* here supersedes it.

---

## Sources

This system was reverse-engineered from the real product so designs match what ships.

- **Codebase:** `PokerHub/` — Blazor Server (.NET 10) + MudBlazor 8.15 (Material Design), SignalR for the live timer, EF Core / Azure SQL. Mounted locally and read in full.
- **GitHub:** `andersonschott/PokerHub` — same repo (private; not reachable at build time, but explore it for deeper context if you have access).
- **Key reference files (in the codebase):**
  - `VISUAL_IDENTITY.md` — the team's own visual guide (theme colors, fonts, component recipes, responsive rules). The single best primary source.
  - `src/PokerHub.Web/Components/Layout/MainLayout.razor` — MudBlazor `PaletteDark`/`PaletteLight` definitions (canonical hexes).
  - `src/PokerHub.Web/Components/Pages/Ranking/PlayerStats.razor(.css)` — the **reference implementation** of the new identity.
  - `src/PokerHub.Web/Components/Pages/Timer/Index.razor(.css)` — the TV-mode blind timer.
  - `src/PokerHub.Web/Components/Pages/Pagamento/MyDebts.razor` — debts/PIX flows.
  - `src/PokerHub.Web/wwwroot/app.css` — bottom-nav, mobile layout, podium/ranking cards.

The production app's mark is being redrawn for this system. `assets/pokerhub-logo-ai.png` is a client-supplied AI generation (teal/orange shield) kept for reference only — its colors are **off-brand** for the graphite+champagne direction. The intended lockup is the **PokerHub** wordmark in Geist with a single suit accent on the felt; `assets/favicon.png` is the legacy 32px favicon.

---

## Content fundamentals

**Language.** Brazilian Portuguese, informal-but-direct. The product talks to hobbyist organizers and players, not a casino.

- **Tone:** practical, encouraging, never corporate. Empty states *teach* ("Você está em dia com todos os pagamentos." / "Nenhum débito pendente!"). Errors are plain ("Liga não encontrada").
- **Person:** addresses the user as **você** ("Bem-vindo", "Gerencie suas ligas", "Veja a classificação"). Imperative for actions ("Criar Conta", "Marcar como Pago", "Confirmar").
- **Casing:** Title Case or sentence case for buttons/labels; **UPPERCASE + letter-spacing** reserved for tiny section labels and live-status pills ("AO VIVO", "PAUSADO", "PRIZE POOL", "JOGADORES").
- **Numbers & money are the message.** Money is always **BRL** (`R$ 1.234,56`), always **signed** when it's a result (`+R$ 500,00` / `-R$ 200,00`), and always **colored** (green positive / red negative). Percentages use `,` decimals (`65,4%`). ROI, ITM, lucro/prejuízo are first-class vocabulary.
- **Domain words to keep:** Liga, Torneio, Mesa, Blind/Blinds, Rebuy, Add-on, Check-in, Eliminação, Caixinha (jackpot/kitty), Lanches (snacks/expenses), Débito, Saldo, ROI, ITM, Pódio, PIX.
- **Emoji: avoid.** The legacy app leaned on emoji (💳🐷🎰) as iconography. This redesign **drops decorative emoji** in favor of Lucide icons + suit glyphs — the "digital-bank sophistication" register depends on it. The only pictographs that remain are the four **card suits** ♠♥♦♣, used as quiet ornament and category marks (♥♦ inherit `--suit-red`). Money is conveyed by sign + color + mono type, not by an emoji.

Example copy, verbatim register:
> "Organize seus torneios caseiros de poker com ranking por lucro/prejuízo, timer de blinds em tempo real e controle de pagamentos entre jogadores."

---

## Visual foundations

**Vibe:** a private members' club at midnight — warm charcoal under one hanging lamp, champagne-gold details, calm monospaced numbers like a discreet scoreboard. Sophisticated, money-serious — not a casino arcade, not a neon dashboard. All values are **oklch** (see `tokens/colors.css`).

- **Color.** Dark-first, declared on `:root`. Background is the deepest graphite `--felt-900` (the ramp keeps its legacy `--felt-*` name); cards step up the ramp like stacked chips (`--felt-850` → `--felt-800` → `--felt-750`). **Primary = champagne gold** `--gold-500` `oklch(0.795 0.092 86)` — low chroma, "expensive" — used *only* for primary actions and prizes (text on gold is dark graphite). Green exists strictly as semantics: a **sober emerald** `--emerald-500` `oklch(0.66 0.08 158)` for AO VIVO and money-positive, used sparingly and never as decor. Money: positive `--positive`, negative `--negative` red `oklch(0.625 0.15 25)`, warning `--warning` amber. Podium gold/silver/bronze. The opt-in light theme (`[data-theme="light"]`) re-maps not just the graphite/ink ramps but also the **accent ramps** (gold, emerald, money semantics, suits, podium) to darker, contrast-safe values — and provides daylight `--tv-bg`/`--tv-paused-bg` backdrops — so every component stays legible on light surfaces without per-component overrides.
- **Type.** Two families only. **Geist** (400–800) for all UI text; **Geist Mono** (400–700) for *every number* — money, timer, blinds, stats, percentages, positions. The mono numerals are the signature; never set a money value in the body font.
- **Spacing.** Compact, card-dense. Section gaps 20px, card-grid gaps 12px, card padding 16px, screen gutter 16px (24 at md). Bottom-nav 64px tall plus `--safe-bottom`.
- **Corners.** Generously rounded for chip-like softness: `--radius` 16px on cards, 22px on hero cards & bottom-sheets, 10px on chips/badges, 12px on inputs, 50% on avatars. shadcn `sm/md/lg` derive from `--radius`.
- **Borders & cards.** A card is a graphite surface one step up the ramp with a 1px hairline border (`--border`, `--felt-700`) — elevation from the ramp step + a soft low-spread shadow, **not** heavy drop shadows. Featured cards (live tournament, podium, prize) add a faint accent **tint** (gold or emerald at low alpha) and, when live, a subtle glow.
- **Backgrounds.** Solid graphite; no photography, no busy textures. Permitted gradients: (1) faint accent **tints** on featured cards; (2) the **TV-timer backdrop** — a radial "lamp" glow from the top (`--tv-bg`), shifting amber when paused (`--tv-paused-bg`). Suits (♠♥♦♣) may sit behind hero numbers as very low-opacity ornament. No text-glow / neon text-shadows — the big numbers carry themselves.
- **Shadows & glow.** Soft, low-spread shadows on dark (`--shadow-md`, `--shadow-sheet`). The old neon glows are gone: `--glow-emerald` / `--glow-gold` / `--glow-amber` are now near-invisible warm shadow hints under featured cards. Live status is communicated by the pill + tint, never by glow.
- **Motion.** Restrained and physical. Cards enter with `ph-fade-in` (opacity + 10px rise, ~0.3s `--ease-out`), staggered. Bottom-sheets slide up (`ph-sheet-up`). Press feedback is a quick **scale(0.98)**; the live dot pulses (`ph-pulse`); the level number pops on change (`ph-level-pop`). No bounces on content, no parallax, no infinite decorative loops.
- **Status & transparency.** Live status is a pill: solid dot + translucent tinted fill — "AO VIVO" emerald, "PAUSADO" amber (unmistakable, also changes the TV backdrop). Inset stat boxes use a faint surface tint. No glassmorphism / backdrop-blur.
- **Layout rules.** Mobile-first (375 base). Custom fixed **bottom-nav** (4–5 destinations, ≥44px targets, safe-area aware) — *not* a shadcn tab bar. The **live tournament is the hero**: if one is running, home leads with a live card (compact timer + blinds + "operar"/"assistir"). In the timer, remaining time takes ≥40% of the screen and must be legible at 3 m on a TV. Organizer table actions (check-in, rebuy, eliminar) are 1–2 taps via **bottom-sheet**, never tiny dialogs.

---

## Iconography

shadcn/ui ships with **Lucide** — that is the PokerHub icon set.

1. **Lucide (primary).** Clean 1.5–2px stroke line icons; use them for all UI affordances. Common ones for this product: `trophy` (torneios/prêmios), `users` (jogadores), `bar-chart-3` / `trending-up` (ranking/ROI), `timer` / `clock` (timer), `play` / `pause` (controle de nível), `plus` / `repeat` (rebuy/add-on), `user-plus` (check-in), `skull` / `x-circle` (eliminação), `wallet` / `arrow-left-right` (acerto/PIX), `copy` (copiar chave), `check` / `check-check` (pago/confirmado), `crown` (organizador), `chevron-right`, `home`. Load from the Lucide CDN (`lucide@latest`) and call `lucide.createIcons()` — see `guidelines/iconography.card.html`. Keep stroke consistent; match the active state to `--primary` (gold) or `--foreground`.
2. **Card suits as ornament.** ♠ ♥ ♦ ♣ are the brand's pictographic vocabulary — quiet section marks, category chips, and very low-opacity decoration behind hero numbers. Reds (♥ ♦) use `--suit-red`; blacks (♠ ♣) use `--suit-dark`. Never large or skeuomorphic (no giant playing cards).

Never hand-draw icon SVGs — use Lucide from CDN or the suit glyphs. `assets/pokerhub-logo-ai.png` is an AI-generated reference mark supplied by the client; `assets/favicon.png` is the legacy favicon. The intended brand lockup is the **Geist wordmark + a single suit accent** (see `guidelines/brand-logo.card.html`).

---

## Index / manifest

Root files:
- `styles.css` — global entry point (import this one file). Imports the token layer below.
- `tokens/` — `fonts.css` (Geist), `colors.css` (oklch / shadcn), `typography.css`, `spacing.css`, `base.css`.
- `assets/` — `pokerhub-logo-ai.png` (client AI reference), `favicon.png` (legacy favicon).
- `guidelines/` — foundation specimen cards (Type, Colors, Spacing, Brand, Iconography).
- `components/` — reusable React primitives built on shadcn-style patterns.
- `ui_kits/pokerhub_app/` — high-fidelity click-through recreation of the four priority screens.
- `SKILL.md` — Agent-Skill manifest for using this system in Claude Code.

**Components** (under `components/`): see each `*.prompt.md`. Core set: Button, IconButton, Badge, StatusPill, Chip, Avatar, Card, SectionTitle, StatTile, StatRow, MoneyValue, PodiumStat, BottomNav, Sheet, ProgressBar.

**UI kit:** `ui_kits/pokerhub_app/` recreates the four priority screens — the blind **Timer** (mobile + TV), the organizer **Live Dashboard** with action bottom-sheet, the league **Home/lobby**, and the post-tournament **Settlement (PIX)**.

> Compiled artifacts (`_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`) are generated automatically — do not edit them. Read components from `window.PokerHubDesignSystem_b95f9b` in card HTML.
