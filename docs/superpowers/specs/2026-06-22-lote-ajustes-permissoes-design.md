# Design — Lote de Ajustes (permissões + UX) no app React

**Data:** 2026-06-22
**Alvo:** `web/` (frontend). Sem backend (usa o que já existe). Bugs reportados em produção.
**Modelo de permissão:**
- `isLeagueOrganizer` = `league.organizerId === user.userId`.
- `canOperateTournament(tournamentId)` = `isLeagueOrganizer` **OU** o usuário é delegado do torneio
  (`useDelegates(tournamentId)` contém `d.userId === user.userId`). Delegado = mesmo acesso do
  admin **dentro do escopo do torneio**.

## Itens

1. **Nav sem liga.** Usuário sem nenhuma liga não deve ver os menus **Torneio** e **Ranking**
   (não fazem sentido sem liga). Esconder esses itens no app-shell/nav quando `useLeagues()`
   retorna lista vazia. (Liga/Perfil permanecem.)

2. **Caixinha — usar (`perfil/caixinha.tsx`).** Botão de "usar caixinha" (registrar uso/saída)
   só para `isLeagueOrganizer`. Usuário comum vê saldo/histórico mas não o botão de uso.

3. **Duplicar torneio (`torneio/historico/[id].tsx`).** Botão "duplicar torneio" só visível
   para quem `canOperateTournament` (organizador ou delegado).

4. **`debitos/pagamentos.tsx`:**
   - (a) **Bottom-nav some.** O menu inferior fixo não aparece ao entrar via
     `?t={id}`, mas volta ao selecionar o pill "pagamentos" — bug de montagem/condicional do
     layout. Garantir o bottom-nav fixo em todos os estados da tela.
   - (b) **Calcular pagamentos** só para `canOperateTournament` (organizador ou delegado).
   - (c) **Cobrar todos** está estourando o layout — corrigir o CSS (truncar/wrap/encolher).
   - (d) **Seta voltar** no topo deve voltar para a **lista de torneios** (origem), não para
     `/debitos`. Usar a origem correta (tournament list / histórico do torneio).

5. **Perfil — "Administração da liga" (`perfil/index.tsx`).** A linha/atalho só deve aparecer
   para `isLeagueOrganizer` (hoje aparece para todos e navega para `/app/perfil/admin`).

6. **Criar/editar torneio (`torneio/index.tsx` e edição do agendado).** Botão "criar torneio"
   e a edição do próximo torneio agendado só para `isLeagueOrganizer`. Usuário comum não cria
   nem edita; só visualiza.

## Item separado (deploy, não-código)
- **PIX em prod (não carrega chave / erro ao salvar):** causa = backend da Feature A
  (`/api/me/contact`) **não está deployado** no Container App (confirmado `404`). Corrige com o
  **redeploy consolidado da API** ao fim desta wave. Não é bug de código.

## Testes
- Onde houver lógica de permissão extraível (ex.: `canOperateTournament`), extrair helper puro
  e cobrir com vitest. Gates de UI: build + checagem manual (organizador vs comum vs delegado).

## Fora de escopo
- Criar novos papéis/permissões (delegado já existe). Mudanças de backend.
