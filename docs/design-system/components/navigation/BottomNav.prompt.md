**BottomNav** — the product's custom fixed bottom navigation (never a shadcn tab bar). 4–5 destinations, ≥44px targets, safe-area aware, active = gold.

```jsx
const items = [
  { key: 'ligas',   label: 'Ligas',   icon: 'layers' },
  { key: 'torneio', label: 'Torneio', icon: 'timer' },
  { key: 'debitos', label: 'Débitos', icon: 'wallet', dot: true },
  { key: 'ranking', label: 'Ranking', icon: 'trending-up' },
  { key: 'perfil',  label: 'Perfil',  icon: 'user' },
];
<BottomNav items={items} active="torneio" onSelect={setTab} />
```

Inside a phone-frame mock keep the default (absolute, pinned to the frame). Pass `fixed` only for a real full-viewport PWA.
