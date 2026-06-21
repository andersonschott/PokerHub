# Proposta de Design: Inativação de Jogadores

- **Data:** 2026-06-20
- **Autor:** Estudo técnico (Claude Code)
- **Status:** Proposta para revisão do Anderson
- **Tipo:** Research + Design (nenhum código de implementação foi escrito)

---

## 1. Problema

A liga acumula muitos participantes antigos que não jogam mais. Eles **não podem ser removidos** porque têm histórico (rankings, débitos, torneios passados) e **podem voltar a participar** no futuro. Precisamos de uma forma de **inativá-los** para limpar as listas de participantes, por dois caminhos:

1. **Manual** — o organizador marca o jogador como inativo/ativo.
2. **Por política de tempo** — a liga define "inativar após N meses sem participar".

**Regra central:** participante inativo **NÃO aparece** em dropdowns de seleção/ação (ex.: quem pagou uma despesa, delegar acessos, adicionar jogador ao torneio), mas **CONTINUA aparecendo** no histórico e nos rankings acumulados.

---

## 2. Descoberta-chave: `IsActive` já existe, mas com OUTRO significado

> **Esta é a descoberta mais importante do estudo e muda toda a abordagem.**

O campo `Player.IsActive` **já existe** (`src/PokerHub.Domain/Entities/Player.cs:17`, default `true`) e **já é filtrado em praticamente todas as listagens**. Porém, hoje ele significa **"removido / saiu da liga" (soft-delete)**, NÃO "inativo mas pode voltar".

Evidências de que `IsActive` hoje é soft-delete:

- `PlayerService.DeletePlayerAsync` (`src/PokerHub.Application/Services/PlayerService.cs:162-202`): ao "remover" um jogador com histórico, faz `player.IsActive = false` **e `player.UserId = null`** (desvincula a conta de usuário). Mensagem: *"Jogador removido. O histórico foi mantido nos rankings."*
- `LeagueService.LeaveLeagueAsync` (`src/PokerHub.Application/Services/LeagueService.cs:371-403`): quando um usuário sai da liga, faz `player.IsActive = false` **e `player.UserId = null`**.
- `IPlayerService.cs:16` documenta explicitamente: *"Soft deletes a player (sets IsActive = false)."*
- `PlayerService.DeletePlayerAsync:171-172` rejeita operar sobre um jogador que já está `IsActive=false` com a mensagem *"Jogador já foi removido."*

### Conflito semântico (risco se reutilizarmos `IsActive`)

Se sobrecarregarmos `IsActive` para também significar "inativo por inatividade", teremos:

1. **Indistinguibilidade:** "saiu da liga / removido" e "inativo mas pode voltar" ficam idênticos no banco — impossível separar nos relatórios e na reativação.
2. **Perda de vínculo:** o fluxo atual zera `UserId`. Um jogador apenas *inativado* (que pode voltar) **não deve** perder o vínculo com a conta — senão, ao reativar, ele não consegue mais se auto-inscrever nem receber delegação (o dropdown de delegados em `ManageDelegatesDialog` exige `UserId != null`).
3. **Reativação ambígua:** não há como saber se um `IsActive=false` foi removido de propósito ou só inativado por tempo.

**Conclusão:** precisamos de um **estado de jogador separado do soft-delete**. A recomendação (Seção 5) é introduzir um campo/enum próprio para inatividade, mantendo `IsActive` com o significado atual de soft-delete.

---

## 3. Modelo de dados atual

### 3.1 Entidade `Player` (`src/PokerHub.Domain/Entities/Player.cs`)

```
Id, LeagueId, Name, Nickname, Email, Phone, PixKey, PixKeyType,
UserId (string?, FK p/ conta Identity), CreatedAt, IsActive (= soft-delete hoje)
+ navegações: League, User, Participations (TournamentPlayer),
  PaymentsMade/Received, ExpensesPaid, ExpenseShares, SeasonStats
```

### 3.2 Relacionamentos

- **Player ↔ League: 1:N.** Cada `Player` pertence a **exatamente uma** liga (`Player.LeagueId`). Um mesmo humano que participa de várias ligas tem **vários `Player`** (um por liga), todos podendo apontar para o mesmo `UserId`. **Implicação:** inatividade é naturalmente **por jogador-na-liga**, não global — exatamente o que queremos.
- **Player ↔ User: N:1 opcional.** `Player.UserId` liga o registro de jogador a uma conta Identity (`User`). Pode ser `null` (jogador "avulso" criado pelo admin, sem login).
- **Player ↔ TournamentPlayer: 1:N (RESTRICT).** É a fonte de "atividade" (inscrição/check-in/resultado).
- **Delegados** (`TournamentDelegate`) são por **`UserId`**, não por `PlayerId` — por isso o dropdown de delegados depende de o jogador ter `UserId`.

### 3.3 Configuração EF (`PlayerConfiguration.cs`)

- `IsActive` é `required`, `HasDefaultValue(true)` (linhas 32-34).
- **Sem global query filter** em `Player` — todo filtro de `IsActive` é explícito em cada query (confirmado).
- **Índices existentes na tabela `Players`** (snapshot): `LeagueId` e `UserId`. **Não há índice em `IsActive` nem composto `(LeagueId, IsActive)`** — relevante para performance (Seção 9).

### 3.4 Migrations

- Padrão EF Core, pasta `src/PokerHub.Infrastructure/Data/Migrations/`. Última: `20260610220845_AddRefreshTokens`.
- `IsActive` já está no schema desde `20251215145414_InitialCreate` (coluna `bit not null default 1`).
- Comandos (ver `CLAUDE.md`): `dotnet ef migrations add Nome --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web --output-dir Data/Migrations` (exige `DOTNET_ROOT` e `PATH` exportados).

---

## 4. Mapa de superfícies (onde jogadores são listados/selecionados)

Legenda: **[ESCONDER]** = dropdown de seleção/ação, deve ocultar inativos · **[MANTER]** = histórico/ranking/admin, deve manter inativos.

### 4.1 Backend — Application/API

| Superfície | Arquivo:linha | Filtra hoje | Classificação |
|---|---|---|---|
| Lista de jogadores da liga (CRUD) | `PlayerService.cs:22-31` `GetPlayersByLeagueAsync` | `IsActive` | **[ESCONDER]** (mas hoje é a mesma que admin usa — ver §7) |
| Jogador por usuário (auto-inscrição etc.) | `PlayerService.cs:43-52`, `54-63` | `IsActive` | **[ESCONDER]** |
| Link por email no cadastro | `PlayerService.cs:249-272` | `IsActive` | **[ESCONDER]** |
| Liga com jogadores (lobby/listas) | `LeagueService.cs:68-123` (Include `Players.Where(p=>p.IsActive)`, l.73) | `IsActive` | **[ESCONDER]** (dropdown), mas é a fonte do lobby |
| Contagens de membros da liga | `LeagueService.cs:35,58,138,201,270` | `IsActive` | **[ESCONDER]** (contar só ativos faz sentido) |
| Acesso/membership da liga | `LeagueService.cs:294,319,328,385` | `IsActive` | **[ESCONDER]** |
| Auto-inscrição em torneio | `TournamentService.cs:1145,1192,1231` | `IsActive` | **[ESCONDER]** |
| Despesa — validação do pagador | `TournamentExpenseService.cs:56,153` | `IsActive` | **[ESCONDER]** |
| Despesa — dropdown "quem pagou" | `TournamentExpenseService.cs:297-309` `GetLeaguePlayersAsync` | `IsActive` | **[ESCONDER]** |
| Despesa — "dividir entre" (elegíveis) | `ExpenseService.GetEligiblePlayersForShareAsync` | só `IsCheckedIn` | **[ESCONDER]** (check-in já implica ativo) |
| Organizador p/ acerto de pagamentos | `PaymentService.cs:117` | `IsActive` | **[ESCONDER]** |
| **Ranking da liga** | `RankingService.cs:18-150` e `GetTournamentStatsRawAsync:168-215` | **NÃO filtra** (comentário l.273: *"Include inactive players to preserve history"*) | **[MANTER]** ✅ |
| **Stats individuais do jogador** | `RankingService.cs:352-449`, `PlayerService.GetPlayerStatsAsync:65-117` | **NÃO filtra** | **[MANTER]** ✅ |
| **Jogador por Id (read/edit)** | `PlayerService.cs:33-41` `GetPlayerByIdAsync` | **NÃO filtra** | **[MANTER]** ✅ |

**Endpoints API correspondentes:**
- `GET /api/leagues/{id}/players-list` → `GetPlayersByLeagueAsync` (filtra) — `PlayerEndpoints.cs:22`
- `GET /api/leagues/{id}/players` → `GetLeagueWithPlayersAsync` (filtra) — `LeagueEndpoints.cs:36`
- `GET /api/leagues/{id}/rankings` → ranking (NÃO filtra) — `RankingEndpoints.cs`
- `GET /api/players/{id}` / `/stats` / `/ranking-stats` (NÃO filtram) — `PlayerEndpoints.cs:61,77`
- `GET /api/tournaments/{id}/expenses/league-players` (filtra) — dropdown de despesa
- `PUT /api/players/{id}` → `UpdatePlayerAsync` — `PlayerEndpoints.cs:94` (hoje **ignora** qualquer flag de status; `UpdatePlayerDto.cs` não tem campo de status)

### 4.2 React (`web/`) — frontend alvo da migração

| Superfície | Arquivo:linha | Origem dos dados | Classificação |
|---|---|---|---|
| Hook principal de jogadores | `web/src/lib/api/hooks/use-players.ts:35-41` `usePlayers` → `/players-list` | herda filtro do backend (só ativos) | depende do uso |
| Hook alternativo | `web/src/lib/api/hooks/use-leagues.ts:108-115` `useLeaguePlayers` → `/players` | só ativos | depende do uso |
| **Gerenciar Jogadores (admin)** | `web/src/routes/app/ligas/[id]/jogadores.tsx:50-106` | `usePlayers` (só ativos hoje!) | **[MANTER]** — precisa ver inativos p/ reativar |
| **Admin da liga (remover membro)** | `web/src/routes/app/perfil/admin.tsx:166-232,248` | `usePlayers` (só ativos hoje!) | **[MANTER]** — precisa gerir status |
| Comparar jogadores | `web/src/routes/app/comparar.tsx:46-143` | `useLeagueRanking` (sem campo isActive) | **[ESCONDER]** (seleção) |
| Eliminar jogador (ao vivo) | `web/src/features/live/eliminate-sheet.tsx:19-55` | jogadores do torneio (já filtrados por contexto) | **[ESCONDER]** ✅ já ok |
| Check-in / mesa / eliminados (ao vivo) | `web/src/routes/app/torneio/dashboard.tsx:289-364` | contexto do torneio | **[ESCONDER]/[MANTER]** ✅ já ok |
| Ranking / standings | `web/src/routes/app/ranking.tsx`, `features/rankings/*` | `useLeagueRanking` (não filtra) | **[MANTER]** ✅ |

**Observações React importantes:**
- `web/.../use-players.ts:14-22` o `UpdatePlayerDto` do front **já tem `isActive?: boolean`**, mas o backend (`UpdatePlayerDto.cs`) **não tem esse campo** e `UpdatePlayerAsync` o ignora → o toggle não funciona hoje.
- **Não existem ainda telas de Despesa nem de Delegados no React** (recursos não migrados). A regra de filtro nesses dropdowns será aplicada quando forem construídos — o backend já entrega só ativos via `/players-list`.
- **Gap de UX crítico:** as duas telas de administração de jogadores no React (`jogadores.tsx`, `admin.tsx`) chamam `/players-list`, que **só retorna ativos**. Logo, **hoje seria impossível ver um jogador inativo para reativá-lo.** É preciso um endpoint/param que inclua inativos para as telas de admin (Seção 7).

### 4.3 Blazor (`src/PokerHub.Web`) — legado

| Superfície | Arquivo:linha | Filtra | Classificação |
|---|---|---|---|
| Despesa — "Quem pagou" | `Components/Pages/Torneio/AddExpenseDialog.razor:34-45` (via `GetLeaguePlayersAsync`) | `IsActive` | **[ESCONDER]** ✅ |
| Despesa — "Dividir entre" | `AddExpenseDialog.razor:66,85` (via `GetEligiblePlayersForShareAsync`) | `IsCheckedIn` | **[ESCONDER]** ✅ |
| Delegados — autocomplete | `Components/Pages/Torneio/ManageDelegatesDialog.razor:57-64,100-119` (via `GetPlayersByLeagueAsync`) | `IsActive` **+ exige `UserId != null`** | **[ESCONDER]** ✅ |
| Adicionar jogador ao torneio | `Components/Pages/Torneio/AddTournamentPlayerDialog.razor:8-20` (via `GetPlayersByLeagueAsync`) | `IsActive` | **[ESCONDER]** ✅ |
| Criar jogador (form) | `Components/Pages/Liga/AddPlayerDialog.razor` | — | N/A (cria) |
| Lobby da liga — lista de membros | `Components/Pages/Liga/Details.razor:120,681` (via `GetLeagueWithPlayersAsync`) | `IsActive` | **[ESCONDER]** (mas é também onde o admin gerencia) |
| Stats do jogador | `Components/Pages/Jogador/Edit.razor:472` | não filtra | **[MANTER]** ✅ |
| Editar jogador | `Components/Pages/Jogador/Edit.razor:165` | não filtra | **[MANTER]** ✅ |

**Observação Blazor crítica:** `ManageDelegatesDialog` exige `UserId != null`. Confirma que **inativação não pode zerar `UserId`** (diferente do soft-delete atual).

---

## 5. Proposta de design

### 5.1 Campos de modelo (recomendado)

Adicionar a `Player`, **sem mexer no significado de `IsActive`** (que continua = soft-delete/"saiu da liga"):

```csharp
// Status de participação, independente do soft-delete (IsActive)
public PlayerMembershipStatus MembershipStatus { get; set; } = PlayerMembershipStatus.Active;
public DateTime? DeactivatedAt { get; set; }     // quando virou inativo (manual ou política)
public DateTime? LastActivityAt { get; set; }    // última atividade relevante (ver 5.3)
public bool DeactivatedManually { get; set; }    // true=manual, false=por política (evita reativação automática indevida)
```

```csharp
public enum PlayerMembershipStatus { Active = 0, Inactive = 1 }
```

> **Alternativa minimalista** (se quiser menos campos): usar um único `bool IsInactive` + `DeactivatedAt` + `LastActivityAt`. O enum é preferível por extensibilidade (futuro: `Suspended`, `Banned`) e legibilidade. **Decisão aberta D1.**

**Por que NÃO reutilizar `IsActive`:** ver Seção 2 (indistinguibilidade com soft-delete, perda de `UserId`, reativação ambígua). Mantemos `IsActive` para soft-delete e adicionamos status próprio para inatividade.

### 5.2 Flag persistido vs. computado on-the-fly

| Abordagem | Prós | Contras |
|---|---|---|
| **A. Flag persistido** (`MembershipStatus`) atualizado por job + manual | Query simples e indexável (`WHERE LeagueId=X AND MembershipStatus=Active`); estado explícito e auditável; suporta override manual; consistente entre apps | Precisa de job/serviço para aplicar a política; risco de "drift" se o job falhar |
| **B. Computado on-read** (`LastActivityAt < hoje - limiar`) | Sem job; sempre "atual" | Não permite override manual de forma limpa; filtro vira `WHERE LastActivityAt >= corte` (precisa manter `LastActivityAt`); difícil combinar manual + automático; cada superfície precisa repetir a regra; não indexável de forma trivial p/ "ativos" |

**Recomendado: A (flag persistido) + B como insumo.** Persistimos `MembershipStatus` (fonte da verdade para filtros) e mantemos `LastActivityAt` como dado de apoio que o job lê para decidir inativar. Isso atende **manual + política** de forma limpa e mantém todas as queries simples e indexáveis.

### 5.3 O que conta como "atividade" (`LastActivityAt`)

Proposta: `LastActivityAt = MAX(` data dos eventos abaixo `)`:
- Inscrição/registro em torneio (`TournamentPlayer.CheckedInAt` ou criação da participação);
- Check-in (`TournamentPlayer.CheckedInAt`);
- Participação em torneio **finalizado** (data do torneio).

Pagamentos/despesas **não** deveriam contar como "voltou a jogar" (são consequência de jogos passados). **Decisão aberta D2.**

Para dados legados sem torneios individuais (`PlayerSeasonStats`), usar a data fim da temporada como proxy no backfill.

### 5.4 Inativação manual

- Endpoint dedicado (não sobrecarregar `DELETE`): `POST /api/players/{id}/deactivate` e `POST /api/players/{id}/activate` (organizador da liga).
- `deactivate`: `MembershipStatus=Inactive`, `DeactivatedAt=now`, `DeactivatedManually=true`. **Não** mexe em `UserId` nem em `IsActive`.
- `activate`: `MembershipStatus=Active`, `DeactivatedAt=null`, `DeactivatedManually=false`.
- Autorização: `IsUserOrganizerAsync` (mesmo padrão de `PUT /api/players/{id}`).

### 5.5 Inativação por política de tempo

- Config por liga: `InactivityThresholdMonths` (int?, `null` = política desligada) — ver 5.7.
- **Serviço/job** (recomendado: background service no estilo de `TournamentTimerService`, ou um job idempotente disparável):
  - Para cada liga com `InactivityThresholdMonths != null`, marcar `MembershipStatus=Inactive`, `DeactivatedAt=now`, `DeactivatedManually=false` para jogadores com `LastActivityAt < now - threshold` que estejam `Active` e `IsActive=true` (não soft-deletados).
  - Executar com baixa frequência (diário). Idempotente.
- **Não** desativa jogadores marcados manualmente como ativos? → ver D3 (precedência manual vs. política).

### 5.6 Reativação

- **Manual:** endpoint `activate` (5.4).
- **Automática ao voltar a jogar:** quando o jogador é inscrito/check-in em um torneio, se `MembershipStatus=Inactive` **e** `DeactivatedManually=false`, reativar automaticamente (atualizar `LastActivityAt`). Se foi inativado **manualmente**, **não** reativar sozinho (respeita a decisão do organizador) — apenas o organizador reativa. **Decisão aberta D3.**
- Pontos de gancho: `TournamentService.SelfRegisterPlayerAsync` (`:1145`), `AddPlayerToTournamentAsync`, `CheckInPlayerAsync`.

### 5.7 Configuração por liga

Adicionar a `League` (`src/PokerHub.Domain/Entities/League.cs`):
```csharp
public int? InactivityThresholdMonths { get; set; } // null = não inativar automaticamente
```
- Refletir em `LeagueDto`/`UpdateLeagueDto` e na tela de edição de liga (React: `web/src/routes/app/ligas/nova.tsx` e edição; Blazor: `Liga/Edit.razor`).
- Mantém o padrão de `BlockCheckInWithDebt` (já existe config booleana por liga).

### 5.8 Regras de filtro por superfície (resumo)

- **[ESCONDER] inativos** (`MembershipStatus=Active` no WHERE): dropdown "quem pagou" despesa, "dividir entre", delegados, adicionar jogador ao torneio, auto-inscrição, comparar jogadores, contagens de membros, checagens de acesso. Hoje essas queries já filtram `IsActive`; basta **adicionar** `&& MembershipStatus == Active` (e manter `IsActive` para excluir soft-deletados).
- **[MANTER] inativos:** ranking da liga, stats individuais, leitura/edição de jogador por Id. Já não filtram — manter assim.
- **[NOVO — telas de admin]** precisam de uma listagem que inclua inativos (mas exclua soft-deletados): ver Seção 7.

---

## 6. Migração / backfill

1. **Migration de schema:** adicionar `Player.MembershipStatus` (default `Active`/0), `DeactivatedAt`, `LastActivityAt`, `DeactivatedManually` (default `false`); adicionar `League.InactivityThresholdMonths` (nullable). Criar índice `(LeagueId, MembershipStatus)` em `Players` (Seção 9).
2. **Backfill `LastActivityAt`:** popular com `MAX` das datas de atividade (5.3) por jogador. Jogadores sem nenhuma atividade ficam com `LastActivityAt = CreatedAt`.
3. **Backfill de status:** **todos os `IsActive=true` começam como `Active`** (default seguro). Opcional: rodar a política uma vez no deploy para já inativar quem está há muito tempo parado — **só se o Anderson autorizar** (mudança visível). **Decisão aberta D4.**
4. Jogadores hoje `IsActive=false` (soft-deletados) **permanecem soft-deletados**; não recebem status de inatividade (já estão fora de tudo).

---

## 7. Telas de admin (gerir ativo/inativo)

**Prioridade: React** (alvo da migração).

**Problema:** `jogadores.tsx` e `admin.tsx` usam `/players-list`, que só traz ativos. Para reativar, o admin precisa **ver** o inativo.

**Opções (Decisão aberta D5):**
- **Opção 1 (recomendada):** novo parâmetro no endpoint de listagem: `GET /api/leagues/{id}/players-list?includeInactive=true` (apenas organizador). Retorna ativos + inativos (mas continua excluindo soft-deletados). Front: telas de admin passam `includeInactive=true` e mostram badge "Ativo/Inativo" com toggle.
- **Opção 2:** endpoint separado `GET /api/leagues/{id}/players-list/all`.
- **Opção 3:** sempre retornar ativos+inativos e deixar o front filtrar — **não recomendado** (vazaria inativos para quem consome a mesma lista em dropdowns).

**UI proposta (React):**
- `jogadores.tsx`: badge de status já existe (`{player.isActive ? 'Ativo' : 'Inativo'}` em `:93`, hoje refletindo soft-delete). Trocar para refletir `MembershipStatus`; adicionar botão "Inativar"/"Reativar" chamando os endpoints da 5.4; seção colapsável "Inativos".
- Edição de liga: campo "Inativar automaticamente após (meses)".
- **Substituir os `prompt()/confirm()`** atuais (`jogadores.tsx:19,67,78`) por dialog/sheet apropriado ao padrão visual.

**Blazor (paridade):** `Liga/Details.razor` (lista de membros) ganha toggle de status; `Liga/Edit.razor` ganha o campo de limiar. Como o Blazor é legado, manter paridade mínima conforme prioridade do Anderson (D6 implícito).

---

## 8. Impacto em EF global query filters

- **NÃO adicionar global query filter** de `MembershipStatus` em `Player`. Motivo: ranking/stats (`RankingService`) precisam ler **todos** os jogadores; um filtro global quebraria o histórico (o codebase hoje evita justamente isso ao não ter global filter para `IsActive`). Manter o padrão atual de **filtro explícito por query** nas superfícies [ESCONDER].

---

## 9. Índices e queries

- O padrão dominante vira `WHERE LeagueId = @id AND IsActive = 1 AND MembershipStatus = 0`.
- **Criar índice composto** `IX_Players_LeagueId_MembershipStatus` (ou `(LeagueId, IsActive, MembershipStatus)`), pois hoje só há índice em `LeagueId`. Melhora os dropdowns e contagens de membros.
- Queries de ranking continuam por `LeagueId` (já coberto).

---

## 10. Plano de implementação faseado

**Fase 1 — Domain + Migration**
- Adicionar enum `PlayerMembershipStatus`; campos em `Player`; `League.InactivityThresholdMonths`.
- `PlayerConfiguration`: índice composto; defaults.
- Migration + backfill (`LastActivityAt`, status `Active`).
- *Risco:* baixo (aditivo). *Decisão:* D1 (formato do campo), D4 (rodar política no deploy?).

**Fase 2 — Application/Services**
- Métodos `DeactivatePlayerAsync`/`ActivatePlayerAsync` em `IPlayerService`/`PlayerService`.
- Atualizar `LastActivityAt` e reativação automática nos pontos de inscrição/check-in (`TournamentService`).
- Serviço de política (job) de inativação por tempo.
- Adicionar `&& MembershipStatus == Active` nas queries [ESCONDER] (lista acima na §4.1).
- `GetPlayersByLeagueAsync` com flag `includeInactive` (para admin) — D5.
- *Risco:* médio — não esquecer nenhuma superfície [ESCONDER]; cuidado para NÃO tocar ranking/stats.

**Fase 3 — API**
- Endpoints `POST /api/players/{id}/deactivate|activate` (organizador).
- Param `?includeInactive=true` em `/players-list` (organizador) — D5.
- `League` config (`InactivityThresholdMonths`) em `UpdateLeagueDto`/endpoints.
- *Risco:* baixo.

**Fase 4 — React (prioridade)**
- Hooks: `useDeactivatePlayer`/`useActivatePlayer`; `usePlayers(leagueId, { includeInactive })`.
- Corrigir `UpdatePlayerDto` front/back (hoje `isActive` no front é ignorado pelo back).
- Telas `jogadores.tsx` e `admin.tsx`: badge de status real, toggle, seção "Inativos".
- Edição de liga: campo de limiar.
- Substituir `prompt/confirm` por dialogs do design system.
- *Risco:* baixo/médio (UX).

**Fase 5 — Blazor (paridade mínima)**
- Toggle de status em `Liga/Details.razor`; campo de limiar em `Liga/Edit.razor`.
- Dropdowns já filtram `IsActive`; adicionar `MembershipStatus` via os mesmos services (herdado da Fase 2).
- *Risco:* baixo.

---

## 11. Decisões abertas (dependem do Anderson)

- **D1 — Modelo do campo:** enum `PlayerMembershipStatus` (recomendado) **vs.** `bool IsInactive` minimalista. Quantos campos auxiliares (`DeactivatedAt`, `LastActivityAt`, `DeactivatedManually`)?
- **D2 — Definição de "atividade":** só torneios (inscrição/check-in/jogo) ou também pagamentos/despesas contam para `LastActivityAt`?
- **D3 — Precedência manual × política e reativação automática:** quem foi inativado **manualmente** deve ser reativado automaticamente ao voltar a jogar, ou só o organizador reativa? (Recomendação: só organizador reativa o que foi manual; política reativa o que foi automático.)
- **D4 — Backfill ativo:** rodar a política de inatividade **uma vez no deploy** (já inativando quem está parado há muito tempo) ou começar todos como ativos e só inativar dali pra frente?
- **D5 — Exposição p/ admin:** `?includeInactive=true` no `/players-list` (recomendado) vs. endpoint separado vs. lista única. Necessário para as telas de reativação.

---

## 12. Resumo das fontes (arquivos-chave)

- Domain: `src/PokerHub.Domain/Entities/Player.cs`, `League.cs`, `TournamentPlayer.cs`, `TournamentDelegate.cs`, `PlayerSeasonStats.cs`.
- EF: `src/PokerHub.Infrastructure/Data/Configurations/PlayerConfiguration.cs`; snapshot em `Data/Migrations/PokerHubDbContextModelSnapshot.cs`.
- Services: `PlayerService.cs`, `LeagueService.cs`, `TournamentService.cs`, `TournamentExpenseService.cs`, `RankingService.cs`, `PaymentService.cs`.
- API: `PlayerEndpoints.cs`, `LeagueEndpoints.cs`, `RankingEndpoints.cs`, `Expenses/ExpenseEndpoints.cs`, `Tournaments/TournamentEndpoints.cs`.
- React: `web/src/lib/api/hooks/use-players.ts`, `use-leagues.ts`, `use-rankings.ts`; `web/src/routes/app/ligas/[id]/jogadores.tsx`, `web/src/routes/app/perfil/admin.tsx`, `comparar.tsx`, `ranking.tsx`.
- Blazor: `Components/Pages/Torneio/{AddExpenseDialog,ManageDelegatesDialog,AddTournamentPlayerDialog}.razor`, `Components/Pages/Liga/{Details,Edit,AddPlayerDialog}.razor`, `Components/Pages/Jogador/Edit.razor`.
