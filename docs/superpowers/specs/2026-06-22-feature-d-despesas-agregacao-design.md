# Design — Feature D: Despesas no torneio + agregação de pagamentos

**Data:** 2026-06-22
**Alvo:** `web/` (frontend) consumindo backend de despesas já existente.
**Decisões (usuário):** entrada de despesa **no dashboard do torneio**; agregação no acerto =
**total único por credor com detalhe expansível**.

## Contexto verificado
- Backend já existe: `GET/POST /api/tournaments/{id}/expenses`, `GET .../summary`,
  `GET .../eligible-players`, `GET .../league-players`, `GET/PUT/DELETE /api/expenses/{id}`.
  Despesa é **por torneio**, com rateio (`TournamentExpenseShare`). Blazor: `AddExpenseDialog.razor`.
- Pagamentos têm `PaymentType` (Poker, Expense, Jackpot) — base para discriminar a agregação.

## Parte 1 — UI de despesas no dashboard do torneio
- Seção "Despesas" no dashboard do torneio (ao vivo e finalizado): listar despesas (descrição,
  valor, quem pagou, entre quem rateia), adicionar/editar/excluir via **Sheet** (port do
  `AddExpenseDialog`), escolhendo os jogadores que rateiam (de `eligible-players`).
- **Gate:** `canOperateTournament` (organizador OU delegado). Usuário comum vê as despesas
  (read-only) mas não adiciona/edita.
- Hooks novos (`use-expenses.ts`) sobre os endpoints existentes.

## Parte 2 — Agregação de pagamentos (`debitos/pagamentos`)
- Agrupar débitos do mesmo **devedor → credor** somando Poker + Despesas num **total único**.
  - Linha: `Diego → Você: R$55,00` (total). Ao **expandir**, mostra o breakdown:
    `Poker R$50,00 · Despesas R$5,00`.
  - Um único acerto/PIX pelo total; a quitação registra/baixa os itens componentes.
- Lógica de agregação extraída como função pura testável (agrupa por par devedor/credor, soma,
  e produz o breakdown por `PaymentType`).
- Não quebrar a baixa/quitação existente: quitar o agregado quita os pagamentos componentes.

## Testes
- Função pura de agregação (agrupamento por par + breakdown por tipo) com vitest.
- UI de despesas: build + manual; gate por permissão.

## Fora de escopo
- Mudança no backend de despesas/pagamentos (modelo já suporta). Compartilhamento (Feature E).
