**Button** — the tappable action. Gold `primary` is reserved for the one most important action per screen; use `secondary`/`outline`/`ghost` for the rest and `destructive` for eliminar / a pagar.

```jsx
<Button variant="primary" size="lg" icon="play" block>Operar torneio</Button>
<Button variant="outline" icon="user-plus">Check-in</Button>
<Button variant="destructive" icon="skull">Eliminar</Button>
<Button variant="ghost" iconRight="chevron-right">Ver ranking</Button>
```

- `variant`: primary (gold) · secondary · outline · ghost · destructive
- `size`: sm (36) · md (44, default) · lg (52)
- `block` stretches full-width (common on mobile CTAs and inside bottom-sheets)
- `icon` / `iconRight` take Lucide icon names; the component renders them itself.
