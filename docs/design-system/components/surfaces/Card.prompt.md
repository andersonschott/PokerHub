**Card** — the felt surface that holds everything. Hairline border, chip-ramp background, generous radius.

```jsx
<Card variant="live" title="Torneio da Sexta" action={<StatusPill status="live" />}>
  …compact timer + blinds…
</Card>

<Card interactive title="Ranking" action={<Button variant="ghost" iconRight="chevron-right" size="sm">Ver tudo</Button>}>
  …
</Card>
```

- `variant`: default · live (emerald tint + glow) · gold (prize) · flat (inset)
- `interactive` for tappable cards · `pad`: none / md / lg
