# PokerHub Client (WASM) - Status de Desenvolvimento

## Ultima atualizacao: 2026-03-05

## Contexto
O projeto `src/PokerHub.Client/` é um app Blazor WebAssembly separado do `PokerHub.Web` (Blazor Server).
Ele consome a API REST em `src/PokerHub.Web/Controllers/Api/`.
O objetivo é ter um cliente WASM offline-capable (branch `feature/offline`).

---

## Arquitetura do Client

### Estrutura de pastas
```
src/PokerHub.Client/
├── Pages/
│   ├── Liga/
│   │   ├── Index.razor          # /ligas
│   │   ├── Details.razor        # /ligas/{LeagueId:guid}
│   │   └── AddPlayerDialog.razor
│   ├── Torneio/
│   │   └── Index.razor          # /torneios e /ligas/{LeagueId:guid}/torneios
│   ├── Ranking/
│   │   ├── PlayerStats.razor    # /jogador/{PlayerId:guid}/stats
│   │   └── Compare.razor        # /ligas/{LeagueId:guid}/comparar
│   ├── Home.razor               # /
│   └── Login.razor              # /login
├── Services/
│   ├── Http/
│   │   ├── HttpLeagueService.cs
│   │   ├── HttpPlayerService.cs
│   │   ├── HttpTournamentService.cs
│   │   ├── HttpPaymentService.cs
│   │   ├── HttpRankingService.cs
│   │   ├── HttpExpenseService.cs
│   │   ├── HttpSeasonService.cs
│   │   ├── HttpJackpotService.cs
│   │   └── HttpPrizeTableService.cs
│   ├── AuthStateService.cs
│   └── AuthTokenHandler.cs
├── Layout/
├── Shared/
│   └── RedirectToLogin.razor
└── Helpers/
```

### APIs REST disponíveis (Controllers)
- `AuthController`
- `LeaguesController`
- `PlayersController`
- `TournamentsController`
- `PaymentsController`
- `RankingsController`
- `ExpensesController`
- `SeasonsController`
- `JackpotsController`
- `PrizeTablesController`

---

## Páginas IMPLEMENTADAS no Client

| Rota | Arquivo | Status |
|------|---------|--------|
| `/` | Home.razor | ✅ |
| `/login` | Login.razor | ✅ |
| `/ligas` | Liga/Index.razor | ✅ |
| `/ligas/{guid}` | Liga/Details.razor | ✅ |
| `/torneios` e `/ligas/{guid}/torneios` | Torneio/Index.razor | ✅ |
| `/jogador/{guid}/stats` | Ranking/PlayerStats.razor | ✅ |
| `/ligas/{guid}/comparar` | Ranking/Compare.razor | ✅ |

---

## Páginas PENDENTES (existem no Web mas NÃO no Client)

| Rota | Arquivo Web de referência | Prioridade |
|------|--------------------------|------------|
| `/torneios/{guid}` | Torneio/Dashboard.razor | ALTA (reportado como faltando) |
| `/ligas/{guid}/jackpot` | Liga/Jackpot/Index.razor | ALTA (reportado como faltando) |
| `/ligas/criar` | Liga/Create.razor | MÉDIA |
| `/ligas/{guid}/editar` | Liga/Edit.razor | MÉDIA |
| `/ligas/{guid}/torneios/criar` | Torneio/Create.razor | MÉDIA |
| `/torneios/{guid}/editar` | Torneio/Edit.razor | MÉDIA |
| `/torneios/{guid}/pagamentos` | Pagamento/TournamentPayments.razor | MÉDIA |
| `/torneios/entrar/{InviteCode}` | Torneio/Join.razor | BAIXA |
| `/ligas/entrar` e `/ligas/entrar/{code}` | Liga/Join.razor | BAIXA |
| `/ligas/{guid}/temporadas` | Liga/Seasons/Index.razor | BAIXA |
| `/ligas/{guid}/temporadas/criar` | Liga/Seasons/Create.razor | BAIXA |
| `/ligas/{guid}/temporadas/{guid}/ranking` | Liga/Seasons/Ranking.razor | BAIXA |
| `/ligas/{guid}/tabelas-premiacao` | Liga/PrizeTables/Index.razor | BAIXA |
| `/jogador/{guid}/editar` | Jogador/Edit.razor | BAIXA |
| `/timer/{guid}` | Timer/Index.razor | BAIXA |

---

## Padrões do Client

### Http Services
- Implementam as mesmas interfaces do Application layer (`ILeagueService`, etc.)
- Injetam `HttpClient` configurado com `AuthTokenHandler`
- Usam `GetFromJsonAsync`, `PostAsJsonAsync`, `PutAsJsonAsync`, `DeleteAsync`

### Autenticação
- `AuthStateService`: gerencia estado de auth no WASM
- `AuthTokenHandler`: DelegatingHandler que injeta Bearer token nas requests
- `RedirectToLogin.razor`: componente para redirecionar não-autenticados

### Padrão de página
- Não usar `@rendermode InteractiveServer` (WASM já é interativo por natureza)
- Usar `[Authorize]` ou `<AuthorizeView>` para páginas protegidas
- Carregar dados em `OnInitializedAsync`

---

## Próximos passos sugeridos
1. Implementar `/torneios/{guid}` (Dashboard) no Client — mais crítico
2. Implementar `/ligas/{guid}/jackpot` no Client
3. Verificar se TournamentsController expõe todos os endpoints necessários para o Dashboard
