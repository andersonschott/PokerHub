**StatTile** — big mono value + uppercase label, the unit of any stat grid.

```jsx
<StatTile icon="users" value="6/9" label="Jogadores" center />
<StatTile icon="trophy" value={<MoneyValue value={4800} cents={false} color="none" />} label="Prize pool" tone="emerald" center />
<StatTile value="12" label="Rebuys" center />
```

Tones: default · gold · emerald · positive · negative. Lay several out in a `grid-template-columns: repeat(2|4, 1fr); gap: 12px`.
