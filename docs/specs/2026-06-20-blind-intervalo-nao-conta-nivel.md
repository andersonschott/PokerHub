# Proposta de Design — Intervalo (break) não deve contar como nível de blind

- **Data:** 2026-06-20
- **Tipo:** Estudo / Proposta de design (não implementado)
- **Autor da demanda:** Anderson
- **Status:** Aberto para decisão

## 1. Demanda

> "Ao montar um blind customizado hoje, o intervalo (break/pausa) conta como um nível.
> Precisamos que ele NÃO conte. Assim ficará: nível 1, 2, 3, 4, INTERVALO, 5, 6, 7... —
> ou seja, o intervalo não incrementa a numeração de níveis."

Objetivo: o intervalo continua sendo uma **etapa do cronograma** (ocupa uma posição na
sequência e tem duração), mas **não recebe um número de nível**. A numeração de níveis de
jogo deve pular os intervalos: `1, 2, 3, 4, INTERVALO, 5, 6, 7…`.

---

## 2. Como o intervalo é modelado HOJE

### 2.1 Entidade e schema

`src/PokerHub.Domain/Entities/BlindLevel.cs:3-17`

```csharp
public class BlindLevel
{
    public Guid Id { get; set; }
    public Guid TournamentId { get; set; }
    public int Order { get; set; }          // <- posição física E número de nível, ao mesmo tempo
    public int SmallBlind { get; set; }
    public int BigBlind { get; set; }
    public int Ante { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsBreak { get; set; }       // <- flag que distingue intervalo de nível de jogo
    public string? BreakDescription { get; set; }
    public Tournament Tournament { get; set; } = null!;
}
```

- **Há um flag explícito de pausa:** `IsBreak` (bool). O intervalo é um `BlindLevel` com
  `IsBreak = true`, `SmallBlind/BigBlind/Ante = 0` e uma `DurationMinutes` própria.
- **Não há campo separado de "número de nível".** O `Order` é simultaneamente:
  1. a **posição física** na sequência do cronograma (1..N, contínua), e
  2. o **número de nível exibido** ("Nível N") na UI.
- EF: `src/PokerHub.Infrastructure/Data/Configurations/BlindLevelConfiguration.cs:16-17`
  cria índice **único** `(TournamentId, Order)`. Confirmado no snapshot
  `PokerHubDbContextModelSnapshot.cs:177-194` — colunas `Order`, `IsBreak`, `SmallBlind`…;
  **não existe** coluna de "level number" persistida.
- Relação `Tournament → BlindLevels`: `Tournament.cs:61` (`ICollection<BlindLevel>`); sempre
  carregada com `OrderBy(bl => bl.Order)` (ex.: `TournamentService.cs:71,313`,
  `TournamentTimerService.cs:107,178`).

### 2.2 O `Order` é o ponteiro do timer

Esse é o ponto central da arquitetura: **`Tournament.CurrentLevel` é o `Order`**, não um
número de nível lógico.

- `TournamentTimerService.cs:123,223-224` — o timer localiza o blind atual por
  `bl.Order == CurrentLevel` e o próximo por `bl.Order == CurrentLevel + 1`.
- `TimerMath.cs:29-73` (`Resolve`) opera puramente sobre a lista `(Order, DurationSeconds)`;
  **não conhece `IsBreak`** — para ele, o intervalo é só mais um passo com duração. Ou seja,
  **o intervalo já funciona como etapa do cronograma** (avança e conta tempo corretamente).
- Avanço/retrocesso (manual e automático) é `CurrentLevel++ / CurrentLevel--`
  (`TournamentService.cs:750,769`; `TimerMath.ResolveManualNext/Previous`).

**Conclusão:** o intervalo já é uma etapa do cronograma com duração. O único problema real
é de **numeração/rótulo de exibição**: como `Order` é reaproveitado como "Nível N", o
intervalo "rouba" um número e os níveis de jogo após o intervalo ficam inflados.

### 2.3 Onde os níveis são CRIADOS e NUMERADOS

**React — `web/src/features/tournaments/blind-utils.ts:31-48` (`genBlinds`)** — ESTE é o
gerador do builder custom/templates:

```ts
let level = 1;
SBS.forEach((sb, i) => {
  rows.push({ level: level++, sb, bb: sb*2, ... type: 'jogo' });
  if (cfg.breakEvery && (i+1) % cfg.breakEvery === 0 && i < SBS.length-1) {
    rows.push({ level: level++, min: 10, type: 'intervalo' });  // <- BUG: intervalo incrementa `level`
  }
});
```

O submit do wizard (`web/src/routes/app/torneio/novo.tsx:373-381`) mapeia `order: b.level`.
Logo o intervalo recebe um `order` próprio e empurra os níveis seguintes.

**Blazor — `Create.razor` / `Edit.razor`:**
- `AddBreak()` (`Create.razor:657-671`) adiciona um `BlindLevelModel { IsBreak = true }`.
- `ReorderLevels()` (`Create.razor:679-686`) faz `Order = 1,2,3…` **incluindo intervalos**.
- A tabela do wizard exibe `@context.Order` direto na coluna "Nivel" (`Create.razor:220`,
  `Edit.razor:234`) — então o intervalo aparece com um número de nível.
- Templates do servidor (`TournamentService.cs:787-852`, `BuildBlindTemplate`) numeram
  `i + 1` para todos os itens, intervalos inclusos. Ex.: Regular tem break no `Order=5` e
  `Order=9` (`TournamentService.cs:811,815`), empurrando os níveis de jogo.

### 2.4 Onde os níveis são EXIBIDOS / CONSUMIDOS

| Local | Arquivo:linha | Trata break no display? |
|---|---|---|
| Timer ao vivo React (mobile/dashboard) | `routes/app/torneio/index.tsx:145` | **NÃO** — renderiza `Nível {level}` mesmo se o passo for intervalo (mostraria "Nível 5" com blinds 0/0) |
| Timer TV React | `routes/app/tv.tsx:286` | **NÃO** — `Nível {level}` sempre |
| Timer Blazor TV | `Timer/Index.razor:148-168` | **SIM** — se `_isBreak` mostra "☕ INTERVALO"; senão "NÍVEL @_currentLevel" |
| Dashboard Blazor | `Dashboard.razor:261-263` | **SIM** — `if (CurrentBlindLevel.IsBreak)` → "INTERVALO" |
| Tabela do wizard React | `features/tournaments/blind-table.tsx:24,80` | Mostra "Intervalo" como rótulo, **mas usa `r.level` como key e número** |
| Resumo wizard React | `novo.tsx:338,424,718` | Conta `gamelevels = filter(type==='jogo')` — já correto na contagem total |

**Observações de exibição:**
- Em React **ao vivo**, quando o timer cai num intervalo, hoje mostraria "Nível N" com SB/BB
  zerados (bug duplo: numeração + ausência de rótulo "Intervalo"). Em Blazor o rótulo já é
  tratado, mas o **número** dos níveis de jogo após o intervalo continua inflado.
- `clock-projection.ts` (React) e `restFallbackClock` (`tv-projection.ts:114-136`) projetam
  `level = currentLevel = Order`. Nenhum deles deriva "número de nível pulando breaks".
- `reverseBlindTemplate` (`edit-prefill.ts:44-71`) infere `breakEvery` contando níveis de
  jogo antes do 1º break — isto **já ignora a numeração**, então não é afetado pela mudança.

### 2.5 Acoplamentos que dependem do `Order` (edge cases importantes)

`Tournament.cs:67-96`:

```csharp
public bool IsRebuyAllowed(int currentLevel, ...) =>
    ... currentLevel <= (RebuyLimitLevel ?? 0) ...;       // compara CurrentLevel(=Order) com RebuyLimitLevel
public bool IsCheckInAllowed() =>
    ... CurrentLevel <= AllowCheckInUntilLevel.Value;     // idem para AllowCheckInUntilLevel
```

O wizard coleta esses limites como **"até o nível N"** usando o **número exibido**
(`novo.tsx:421,423`; `Create.razor:120,169`). Hoje funcionam por coincidência (Order ==
número exibido) **até existir um intervalo antes do limite**. Se mudarmos a numeração
exibida sem alinhar essas comparações, "rebuy até nível 4" pode passar a significar algo
diferente quando houver um intervalo no meio. **Decisão de produto necessária** (ver §6).

---

## 3. Problema-raiz (resumo)

O sistema **funde** três conceitos num único `int Order`:
1. posição física/cronograma (contínua, inclui intervalos) — **necessária ao timer**;
2. número de nível de jogo exibido (deve pular intervalos);
3. ponteiro de avanço do timer (`CurrentLevel`).

A demanda exige **separar (2) de (1)**: o intervalo permanece em (1)/(3) como etapa com
duração, mas deixa de ocupar um número em (2).

---

## 4. Abordagens de modelagem

### Opção A — Número de nível DERIVADO on-read (RECOMENDADA)

Manter `Order` como posição física contínua (intervalos incluídos). **Não** persistir
número de nível. Derivar o "número de nível de jogo" contando apenas itens `!IsBreak` até a
posição atual, sempre que for exibir.

Fórmula (1-based, só para `IsBreak == false`):
```
displayLevelNumber(item) = count(b in blinds where !b.IsBreak and b.Order <= item.Order)
```
Para intervalos, não há número — exibe-se "Intervalo".

**Prós:**
- **Zero migração de dados.** `Order` continua sendo a posição física; o índice único
  `(TournamentId, Order)` e todo o `TimerMath`/`TournamentTimerService` permanecem intactos.
- O ponteiro do timer (`CurrentLevel == Order`) continua válido — nada muda no engine.
- Uma única fonte de verdade; impossível ficar dessincronizado (não há campo redundante).
- Reversível e barato: é só formatação na borda (UI/DTO).

**Contras:**
- A numeração exibida precisa de uma função utilitária compartilhada (uma em TS, uma em C#)
  — risco de duplicação de regra entre os dois apps. Mitigar centralizando e testando.
- Se algum dia o número exibido precisar ser persistido/consultado por relatório, terá de
  ser recomputado (não é o caso hoje).

### Opção B — Número de nível PERSISTIDO (campo separado)

Adicionar `int? LevelNumber` (null para intervalos) ao `BlindLevel`, preenchido na criação.
`Order` continua físico.

**Prós:** número fixo, legível direto do banco; não precisa recomputar.

**Contras:**
- **Migração obrigatória** para todos os torneios existentes (recomputar `LevelNumber`).
- **Risco de inconsistência** (`Order` e `LevelNumber` podem divergir em edições) — exige
  recomputar a cada save em ambos os apps.
- Mais superfície: nova coluna, novo campo nos DTOs/models, novo mapeamento.
- Ganho nulo no caso de uso atual (a numeração só é usada para exibir).

### Recomendação

**Opção A (derivada on-read).** O sistema já trata o intervalo como etapa de cronograma
(`TimerMath` é agnóstico a `IsBreak`); o problema é puramente de **rótulo**. Derivar evita
migração, mantém o `Order` físico como única chave de ordenação/timer e elimina risco de
dessincronização. A persistência (Opção B) só se justificaria se a numeração virasse dado
consultável — não é o caso.

---

## 5. Impacto detalhado por área (Opção A)

### 5.1 Domínio / EF
- **Nenhuma mudança de schema.** `BlindLevel`, `Order`, índice único e migrations ficam como
  estão.
- (Opcional) Adicionar um helper de domínio puro, ex. um método estático/extension
  `BlindLevelNumbering` que, dada a lista ordenada, devolve o número de jogo de cada item
  (null p/ break). Centraliza a regra no lado C#.

### 5.2 Geração / numeração (builder + templates)
- **React `genBlinds` (`blind-utils.ts:31-48`):** o `level++` deve incrementar **apenas em
  itens de jogo**; intervalos não consomem `level`. Mas atenção — `order` (posição física,
  enviado ao backend) **deve continuar contínuo** incluindo o intervalo. Ou seja, separar no
  `BlindRow` o conceito de `order` (físico, contínuo) do `displayLevel` (só p/ jogo).
  Hoje `BlindRow.level` é usado para os dois; precisa virar dois campos
  (`order` físico contínuo + `displayLevel?` só p/ jogo) **ou** derivar o display no render.
- **React submit (`novo.tsx:373-381`):** `order` enviado ao backend = posição física
  contínua (não o display). Garantir que intervalos mantenham um `order` único e sequencial
  (o índice único `(TournamentId, Order)` exige isso).
- **Blazor `ReorderLevels` (`Create.razor:679-686`, `Edit.razor`):** continua numerando
  `Order` 1..N **incluindo** intervalos (posição física). A **coluna "Nivel" da tabela**
  (`Create.razor:220`, `Edit.razor:234`) deve passar a exibir o número derivado (em branco/"—"
  ou "Intervalo" para breaks), não `@context.Order`.
- **Templates do servidor (`TournamentService.cs:787-852`):** `Order = i+1` contínuo está
  **correto** (posição física). Nada a mudar no `Order`; só o display deriva.

### 5.3 Exibição ao vivo (timer)
- **React `index.tsx:145` e `tv.tsx:286`:** trocar `Nível {level}` por lógica que:
  - se o passo atual for intervalo (`currentBlind.isBreak`) → exibir "Intervalo"
    (alinhar com Blazor que já faz isso);
  - senão → exibir `Nível {displayLevelNumber}` onde o número é derivado pulando breaks.
  - Para isso o clock precisa expor `isBreak` do nível atual e o **número derivado**.
    `clock-projection.ts:97-134` e `tv-projection.ts:114-136` projetam só `level = Order`;
    precisam ser estendidos para carregar `isBreak` e o número de jogo derivado (a partir da
    lista de blinds do torneio + `currentLevel`/`Order`).
- **Blazor `Timer/Index.razor` e `Dashboard.razor`:** já exibem "INTERVALO" para breaks
  (`Index.razor:150`, `Dashboard.razor:263`). Falta **corrigir o número** dos níveis de jogo
  pós-intervalo: trocar `NÍVEL @_currentLevel` (`Index.razor:168`) pelo número derivado.
  "Próximo Nível" (`Index.razor:158-192`) também deve usar o número derivado do próximo nível
  de jogo (e idealmente já anunciar "Próximo: Intervalo" quando o próximo passo for break —
  parte disso já existe em `Index.razor:186-192`).

### 5.4 Edição de torneio existente
- React modo edit (`novo.tsx:117-149`, `buildEditInitial`) regenera os blinds via template
  inferido (`reverseBlindTemplate`) e **re-submete** — então a numeração derivada é aplicada
  naturalmente ao salvar. `reverseBlindTemplate` não depende da numeração (conta por
  `isBreak`), logo é compatível.
- Blazor Edit carrega os `BlindLevelModel` do torneio (`Edit.razor:491-498`) preservando
  `Order`; só o display muda. OK.

### 5.5 Rebuy / Check-in "até o nível N" (decisão de produto)
- `IsRebuyAllowed`/`IsCheckInAllowed` (`Tournament.cs:73,92`) comparam `CurrentLevel`(=Order)
  com `RebuyLimitLevel`/`AllowCheckInUntilLevel`. Hoje o wizard coleta esses limites como
  **número exibido**.
- Após a mudança, número exibido ≠ Order quando houver intervalo antes do limite. Duas saídas:
  - **(B1)** Manter a comparação por `Order` e **converter** o limite (número exibido →
    Order) no submit do wizard. Mais fiel à intenção do usuário ("até o 4º nível de jogo").
  - **(B2)** Aceitar pequena divergência e deixar como está (limite = posição física). Mais
    simples, mas "até nível 4" pode liberar/cortar rebuy um passo antes/depois do esperado se
    houver intervalo precoce.
  - Recomendação preliminar: **B1** (converter no submit), mas é **decisão do Anderson**.

### 5.6 Testes afetados
- **React (vitest):** `blind-utils` (novo teste da numeração derivada), `tv-projection.test.ts`,
  `clock-projection.test.ts`, `clock-projection.drift.test.ts` (se a projeção passar a expor
  `isBreak`/número derivado), `edit-prefill.test.ts` (revalidar — não deve quebrar).
- **C# (xUnit):** `tests/PokerHub.Api.Tests/TournamentEndpointsTests.cs` (criação de blinds /
  `Order`), `TimerMathTests.cs` (não muda — `TimerMath` continua por `Order`). Adicionar
  teste do helper de numeração derivada de domínio (se criado).

---

## 6. Plano faseado

> Premissa da Opção A: `Order` permanece físico/contínuo; numeração de jogo é derivada.
> Não há migração de banco.

**Fase 0 — Alinhamento (decisões §7).** Confirmar Opção A e o tratamento de rebuy/check-in
(B1 vs B2).

**Fase 1 — Domínio/Helper (C#)**
- Criar helper puro de numeração derivada (lista ordenada → número de jogo por item, null em
  break). Testes unitários. Sem mudança de schema.
- Risco: baixo. Reversível.

**Fase 2 — Application/DTO (opcional)**
- Decidir se o número derivado é exposto no `BlindLevelDto`/`TimerStateSyncDto`
  (`BlindLevelDto.cs`, `TimerStateSyncDto.cs`) ou derivado só no cliente. Recomendado:
  derivar no cliente a partir da lista já enviada (evita inflar contrato). Se B1 for
  escolhido, ajustar conversão de `RebuyLimitLevel`/`AllowCheckInUntilLevel` no submit.

**Fase 3 — React**
- `blind-utils.genBlinds`: separar `order` (físico contínuo) de `displayLevel` (só jogo).
- `blind-table.tsx`: usar `order` como key estável; exibir número derivado / "Intervalo".
- `novo.tsx` submit: enviar `order` físico; (se B1) converter limites.
- `clock-projection.ts` + `tv-projection.ts`: expor `isBreak` e número derivado.
- `index.tsx`/`tv.tsx`: render "Intervalo" vs "Nível {derivado}".
- Atualizar testes vitest.

**Fase 4 — Blazor**
- `Create.razor`/`Edit.razor`: `ReorderLevels` mantém `Order` físico; coluna "Nivel" exibe
  derivado/"Intervalo".
- `Timer/Index.razor`/`Dashboard.razor`: trocar `NÍVEL @_currentLevel` por número derivado;
  "Próximo Nível" idem (rótulo de break já parcialmente tratado).

**Fase 5 — Timer/Engine (verificação, sem mudança de regra)**
- Confirmar que `TournamentTimerService`/`TimerMath` continuam operando por `Order`
  (nenhuma mudança esperada). Validar avanço através de um intervalo de ponta a ponta
  (React ao vivo + Blazor + TV).

**Riscos transversais:**
- Duplicação da regra de numeração entre TS e C# (mitigar com helper único por app + testes).
- Esquecer algum ponto de exibição que usa `Order` como número (varredura: `index.tsx:145`,
  `tv.tsx:286`, `Timer/Index.razor:168`, `Dashboard.razor`, `blind-table.tsx`,
  `Create.razor:220`, `Edit.razor:234`).
- Edge: intervalo no **início** (display do 1º nível de jogo deve ser 1, não 2); intervalos
  **consecutivos**; intervalo no **fim** (sem próximo nível de jogo — "Próximo" deve tratar
  null). A fórmula `count(!IsBreak and Order<=x)` cobre todos.

---

## 7. Decisões abertas para o Anderson

1. **Modelagem: derivada (A) ou persistida (B)?** Recomendação: **A (derivada on-read)** —
   sem migração, sem risco de dessincronização, engine intacto.
2. **Rebuy/Check-in "até nível N":** comparar pelo número de jogo (converter no submit, B1)
   ou pela posição física (B2)? Recomendação preliminar: **B1**.
3. **Exposição do número derivado no contrato (DTO) ou só no cliente?** Recomendação: derivar
   no cliente para não inflar `BlindLevelDto`/`TimerStateSync`.
4. **Rótulo do nível durante o intervalo no React ao vivo:** apenas "Intervalo", ou
   "Intervalo (após nível 4)" / "Próximo: Nível 5"? (Blazor hoje mostra só "INTERVALO".)
5. **Onde centralizar a regra de numeração** (um util TS + um helper C#) e cobertura mínima
   de testes desejada antes de promover para os apps.
