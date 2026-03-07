# PokerHub Client (WASM) - Status de Desenvolvimento

## Ultima atualizacao: 2026-03-06

## Contexto
O projeto `src/PokerHub.Client/` é um app Blazor WebAssembly separado do `PokerHub.Web` (Blazor Server).
Consome a API REST em `src/PokerHub.Web/Controllers/Api/`.
Objetivo: cliente WASM offline-capable (branch `feature/offline`).

---

## Estrutura relevante
```
src/PokerHub.Client/
├── Pages/
│   ├── Liga/Index.razor, Details.razor, AddPlayerDialog.razor
│   ├── Torneio/Index.razor
│   ├── Ranking/PlayerStats.razor, Compare.razor
│   ├── Timer/
│   │   ├── Index.razor    # /timer/{guid} — TV 3 colunas, usa DualTimerManager
│   │   └── Public.razor   # /tv/{guid} — vista pública simplificada, @layout EmptyLayout
│   └── Home.razor, Login.razor
├── Shared/
│   └── DualTimerManager.razor  # renderless: SignalR + Web Worker (offline-first)
├── Layout/
│   └── EmptyLayout.razor       # para páginas sem AppBar (Public timer, etc.)
├── Services/
│   ├── Http/ (HttpTournamentService, etc.)
│   ├── IndexedDbService.cs   # wrapper para window.pokerhubDB
│   └── OfflineAction.cs      # record + OfflineActionTypes
└── wwwroot/js/
    ├── indexeddb-service.js  # window.pokerhubDB
    ├── wakelock.js           # Screen Wake Lock API
    ├── timer-worker.js       # Web Worker (timestamp absoluto, sem drift)
    ├── timer-bridge.js       # JSInterop bridge Blazor <-> Worker
    └── timer-sounds.js       # Sons via Web Audio API
```

---

## Páginas IMPLEMENTADAS

| Rota | Arquivo | Status |
|------|---------|--------|
| `/` | Home.razor | OK |
| `/login` | Login.razor | OK |
| `/ligas` | Liga/Index.razor | OK |
| `/ligas/{guid}` | Liga/Details.razor | OK |
| `/torneios` e `/ligas/{guid}/torneios` | Torneio/Index.razor | OK |
| `/jogador/{guid}/stats` | Ranking/PlayerStats.razor | OK |
| `/ligas/{guid}/comparar` | Ranking/Compare.razor | OK |
| `/timer/{guid}` | Timer/Index.razor | OK — DualTimerManager |
| `/tv/{guid}` | Timer/Public.razor | OK — DualTimerManager |

---

## DualTimerManager — Arquitetura Dual Timer

### Localização: Shared/DualTimerManager.razor (renderless)

### Parâmetros
- TournamentId, BlindStructure, InitialLevel, InitialTimeRemainingSeconds, InitialIsPaused
- EventCallbacks: OnTick, OnLevelChanged, OnPauseChanged, OnFinished, OnPrizePoolUpdated, OnPlayersChanged, OnConnectionChanged

### Estado da conexão (enum ConnectionStatus)
- Connecting → tentando SignalR
- Online → SignalR drive display, SYNC ao Worker a cada tick
- Reconnecting → Worker drive display
- Offline → Worker drive display

### Fluxo
1. OnAfterRenderAsync(firstRender): InitWorkerAsync() + ConnectHubAsync()
2. Worker inicia com cacheBlindStructure + estado inicial
3. SignalR (hub URL = ApiBaseUrl + /hubs/torneio):
   - TimerTick → envia SYNC ao Worker + dispara OnTick EventCallback
   - NivelAlterado → dispara OnLevelChanged
   - TorneioPausado/Retomado → PAUSE/RESUME ao Worker + OnPauseChanged
4. Se SignalR offline: Worker faz tick autônomo via [JSInvokable] OnTimerTick
5. Worker [JSInvokable] callbacks: OnTimerTick, OnWorkerLevelChanged, OnTimerPaused, OnTimerResumed, OnTournamentLastLevel, OnSyncApplied, OnTimerState, OnTimerError

### IMPORTANTE — Conflito de nomes
- [Parameter] EventCallback se chama OnLevelChanged
- [JSInvokable] do Worker se chama OnWorkerLevelChanged (para evitar conflito CS0102)
- timer-bridge.js chama 'OnWorkerLevelChanged' (não 'OnLevelChanged') para LEVEL_CHANGED

### Pacote NuGet adicionado
- Microsoft.AspNetCore.SignalR.Client v10.0.1

---

## Service Worker (service-worker.published.js)
- Assets estáticos: cache-first (comportamento padrão)
- API timer-state e detail: network-first com fallback para cache
  - Padrões: /api/tournaments/{id}/timer-state e /api/tournaments/{id}/detail
  - TTL do cache de API: 5 minutos
  - Cache separado: 'pokerhub-api-v1'

---

## Connection Banner (não-bloqueante)
- Posição: fixed top, z-index 99998, pointer-events: none
- 🟢 Online / 🟡 Reconectando... / 🔴 Offline — timer local ativo
- Fundo translúcido colorido, sem bloquear interação

---

## Padrões do Client

### RenderFragment locais em Razor
- USAR sintaxe de método: @StatCard(...), @TimerBox(...), @NextLevelBox(...)
- NAO usar sintaxe de componente <StatCard .../> (gera warning RZ10012)

### [JSInvokable] em WASM
- Devem ser public (não internal/private)
- Não podem ter mesmo nome que [Parameter] EventCallback (CS0102)

### EmptyLayout
- Criado em Layout/EmptyLayout.razor — sem AppBar/Drawer
- Usar com @layout EmptyLayout em páginas fullscreen (timer público)

---

## Páginas PENDENTES

| Rota | Prioridade |
|------|------------|
| `/torneios/{guid}` (Dashboard) | ALTA |
| `/ligas/{guid}/jackpot` | ALTA |
| `/ligas/criar`, `/ligas/{guid}/editar` | MEDIA |
| `/ligas/{guid}/torneios/criar`, `/torneios/{guid}/editar` | MEDIA |
| `/torneios/{guid}/pagamentos` | MEDIA |
| `/torneios/entrar/{InviteCode}`, `/ligas/entrar` | BAIXA |
