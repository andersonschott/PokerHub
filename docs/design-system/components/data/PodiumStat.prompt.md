**PodiumStat** — a medal-tinted podium row for rankings and prize panels.

```jsx
<PodiumStat position={1} name="Ana Reis"  sub="8 vitórias" prize={<MoneyValue value={2400} cents={false} color="none" />} />
<PodiumStat position={2} name="Caio Souza" sub="55% ITM"   prize={<MoneyValue value={1440} cents={false} color="none" />} />
<PodiumStat position={3} name="Bruno Lima" prize={<MoneyValue value={960} cents={false} color="none" />} />
```

Positions 1/2/3 render gold/silver/bronze; 4+ are neutral.
