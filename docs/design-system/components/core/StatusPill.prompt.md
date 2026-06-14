**StatusPill** — tournament status with a pulsing dot. The live/paused distinction is critical — paused must read as obviously stopped (amber).

```jsx
<StatusPill status="live" />        {/* ● Ao vivo (pulsing emerald) */}
<StatusPill status="paused" />      {/* ● Pausado (amber) */}
<StatusPill status="scheduled" />   {/* Agendado */}
<StatusPill status="finished" />    {/* Finalizado (gold) */}
```
