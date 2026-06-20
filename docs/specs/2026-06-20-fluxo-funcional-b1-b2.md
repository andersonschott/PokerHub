# Spec — Tornar o fluxo principal FUNCIONAL (B1 + B2)

> Criado em 2026-06-20. Origem: pedido do Anderson — "foco em tornar funcional o sistema, especialmente o fluxo principal: inscrever-se → torneio → durante o torneio → ranking → débitos". Auditoria feita pelo supervisor (read-only).

## Estado da branch
- `develop`, HEAD `f7ef6c6` (edição de torneio) + `3eb3992` (perfil caixinha).
- Gates verdes na sessão: `dotnet build` 0 · Application.Tests 41 · `tsc -b` 0 · vitest 92.

## Diagnóstico do fluxo (funcional vs quebrado)
| Etapa | Estado | Detalhe |
|---|---|---|
| Inscrição | ✅ funcional | `web/src/routes/app/torneio/entrar.tsx` + `useSelfRegister` (invalida, navega, trata erro) |
| Criar/editar torneio | ✅ funcional | edição corrigida em `f7ef6c6` |
| **Durante o torneio** | ❌ **B1** | ações ao vivo não atualizam a tela |
| **Encerrar → débitos** | ❌ **B2** | front nunca finaliza o torneio |
| Ranking | ✅ funcional | `ranking.tsx` usa `useLeagueRanking`/`useSeasonRanking`, temporadas reais |
| Débitos (calcular/pago/confirmar) | ✅ wiring ok | **bloqueado pelo B2** — `CalculateAndCreatePaymentsAsync` retorna VAZIO se o torneio não está `Finished` (`src/PokerHub.Application/Services/PaymentService.cs:97-98`) |

Corrigir B1 e B2 torna o fluxo principal funcional ponta a ponta.

---

## FIX B1 — Ações ao vivo não atualizam a UI (ALTA)
**Arquivo:** `web/src/lib/api/hooks/use-tournaments.ts`

`useAddRebuy`, `useSetAddon`, `useEliminatePlayer`, `useUndoElimination` têm só `mutationFn`, SEM `onSuccess` → depois de rebuy/add-on/eliminar/desfazer, tabela/contador de rebuys/prize pool/lista de eliminados nunca atualizam (só o relógio anda via SignalR). `useCheckInPlayer` é o padrão correto.

**Tarefa:** em cada um dos 4 hooks, adicionar `useQueryClient()` + `onSuccess` com `queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] })`. Manter `mutationFn` e assinaturas.

---

## FIX B2 — "Encerrar torneio" nunca finaliza (ALTA — destrava débitos)
Em `web/src/routes/app/torneio/dashboard.tsx`, o botão "Encerrar torneio" só faz `navigate('/app/debitos/pagamentos?t=...')`. O front nunca chama `POST /tournaments/{id}/finish` → prêmios/posições nunca atribuídos, status nunca vira `Finished`, pagamentos calculam vazio. Não existe `useFinishTournament` nem fluxo de finalização (apesar de F10 estar `[x]`).

### Contrato do backend (verificado)
- `POST /api/tournaments/{id}/finish` — `src/PokerHub.Api/Tournaments/TournamentEndpoints.cs:~242`. Body (camelCase): `{ "positions": [{ "playerId": "<guid>", "position": 1 }, ...] }`. Records: `FinishTournamentRequest(IReadOnlyList<FinishPlayerPositionRequest(Guid PlayerId, int Position)>)`.
- `TournamentService.FinishTournamentAsync(id, positions)` — exige `InProgress`/`Paused`; atribui posições; calcula prêmios; seta `Finished`; grava caixinha; safety-net p/ premiado omitido. 200 `{ message }` ou 400 `{ message }`.
- `finish-custom` existe; NÃO usar agora.

### Tarefa
1. **`use-tournaments.ts`** — `useFinishTournament(tournamentId, leagueId)`: var `{ positions: { playerId: string; position: number }[] }`; `POST /tournaments/${tournamentId}/finish` body `{ positions }`; `onSuccess` invalida `['tournament', tournamentId]` e `['tournaments', leagueId]`.
2. **`dashboard.tsx`** — trocar a navegação do botão por uma **folha de confirmação** (reusar `Sheet`, ver `features/live/action-sheet.tsx`/`eliminate-sheet.tsx`; manter estilo). Comportamento:
   - Derivar posições do `tDetail.players` BRUTO (`playerId`, `playerName`, `nickname`, `isCheckedIn`, `position`):
     - `participants` = `isCheckedIn || position!=null`.
     - `eliminated` = participants com `position!=null` → mantêm `position`.
     - `alive` = participants com `position==null` → recebem `1..alive.length` (campeão=1). Normal: 1 vivo=campeão. Se >1: 1..k na ordem da lista "Na mesa" (`inPlay`), com nota "primeiro = campeão".
     - `positions = [...eliminated{playerId,position}, ...alive{playerId,position:i+1}]`.
   - Folha mostra ranking (1º,2º,3º…) com nomes; botão "Confirmar encerramento" + cancelar.
   - Confirmar: `await finishMut.mutateAsync({ positions })` → sucesso: `toast.success('Torneio encerrado!')` + `navigate('/app/debitos/pagamentos?t='+activeTId)`. Erro: `ApiError` de `@/lib/api/client` (msg do backend) senão `toast.error('Falha ao encerrar o torneio.')`.
   - Hook no topo: `const finishMut = useFinishTournament(activeTId, activeLeagueId ?? '')` (`activeLeagueId` de `useActiveLeague()`).
   - Manter o resto do dashboard como está.

---

## Restrições
Sem libs novas. Não commitar (supervisor revisa/commita). Não tocar `master` nem `.serena/project.yml`. Sem `@ts-ignore`. Mobile-first.

## Gates
```
dotnet build PokerHub.slnx -c Debug
dotnet test tests/PokerHub.Application.Tests/PokerHub.Application.Tests.csproj
cd web && npx tsc -b && npm run test
```

## Critérios de aceite
- [ ] rebuy/add-on/eliminar/desfazer refletem na UI imediatamente.
- [ ] "Encerrar torneio" → folha com ranking → `/finish` (Finished + prêmios) → pagamentos.
- [ ] Em pagamentos, "Calcular Pagamentos" gera saldos + "quem paga quem" (não-vazio).
- [ ] Gates verdes.

## Follow-ups (fora do escopo)
- B3: "Cobrar todos" (`pagamentos.tsx:127`) é mock stub — BAIXA.
- Sweep `perfil/admin.tsx` (tem fronteiras).
- Cleanup type-imports `MockTablePlayer`/`MockRankingEntry` + dead code `use-mock-clock.ts`.
- Check-in de inscrito-não-checado: dashboard só lista `isCheckedIn||position!=null`.
