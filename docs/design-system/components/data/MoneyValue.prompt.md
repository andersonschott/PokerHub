**MoneyValue** — the only correct way to show BRL: mono, tabular, signed, colored.

```jsx
<MoneyValue value={1250} />                {/* R$ 1.250,00 */}
<MoneyValue value={350} signed />          {/* +R$ 350,00 (green) */}
<MoneyValue value={-120} />                {/* −R$ 120,00 (red) */}
<MoneyValue value={4800} cents={false} size="40px" color="none" />  {/* prize pool */}
```

- `color="auto"` (default) colors by sign; pass `"none"` for neutral hero figures.
- `dimCents` fades the centavos so the reais read first.
