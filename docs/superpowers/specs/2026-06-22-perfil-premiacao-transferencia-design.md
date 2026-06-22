# Design — Perfil real, manutenção de tabelas de premiação e transferência de propriedade

**Data:** 2026-06-22
**Alvo:** app React em `web/` consumindo `PokerHub.Api` (minimal APIs, .NET 10).
**Contexto:** retomada da migração Blazor → React. Três frentes independentes, cada uma
implementável e mergeável isoladamente. Ordem recomendada: A → B → C (risco crescente).

---

## Diagnóstico (estado atual verificado)

- **Perfil** (`web/src/routes/app/perfil/index.tsx`): nome, e-mail, caixinha, tema já são reais.
  Mock: os 2 cards de stats (`Lucro na temporada = 1840`, `ITM = 62%`, chumbados em
  `index.tsx:170-184`). PIX e WhatsApp salvam **só em `localStorage`** (`ph.pix_key`,
  `ph.whatsapp`) — não persistem no cadastro do jogador, embora `PlayerDto` já tenha
  `pixKey`/`pixKeyType`/`phone`.
- **Premiação**: o contrato real servido pela API é
  `LeaguePrizeTableDto { id, leagueId, name, prizePoolTotal, jackpotAmount,
  entries: [{ position, prizeAmount }], createdAt }` — **valores fixos em R$ por prize pool
  exato**, com `jackpotAmount` (caixinha). Os tipos do React em
  `web/src/lib/api/hooks/use-prize-tables.ts` (`tiers[].percentage`, `description`) estão
  **dessincronizados** e a tela `web/src/routes/app/ligas/[id]/tabelas-premiacao.tsx` é um
  stub com `prompt()`/`confirm()` que envia payload inválido. O display no admin
  (`perfil/admin.tsx:486-536`) lê `tiers`/`percentage` → sempre cai no fallback estático
  50/30/20. O backend (`PrizeTableService`) já faz CRUD e auto-match por
  `PrizePoolTotal == prizePool` em `CalculatePrizeDistributionAsync`, e o Blazor já usa
  (`Liga/PrizeTables/Index.razor` + `PrizeTableDialog.razor`).
- **Transferência de propriedade**: inexistente. `League` tem um único `OrganizerId`
  (`src/PokerHub.Domain/Entities/League.cs:9`); não há papel de co-admin. Nenhum endpoint
  nem UI.

---

## Feature A — Perfil real

### Requisitos
1. `Lucro na temporada` e `ITM` reais para o usuário logado.
2. PIX e WhatsApp persistidos no cadastro do jogador (pessoais — valem para **todas** as
   ligas do usuário). Confirmado pelo usuário.
3. Trocar senha pela própria tela.

### A.1 Stats reais (frontend-only)
- Fonte: ranking da temporada ativa da **liga ativa** (`useActiveLeague().activeLeagueId`).
- Resolução do jogador: `useLeaguePlayers(activeLeagueId)` → achar `p.userId === user.userId`
  → `playerId`. Ler `profit` e `itmRate` do entry correspondente em
  `useSeasonRanking(activeSeason.id)` (mesma fonte que a aba Ranking do home da liga).
- Fallbacks (nunca exibir número falso): sem liga ativa, sem temporada ativa, sem player
  vinculado, ou sem entry no ranking → exibir `—` (Lucro) e `—` (ITM). Loading → skeleton.
- Aplica tanto ao layout mobile quanto ao bloco desktop (ambos têm os tiles duplicados).

### A.2 PIX/WhatsApp persistidos (backend novo + frontend)
**Backend** — novo grupo autenticado `/api/me`:
- `GET /api/me/contact` → `{ pixKey, pixKeyType, phone }` lidos de qualquer `Player` vinculado
  ao usuário (o mais recente; todos devem estar sincronizados).
- `PUT /api/me/contact { pixKey?, pixKeyType?, phone? }` → aplica em **todos** os `Player`
  com `UserId == currentUserId`. Retorna o contato resultante.
- `IPlayerService.UpdateContactForUserAsync(string userId, UpdateContactDto dto)` — atualiza
  todos os players do usuário numa transação; no-op silencioso se o usuário não tem player.
- `pixKeyType` é opcional/nullable; a UI atual envia `null` (sem seletor de tipo — fora de
  escopo). Mantido no DTO para evolução futura.

**Frontend** (`perfil/index.tsx` + novo hook `use-me.ts`):
- Hook `useMyContact()` (GET) + `useUpdateMyContact()` (PUT, invalida a query).
- Prefill dos sheets PIX/WhatsApp a partir do backend; `localStorage` permanece como cache
  otimista com write-through (UI instantânea, fonte de verdade = backend).
- Salvar no sheet chama o PUT; em erro, mantém o valor anterior e mostra feedback.

### A.3 Trocar senha (backend novo + frontend)
**Backend** — endpoint **autenticado** (fora do grupo `AllowAnonymous`):
- `POST /api/auth/change-password { currentPassword, newPassword }` via
  `UserManager.ChangePasswordAsync`. Mapear erros do Identity para mensagens opacas
  (mesmo padrão do `register`). 400 em senha atual errada / política violada; 204 em sucesso.
**Frontend**:
- Nova linha "Alterar senha" no Perfil (com ícone `KeyRound`/`Lock`) → Sheet com
  `senha atual`, `nova senha`, `confirmar nova senha`. Validação client-side (>= política,
  confirmação bate). Sucesso → fecha + toast.

### Fora de escopo (A)
Seletor de tipo de PIX, upload de avatar, notificações (segue "Em breve").

---

## Feature B — Manutenção de tabelas de premiação (CRUD)

### Requisitos
Portar fiel a manutenção das tabelas pré-fixadas do Blazor para o DS React. Tabela = valores
**fixos em R$** por `prizePoolTotal` exato, com `jackpotAmount` (caixinha descontada do prêmio
quando o torneio usa tabela). Confirmado: o valor da caixinha segue a tabela quando o
parâmetro "usar tabela" está ligado.

### B.1 Corrigir o contrato (`use-prize-tables.ts`)
Substituir os tipos por:
```ts
interface LeaguePrizeTableDto { id; leagueId; name; prizePoolTotal: number;
  jackpotAmount: number; entries: PrizeTableEntryDto[]; createdAt: string }
interface PrizeTableEntryDto { position: number; prizeAmount: number }
interface CreatePrizeTableDto { name?: string; prizePoolTotal: number;
  jackpotAmount: number; entries: { position; prizeAmount }[] }
interface UpdatePrizeTableDto { name?: string; prizePoolTotal; jackpotAmount; entries }
```
Endpoints já existem e não mudam: `GET/POST /api/leagues/{id}/prize-tables`,
`GET/PUT/DELETE /api/prize-tables/{id}`. `name` é auto-gerado pelo backend → enviar `""`.

### B.2 Tela CRUD no DS (substitui o stub `tabelas-premiacao.tsx`)
- **Lista** por `prizePoolTotal` crescente: card por tabela mostrando pote total, 1º/2º/3º/4º
  (R$), caixinha, e "+N" quando há mais posições. Ações editar/excluir.
- **Sheet criar/editar** (port de `PrizeTableDialog.razor`):
  - `prizePoolTotal` (R$, obrigatório > 0).
  - Lista dinâmica de `entries` (posição auto-numerada 1..N, valor R$ por posição;
    adicionar/remover posição com renumeração).
  - `jackpotAmount` (R$, caixinha).
  - Indicador ao vivo: `Total = Σ entries + jackpot` vs `prizePoolTotal` → "OK" quando bate
    (tolerância 0.01), senão mostra a diferença (warning). Não bloqueia salvar se o backend
    não bloqueia — manter paridade com o Blazor (valida só pote > 0 e ≥ 1 prêmio > 0).
  - Erro do backend (ex.: "Já existe tabela para esse prize pool") exibido inline.
- **Excluir**: Sheet de confirmação (não usar `confirm()` nativo).
- Padrões DS: Sheet ≥44px de toque, `MoneyValue`, sem `prompt`/`confirm`/`alert`.

### B.3 Integração no admin (`perfil/admin.tsx`)
- Trocar a seção "Tabela de premiação" (hoje read-only com fallback percentual quebrado) por:
  resumo correto baseado em `entries`/`prizeAmount` (ou estado vazio "Nenhuma tabela
  configurada") + botão/linha "Gerenciar tabelas" → navega para a tela CRUD.
- A rota da tela CRUD pode permanecer em `/app/ligas/{id}/tabelas-premiacao`.

### B.4 Wizard (sem mudança funcional)
Backend já casa por prize pool; `usePrizeTable` já é setado pelo switch e `prizeTableId: null`
é correto (match é por valor, não por id). **Opcional/polimento**: corrigir o sub-label
chumbado "1º 50% · 2º 30% · 3º 20%" em `novo.tsx:750` para algo neutro
("usa a tabela cadastrada com o mesmo prize pool"). Marcado opcional.

### Fora de escopo (B)
Premiação por faixa de nº de jogadores; edição percentual; mudar o modelo do backend.

---

## Feature C — Transferir propriedade da liga

### Requisitos
Transferir a propriedade (`OrganizerId`) para outro **membro com conta vinculada**. O ex-dono
**permanece como membro** comum. Confirmado.

### C.1 Backend novo
- `POST /api/leagues/{leagueId}/transfer-ownership { newOrganizerUserId }`.
  Autorização: **somente o organizador atual** (`IsUserOrganizerAsync`).
- `ILeagueService.TransferOwnershipAsync(Guid leagueId, string currentUserId,
  string newOrganizerUserId) → (bool Success, string Message)`:
  1. Liga existe e `currentUserId` é o organizador.
  2. `newOrganizerUserId != currentUserId`.
  3. O alvo é membro **ativo** da liga com `Player.UserId == newOrganizerUserId`
     (`MembershipStatus` ativo). Senão → falha com mensagem.
  4. Garante que o ex-organizador tenha um `Player` na liga (cria registro mínimo vinculado a
     ele se não existir) para que continue com acesso como membro.
  5. `league.OrganizerId = newOrganizerUserId`; `SaveChanges`.
- Sem migration (apenas update de coluna existente + possível insert de `Player`).

### C.2 Frontend (`perfil/admin.tsx`)
- Nova linha "Transferir propriedade" numa **zona de risco** (visualmente distinta, só
  visível para o organizador).
- Sheet: seletor de membro (lista `players` com `userId != null`, exceto o próprio usuário)
  + confirmação explícita (texto claro do efeito: "Você deixará de ser o dono e passará a
  membro"). Botão destrutivo confirma.
- Hook `useTransferOwnership(leagueId)` (POST) invalida `leagueKeys.detail(id)` +
  `leagueKeys.list()`. Em sucesso: `isOrganizer` recalcula para false e a tela atualiza
  (controles de organizador somem); toast de confirmação.

### Fora de escopo (C)
Co-administradores / múltiplos admins; aceite do novo dono (transferência é imediata).

---

## Testes
- **A.1**: teste de unidade da função de resolução stats (player por `userId` + leitura do
  ranking) cobrindo fallbacks (`—`).
- **A.2/A.3/C**: testes de serviço no backend (`UpdateContactForUserAsync` aplica em N
  players; `change-password` com senha errada; `TransferOwnershipAsync` cobrindo as 4
  validações). Hooks novos com teste de contrato onde houver lógica de mapeamento.
- **B**: teste do mapeamento corrigido de `use-prize-tables` e da validação de soma do Sheet.
- Seguir os padrões de teste já existentes em `web/src/**/*.test.ts(x)` e nos testes de
  serviço .NET do projeto.

## Riscos / notas
- O endpoint `change-password` precisa sair do grupo `AllowAnonymous` (criar variante
  autenticada). Verificar middleware de auth aplicado por endpoint.
- `PUT /api/me/contact` aplicando em múltiplos players: garantir transação e idempotência.
- Transferência muda quem pode operar a liga em tempo real — invalidar caches de liga no
  cliente após sucesso.
- Nenhuma das três frentes exige schema destrutivo nem nova migration.
