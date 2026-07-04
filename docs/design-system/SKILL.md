---
name: pokerhub-design
description: Use this skill to generate well-branded interfaces and assets for PokerHub — a mobile-first PWA for home-game poker leagues (ligas, torneios, blind timer, ranking, débitos/PIX). Use for production code or throwaway prototypes/mocks. Contains the brand guidelines, oklch color + Geist type tokens, Lucide iconography, and shadcn-style UI components + a full app UI kit.
user-invocable: true
---

# PokerHub design skill

Read `readme.md` first — it is the full design guide (sources, content fundamentals, visual foundations, iconography, manifest). Then explore the other files.

**Concept:** "clube privado à meia-noite" — a private members' club at midnight. Dark-first **warm graphite** (charcoal with a candlelight undertone — never green), restrained **champagne gold** for actions & prizes, green only as sober money/live semantics, card suits as discreet ornament, **Geist** for UI + **Geist Mono** for every number. Register: a sophisticated Brazilian digital-bank app running a private poker club. Avoid generic admin dashboards and childish-casino clichés (neon, glows, saturated felt green, giant cards). Built on shadcn/ui patterns with **oklch** tokens, mobile-first (375 / 768 / 1200), a custom bottom-nav, iOS safe-areas.

## What's here
- `styles.css` — the one stylesheet to link (imports `tokens/`). Tokens: `colors.css` (oklch / shadcn `--background`, `--primary`, `--card`…), `fonts.css` (Geist), `typography.css`, `spacing.css`, `base.css`.
- `components/` — React primitives: Button, IconButton, Badge, StatusPill, Avatar, Card, SectionTitle, MoneyValue, StatTile, PodiumStat, ProgressBar, BottomNav, Sheet. Each has a `.prompt.md` with usage.
- `ui_kits/pokerhub_app/` — click-through recreation of the four priority screens (Timer mobile+TV, Live dashboard, Home lobby, Settlement/PIX).
- `guidelines/` — visual specimen cards. `assets/` — logos.

## How to use
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy assets out and produce static HTML. Link `styles.css`, load Lucide + Geist, mount components from the compiled bundle (`window.PokerHubDesignSystem_<ns>`), or just lift the token values and patterns.
- **Production code:** copy the token CSS and component patterns; read the rules here to design like a PokerHub native. Use shadcn/ui as the base layer, map its variables to `tokens/colors.css`.

## Non-negotiables
- Money: always `<MoneyValue>` — BRL, mono, signed + colored (green/red). Never plain text.
- The live tournament is the hero; the timer's remaining time takes ≥40% and must read at 3 m on TV.
- Table actions (check-in, rebuy, eliminar) go in a bottom-**Sheet**, ≥44px targets — never tiny dialogs.
- Gold `primary` is reserved for the single most important action per screen.
- Icons: Lucide + suit glyphs. No decorative emoji.

If invoked without guidance, ask what the user wants to build, ask a few focused questions, then act as an expert PokerHub designer — output HTML artifacts or production code as needed.
