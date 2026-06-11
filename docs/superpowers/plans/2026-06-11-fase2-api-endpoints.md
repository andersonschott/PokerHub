# Fase 2+ — Endpoints REST da API (paralelo ao front) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development ou superpowers:executing-plans. Steps usam checkbox (`- [ ]`).

**Goal:** Expor via `PokerHub.Api` (minimal APIs) os domínios que as telas do front (Fase 1+) vão consumir — Tournaments, Payments, Players, Seasons, Rankings, PrizeTables, Jackpot (Caixinha) e Expenses — como **camada fina** sobre os services existentes de `PokerHub.Application`, com testes de integração, sem tocar no front nem no Blazor.

**Working directory:** `/var/home/aschott/Projects/PokerHub-api` (git worktree na branch `feature/fase2-api-endpoints`, criada a partir de `develop`). NUNCA trabalhar no diretório principal (`/var/home/aschott/Projects/PokerHub` está ocupado pelo stream do front).

**Padrões canônicos (LER ANTES de cada task):**
- `src/PokerHub.Api/Leagues/LeagueEndpoints.cs` — o exemplo de referência: `MapGroup` + `.WithTags(...)` + `.RequireAuthorization()`, autorização via métodos do próprio service (`CanUserAccessLeagueAsync`, `IsUserOrganizerAsync`), `Results.Ok/Created/NotFound/Forbid/Conflict`, DTOs dos services como contrato (sem DTOs novos na API, exceto requests pequenos `record` quando o service pede parâmetros soltos).
- `src/PokerHub.Api/Common/ClaimsPrincipalExtensions.cs` — `user.GetUserId()` (claim `sub`).
- `src/PokerHub.Api/Program.cs` — onde registrar cada `XEndpoints.Map(app)`.
- `tests/PokerHub.Api.Tests/` — harness existente (`ApiFactory`, `AuthEndpointsTests`, `LeagueEndpointsTests`): seguir o MESMO estilo (xunit `Assert.*`, `IClassFixture<ApiFactory>`, helpers de registro/login, sem FluentAssertions).
- Interfaces dos services: `src/PokerHub.Application/Interfaces/I*.cs`; DTOs: `src/PokerHub.Application/DTOs/<Domínio>/`.

**Regras:**
1. Endpoint nasce espelhando método de service existente. **Não criar lógica de negócio na API.** Se faltar método no service para uma ação que o front precisa, adicionar o MÍNIMO no service (com teste unitário em `tests/PokerHub.Application.Tests`) e sinalizar no relatório.
2. Autorização SEMPRE: membro da liga para leitura (`CanUserAccessLeagueAsync`), organizador/delegado para escrita (`IsUserOrganizerAsync` / `CanUserManageTournamentAsync` / `HasDelegatePermissionAsync` — conferir os métodos reais nas interfaces).
3. Rotas REST por domínio (prefixos): `/api/leagues/{leagueId}/tournaments`, `/api/tournaments/{id}/...`, `/api/tournaments/{id}/payments`, `/api/players`, `/api/leagues/{leagueId}/seasons`, `/api/leagues/{leagueId}/rankings`, `/api/leagues/{leagueId}/prize-tables`, `/api/leagues/{leagueId}/jackpot`, `/api/tournaments/{id}/expenses`.
4. TDD: teste de integração falhando → endpoint → verde. Cobrir por grupo: happy path, 401 sem token, 403 não-membro/não-organizador, 404.
5. Commits frequentes em inglês (`feat:`/`test:`), um domínio por commit no mínimo.
6. `dotnet build` e `dotnet test tests/PokerHub.Api.Tests` verdes antes de cada commit. NUNCA rodar `dotnet ef database update` (sem migrations nesta fase; se uma parecer necessária, PARAR e reportar BLOCKED).
7. O front consome camelCase — não mexer na serialização default.

---

### Task B1: Tournaments endpoints

**Files:** Create `src/PokerHub.Api/Tournaments/TournamentEndpoints.cs`; Modify `src/PokerHub.Api/Program.cs`; Test `tests/PokerHub.Api.Tests/TournamentEndpointsTests.cs`.

- [x] Ler `ITournamentService` inteiro e mapear: listagem por liga (+filtro por status), detalhe (com players/blinds), criação (wizard: dados + blinds + premiação — o DTO de criação existente do service), edição, cancelamento/exclusão, duplicação (se houver método; senão GET do detalhe serve ao front), auto-inscrição (`SelfRegisterPlayerAsync`/`SelfUnregisterPlayerAsync`/`IsUserRegisteredInTournamentAsync`), admin add player (`AddPlayerToTournamentAsync`), check-in, rebuy, add-on, eliminação (com `eliminatedByPlayerId`), undo de eliminação (se existir), finish (`FinishTournament*`), delegados (listar/conceder/revogar se a interface expuser).
- [x] Testes de integração primeiro (criar liga + temporada se necessário via API/семservices no harness), depois endpoints, verde.
- [x] Commit `feat: add tournament endpoints (CRUD, registration, live actions)`.

### Task B2: Payments endpoints

**Files:** Create `src/PokerHub.Api/Payments/PaymentEndpoints.cs`; Modify `Program.cs`; Test `tests/PokerHub.Api.Tests/PaymentEndpointsTests.cs`.

- [x] Ler `IPaymentService`: cálculo/listagem de pagamentos do torneio, débitos pendentes por jogador (`GetPendingDebtsByPlayerAsync`), meus débitos (do usuário logado — resolver Player do user na liga), marcar pago, confirmar, confirmação em massa, recalcular. Autorização: envolvido (pagador/recebedor) marca pago; organizador confirma.
- [x] TDD; commit `feat: add payment endpoints (tournament settlement, debts, confirm flow)`.

### Task B3: Players + Seasons endpoints

**Files:** Create `src/PokerHub.Api/Players/PlayerEndpoints.cs`, `src/PokerHub.Api/Seasons/SeasonEndpoints.cs`; Modify `Program.cs`; Tests correspondentes.

- [x] `IPlayerService`: lista por liga, detalhe, criar/editar/remover (organizador), vincular user (se houver). `ISeasonService`: listar por liga, ativa/atual, criar, encerrar.
- [x] TDD; commits `feat: add player endpoints` e `feat: add season endpoints`.

### Task B4: Rankings + PrizeTables endpoints

**Files:** Create `src/PokerHub.Api/Rankings/RankingEndpoints.cs`, `src/PokerHub.Api/PrizeTables/PrizeTableEndpoints.cs`; Modify `Program.cs`; Tests.

- [x] `IRankingService`: ranking da temporada (ordenável por lucro/ROI/ITM se o service suportar — senão devolver o DTO completo e o front ordena), ranking geral acumulado, stats do jogador (`PlayerStats`). `IPrizeTableService`: CRUD de tabelas de premiação da liga.
- [x] TDD; commit `feat: add ranking and prize-table endpoints`.

### Task B5: Jackpot (Caixinha) + Expenses endpoints

**Files:** Create `src/PokerHub.Api/Jackpot/JackpotEndpoints.cs`, `src/PokerHub.Api/Expenses/ExpenseEndpoints.cs`; Modify `Program.cs`; Tests.

- [x] `IJackpotService`: saldo + extrato (entradas/saídas), registrar gasto, usar em torneio (organizador). `ITournamentExpenseService`: CRUD de despesas do torneio + shares (`UpdateExpenseAsync` pattern do CLAUDE.md).
- [x] TDD; commit `feat: add jackpot and expense endpoints`.

### Task B6: Smoke final do stream

- [x] `dotnet build` + `dotnet test` (TODOS os projetos de teste) verdes no worktree.
- [x] Subir a API local do worktree (`ASPNETCORE_URLS=http://localhost:5101 dotnet run --project src/PokerHub.Api --no-build` — porta 5101 para não colidir com o front stream) e conferir `/openapi/v1.json` contém os novos grupos; derrubar.
- [x] Atualizar `docs/superpowers/plans/2026-06-11-fase2-api-endpoints.md` (este arquivo) marcando checkboxes; commit `docs: mark fase2 endpoint tasks done`.
- [x] NÃO mergear na develop — o controller coordena o merge após o gate do front.

## Fora de escopo
- IExportService (PDF/Excel), SignalR/hub (Fase 4), migrations, mudanças no PokerHub.Web, deploy.
