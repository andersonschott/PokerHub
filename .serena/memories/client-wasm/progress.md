# PokerHub Client (WASM) - Status de Desenvolvimento

## Ultima atualizacao: 2026-03-10

## Contexto
O projeto `src/PokerHub.Client/` é um app Blazor WebAssembly separado do `PokerHub.Web` (Blazor Server).
Consume a API REST em `src/PokerHub.Web/Controllers/Api/`.
Objetivo: cliente WASM offline-capable (branch `feature/offline`).

---

## Estrutura relevante
```
src/PokerHub.Client/
├── Pages/
│   ├── Liga/Index.razor, Details.razor, AddPlayerDialog.razor
│   ├── Torneio/Index.razor, Dashboard.razor   ← NOVO
│   ├── Ranking/PlayerStats.razor, Compare.razor
│   ├── Timer/
│   │   ├── Index.razor    # /timer/{guid} — TV 3 colunas, usa DualTimerManager
│   │   └── Public.razor   # /tv/{guid} — vista pública simplificada, @layout EmptyLayout
│   └── Home.razor, Login.razor
├── Shared/
│   ├── DualTimerManager.razor          # renderless: SignalR + Web Worker (offline-first)
│   ├── TournamentMobileDashboard.razor ← NOVO — componente mobile do Dashboard
│   └── AppUpdateNotifier.razor         # notifica update + sync offline
├── Layout/
│   └── EmptyLayout.razor
├── Services/
│   ├── Http/ (HttpTournamentService, etc.)
│   ├── IndexedDbService.cs
│   ├── OfflineAction.cs + OfflineActionTypes
│   └── OfflineQueueManager.cs          ← NOVO — rastreia ações pendentes para badge UI
└── wwwroot/js/
    ├── indexeddb-service.js
    ├── wakelock.js
    ├── timer-worker.js
    ├── timer-bridge.js
    ├── timer-sounds.js
    └── sw-update.js
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
| `/torneios/{guid}` | Torneio/Dashboard.razor | OK — offline-first |
| `/jogador/{guid}/stats` | Ranking/PlayerStats.razor | OK |
| `/ligas/{guid}/comparar` | Ranking/Compare.razor | OK |
| `/timer/{guid}` | Timer/Index.razor | OK — DualTimerManager |
| `/tv/{guid}` | Timer/Public.razor | OK — DualTimerManager |

---

## Dashboard WASM — Arquitetura Offline-First

### Localização: Pages/Torneio/Dashboard.razor

### Componentes usados
- `DualTimerManager` (renderless) — gerencia timer + SignalR
- `TournamentMobileDashboard` (Shared) — layout mobile idêntico ao Web
- `OfflineQueueManager` (Service) — rastreia ações pendentes para badge

### OfflineQueueManager
- `ExecuteAsync(actionType, description, Func<Task<bool>>)` — executa e rastreia offline
- `IsOnlineAsync()` — verifica `navigator.onLine` via JSInterop
- `OnSyncComplete(int)` — chamado pelo AppUpdateNotifier quando SW sync completa
- `OnChanged` event — notifica UI quando count muda
- Registrado como `AddScoped<OfflineQueueManager>()` no Program.cs

### Fluxo de ações offline
1. Action chamada (ex: AddRebuy)
2. Optimistic update local imediato (modifica `_detail` com `record with {}`)
3. `OfflineQueue.ExecuteAsync(...)` chama o HTTP service
4. Se online: request vai para API normalmente
5. Se offline: SW intercepta POST/DELETE e retorna 202 (queued)
6. `OfflineQueue` verifica `navigator.onLine`; se false → adiciona à lista de pendentes
7. Badge no header mostra count de pendentes
8. SW faz background sync quando reconectar → envia `SYNC_COMPLETE`
9. `AppUpdateNotifier.OnSyncComplete` → `OfflineQueue.OnSyncComplete` + toast

### Timer State
- `_timerState` é `TimerStateDto?` mantido localmente
- Inicializado por `BuildTimerState(_detail)` no LoadTournament
- Atualizado pelos callbacks do DualTimerManager:
  - `OnTick` → atualiza `TimeRemainingSeconds`
  - `OnLevelChanged` → atualiza nível + blinds
  - `OnPauseChanged` → atualiza `Status`
  - `OnPrizePoolUpdated` → atualiza `PrizePool`
  - `OnPlayersChanged` → chama `RefreshPlayerData()` (busca dados fresh do servidor)

### Connection Banner
- Fixo no topo da página (abaixo do AppBar)
- 🟡 Reconnecting | 🔴 Offline

### Funcionalidades NÃO disponíveis no WASM MVP (mostram Snackbar "disponível na versão completa"):
- Adicionar jogador (AddTournamentPlayerDialog)
- Adicionar/editar despesas (AddExpenseDialog)
- Gerenciar delegados (ManageDelegatesDialog)
- Finalizar torneio usa flow simplificado (sem ConfirmPrizeDistributionDialog)

---

## DualTimerManager — Arquitetura Dual Timer

### Localização: Shared/DualTimerManager.razor (renderless)

### Parâmetros
- TournamentId, BlindStructure, InitialLevel, InitialTimeRemainingSeconds, InitialIsPaused
- EventCallbacks: OnTick, OnLevelChanged, OnPauseChanged, OnFinished, OnPrizePoolUpdated, OnPlayersChanged, OnConnectionChanged

### Comandos públicos (chamados pelo Dashboard)
- `PauseAsync()` — pausa timer local + envia via SignalR se online
- `ResumeAsync()` — retoma timer local + envia via SignalR se online
- `SkipLevelAsync()` — avança nível no Worker
- `PrevLevelAsync()` — volta nível no Worker

### Estado da conexão (enum ConnectionStatus)
- Connecting → Online → Reconnecting → Offline

---

## Service Worker (service-worker.published.js)
- Estratégias: network-first, stale-while-revalidate, cache-first-ttl, network-only+queue
- Auth nunca cacheada
- POST/PUT/DELETE offline → retorna 202 + `X-Offline-Queued: true`
- Background sync tag: `pokerhub-offline-queue`
- Limite cache API: 50MB, evicção LRU

---

## Padrões do Client

### Optimistic updates
- Usar `record with {}` para atualizar `_detail` localmente
- Chamar `StateHasChanged()` logo após
- O SW garante que o request HTTP será entregue quando online

### RenderFragment locais em Razor
- USAR sintaxe de método: `@StatCard(...)` 
- NAO usar sintaxe de componente `<StatCard .../>` (gera warning RZ10012)

### [JSInvokable] em WASM
- Devem ser public
- Não podem ter mesmo nome que [Parameter] EventCallback (CS0102)

---

## Páginas IMPLEMENTADAS (Sessão 2026-03-10)

| Rota | Arquivo | Status |
|------|---------|--------|
| `/ligas/{guid}/jackpot` | Liga/Jackpot/Index.razor + UseJackpotDialog.razor | OK — cache IndexedDB |
| `/torneios/{guid}/pagamentos` | Pagamento/TournamentPayments.razor | OK — cache + optimistic |
| `/meus-debitos` | Pagamento/MyDebts.razor | OK |
| `/registrar` | Auth/Register.razor | OK |
| `/ligas/criar` | Liga/Create.razor | OK |
| `/ligas/{guid}/editar` | Liga/Edit.razor | OK |
| `/jogadores/{guid}/editar` | Jogador/Edit.razor | OK |
| `/ligas/{guid}/torneios/criar` | Torneio/Create.razor | OK — wizard 5 steps |
| `/torneios/{guid}/editar` | Torneio/Edit.razor | OK |
| `/torneios/{guid}/duplicar` (dialog) | Torneio/DuplicateDialog.razor | OK |
| `/ligas/{guid}/tabelas-premiacao` | Liga/PrizeTables/Index.razor + PrizeTableDialog.razor | OK |
| `/ligas/{guid}/temporadas` | Liga/Seasons/Index.razor | OK |
| `/ligas/{guid}/temporadas/criar` | Liga/Seasons/Create.razor | OK |
| `/ligas/{guid}/temporadas/{guid}/editar` | Liga/Seasons/Edit.razor | OK |
| `/ligas/{guid}/temporadas/{guid}/ranking` | Liga/Seasons/Ranking.razor | OK |

## Auth — JWT Persistence (AuthStateService)
- `IJSRuntime` injetado no `AuthStateService`
- `InitializeAsync()` lê token do localStorage na inicialização
- Chamado em `App.razor.OnInitializedAsync()`
- `SetTokens()` e `ClearTokens()` salvam/limpam localStorage
- `IsTokenExpired()` com buffer de 1 minuto
- **PROBLEMA ABERTO**: Reload da página está deslogando o usuário (investigar na próxima sessão)

## Páginas PENDENTES (baixa prioridade)
| Rota | Prioridade |
|------|------------|
| `/torneios/entrar/{InviteCode}`, `/ligas/entrar` | BAIXA |
| Export de pagamentos | BAIXA |
