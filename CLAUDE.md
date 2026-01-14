# PokerHub - Claude Code Guidelines

## Visao Geral do Projeto

PokerHub e uma plataforma de gerenciamento de torneios de poker desenvolvida em Blazor Server (.NET 10.0) com arquitetura limpa (Clean Architecture).

### Stack Tecnologico
- **Frontend**: Blazor Server com MudBlazor 8.15.0
- **Backend**: ASP.NET Core 10.0
- **Banco de Dados**: Azure SQL Server (Entity Framework Core 10.0)
- **Autenticacao**: ASP.NET Identity
- **Tempo Real**: SignalR
- **UI Framework**: MudBlazor (Material Design)

### Estrutura do Projeto
```
src/
├── PokerHub.Domain/          # Entidades, Enums, Regras de negocio
├── PokerHub.Application/     # DTOs, Services, Interfaces
├── PokerHub.Infrastructure/  # DbContext, Configurations, Migrations
└── PokerHub.Web/            # Blazor Pages, Hubs, Background Services
```

---

## Comandos Uteis

```bash
# Build
dotnet build

# Rodar aplicacao
dotnet run --project src/PokerHub.Web

# EF Core Migrations (requer DOTNET_ROOT configurado)
export DOTNET_ROOT=/home/anderson/.dotnet
export PATH="$PATH:$HOME/.dotnet/tools"

# Criar migration
dotnet ef migrations add NomeMigration --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web --output-dir Data/Migrations

# Aplicar migrations
dotnet ef database update --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web

# Listar migrations
dotnet ef migrations list --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web
```

---

## Aprendizados e Solucoes

### 1. Blazor Server - Formularios
**Problema**: Erro "The POST request does not specify which form is being submitted"

**Solucao**: Todas as paginas com formularios DEVEM ter `@rendermode InteractiveServer`:
```razor
@page "/rota"
@rendermode InteractiveServer
@attribute [Authorize]
```

### 2. EF Core - LocalDB no Linux
**Problema**: `LocalDB is not supported on this platform`

**Solucao**: O `PokerHubDbContextFactory.cs` foi alterado para ler do `appsettings.json`:
```csharp
public class PokerHubDbContextFactory : IDesignTimeDbContextFactory<PokerHubDbContext>
{
    public PokerHubDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../PokerHub.Web"))
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var optionsBuilder = new DbContextOptionsBuilder<PokerHubDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new PokerHubDbContext(optionsBuilder.Options);
    }
}
```

### 3. EF Core - Multiple Cascade Paths
**Problema**: SQL Server nao permite multiplos caminhos de cascade delete

**Solucao**: Usar `DeleteBehavior.Restrict` ou `DeleteBehavior.NoAction` em relacionamentos que criam ciclos:
```csharp
// TournamentPlayerConfiguration.cs
builder.HasOne(tp => tp.Player)
    .WithMany(p => p.Participations)
    .HasForeignKey(tp => tp.PlayerId)
    .OnDelete(DeleteBehavior.Restrict);

builder.HasOne(tp => tp.EliminatedByPlayer)
    .WithMany()
    .HasForeignKey(tp => tp.EliminatedByPlayerId)
    .OnDelete(DeleteBehavior.NoAction);
```

**Regra Geral de Cascade**:
- `League -> Tournament`: CASCADE
- `League -> Player`: CASCADE
- `Tournament -> TournamentPlayer`: CASCADE
- `Tournament -> Payment`: CASCADE
- `Tournament -> BlindLevel`: CASCADE
- `Player -> TournamentPlayer`: RESTRICT
- `Player -> Payment`: RESTRICT
- `EliminatedByPlayer`: NO ACTION

### 4. MudBlazor - Componentes
**MudStepper**: A API mudou em versoes recentes. Usar navegacao customizada com botoes.

**MudChip**: Requer parametro de tipo `T="string"`:
```razor
<MudChip T="string" Size="Size.Small" Color="Color.Primary">Texto</MudChip>
```

### 5. SignalR - Configuracao
```csharp
// Program.cs
builder.Services.AddSignalR();
app.MapHub<TorneioHub>("/hubs/torneio");

// _Imports.razor
@using Microsoft.AspNetCore.SignalR.Client
```

### 6. DTOs - Convencoes
- Usar `record` para DTOs imutaveis
- Propriedades de tempo: `TimeRemainingSeconds` (int)
- Status derivados de propriedades existentes, nao campos separados

### 7. Mobile Responsivo - Padroes

**Layout Mobile**: Usar classes CSS customizadas em `wwwroot/app.css`:
```css
.mobile-page { display: flex; flex-direction: column; height: 100vh; }
.mobile-fixed-header { flex-shrink: 0; z-index: 100; }
.mobile-scroll-content { flex: 1; overflow-y: auto; padding-bottom: 80px; }
```

**Headers com texto longo**: Usar truncamento:
```razor
<div style="flex: 1; min-width: 0; overflow: hidden;">
    <MudText Typo="Typo.subtitle1" Style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        @_league.Name
    </MudText>
</div>
<div style="flex-shrink: 0;">
    @* botoes que nao devem encolher *@
</div>
```

**Bottom Navigation**: NAO usar MudNavMenu/MudNavLink (estilos dificeis de sobrescrever). Usar HTML puro:
```razor
<div class="bottom-nav-container">
    <button class="bottom-nav-item @(active ? "active" : "")" @onclick="...">
        <MudIcon Icon="@Icons.Material.Filled.People" Size="Size.Small" />
        <span>Label</span>
    </button>
</div>
```
CSS em `wwwroot/app.css` classe `.bottom-nav-container` e `.bottom-nav-item`.

**ResponsiveLayout**: Componente em `Components/Layout/ResponsiveLayout.razor` para alternar entre Mobile e Desktop baseado em breakpoint.

### 8. Auto-Inscricao em Torneios

**Jogadores podem se inscrever** diretamente em torneios agendados via:
- `Dashboard.razor` - botao "Inscrever-me" para membros da liga
- `Join.razor` - pagina publica via codigo de convite `/torneios/entrar/{InviteCode}`

**Metodos no TournamentService**:
```csharp
Task<(bool Success, string Message)> SelfRegisterPlayerAsync(Guid tournamentId, string userId);
Task<bool> SelfUnregisterPlayerAsync(Guid tournamentId, string userId);
Task<bool> IsUserRegisteredInTournamentAsync(Guid tournamentId, string userId);
```

**Bloqueio por Debitos**: Se `League.BlockCheckInWithDebt == true`, jogadores com debitos pendentes nao podem se inscrever (verificado em `SelfRegisterPlayerAsync`). Admins podem adicionar jogadores diretamente via `AddPlayerToTournamentAsync` (sem verificacao).

### 9. Sistema de Pagamentos/Debitos

**Entidades**:
- `Payment` - registra debitos entre jogadores
- `PaymentStatus`: Pending, Paid, Confirmed
- `PaymentType`: Poker, Expense, Jackpot

**Verificar debitos de um jogador**:
```csharp
// PaymentService
Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsByPlayerAsync(Guid playerId);

// Verificacao direta no TournamentService
var hasPendingDebts = await _context.Payments
    .AnyAsync(p => p.FromPlayerId == playerId &&
                  p.Status == PaymentStatus.Pending &&
                  p.ToPlayerId != null);
```

---

## Arquivos Importantes

### Documentacao
- `VISUAL_IDENTITY.md` - **Guia de identidade visual** (cores, fontes, componentes, layout responsivo). Consultar ao refatorar UI.

### Configuracoes de Entidade
- `src/PokerHub.Infrastructure/Data/Configurations/` - Todas as configuracoes EF

### Services Principais
- `src/PokerHub.Application/Services/TournamentService.cs` - Logica de torneios, inscricoes, check-in
- `src/PokerHub.Application/Services/PaymentService.cs` - Calculos de pagamentos, debitos
- `src/PokerHub.Application/Services/LeagueService.cs` - Gestao de ligas, membros
- `src/PokerHub.Application/Services/PlayerService.cs` - CRUD de jogadores
- `src/PokerHub.Web/Services/TournamentTimerService.cs` - Background service do timer

### Interfaces
- `src/PokerHub.Application/Interfaces/` - Todas as interfaces dos services

### Hubs SignalR
- `src/PokerHub.Web/Hubs/TorneioHub.cs` - Hub para tempo real

### Estilos CSS
- `src/PokerHub.Web/wwwroot/app.css` - CSS customizado (mobile layouts, bottom-nav, etc)

### Layout Components
- `src/PokerHub.Web/Components/Layout/ResponsiveLayout.razor` - Alternancia Mobile/Desktop

### Paginas Principais
```
Components/Pages/
├── Liga/
│   ├── Index.razor      # Lista de ligas
│   ├── Create.razor     # Criar liga
│   ├── Details.razor    # Lobby da liga (mobile tem bottom-nav customizado)
│   └── Edit.razor       # Editar liga
├── Torneio/
│   ├── Index.razor      # Lista de torneios
│   ├── Create.razor     # Wizard 5 passos
│   ├── Dashboard.razor  # Painel de controle + auto-inscricao
│   ├── Join.razor       # Inscricao via codigo de convite
│   └── Edit.razor       # Editar torneio
├── Timer/               # Timer TV mode
├── Pagamento/
│   ├── TournamentPayments.razor  # Pagamentos pos-torneio
│   └── MyDebts.razor            # Meus debitos com PIX
├── Ranking/             # Ranking e estatisticas
└── Jogador/             # CRUD de jogadores
```

### Componentes Shared
- `src/PokerHub.Web/Components/Shared/TournamentMobileDashboard.razor` - Dashboard mobile do torneio
- `src/PokerHub.Web/Components/Pages/Torneio/AddTournamentPlayerDialog.razor` - Dialog para admin adicionar jogador

### Referencia de Identidade Visual
- `src/PokerHub.Web/Components/Pages/Ranking/PlayerStats.razor` - **Implementacao de referencia** para nova identidade visual
- `src/PokerHub.Web/Components/Pages/Ranking/PlayerStats.razor.css` - CSS com variaveis MudBlazor e layout responsivo

---

## Sprints Implementados

### Sprint 1 & 2: Foundation (COMPLETO)
- [x] Application Layer (DTOs, Services, Interfaces)
- [x] Liga pages (Index, Create, Details, Edit)
- [x] Jogador pages (via dialogs e Edit page)
- [x] NavMenu atualizado

### Sprint 3: Timer e SignalR (COMPLETO)
- [x] TorneioHub.cs - Hub SignalR
- [x] TournamentTimerService.cs - Background service
- [x] Timer/Index.razor - Display TV mode
- [x] Configuracao SignalR no Program.cs

### Sprint 4: Gestao de Torneio (COMPLETO)
- [x] Torneio/Index.razor - Lista por status
- [x] Torneio/Create.razor - Wizard 5 passos
- [x] Torneio/Dashboard.razor - Painel de controle
- [x] AddTournamentPlayerDialog.razor

### Sprint 5: Sistema de Pagamentos (COMPLETO)
- [x] TournamentPayments.razor - Calculos pos-torneio
- [x] MyDebts.razor - Gestao de debitos com PIX

### Sprint 6: Ranking e Estatisticas (COMPLETO)
- [x] LeagueRanking.razor - Ranking da liga
- [x] PlayerStats.razor - Estatisticas individuais

---

## Plano de Referencia Original

### Templates de Blinds Padrao

#### Turbo (10 min por nivel)
| Nivel | SB | BB | Ante | Duracao |
|-------|-----|------|------|---------|
| 1 | 25 | 50 | 0 | 10 min |
| 2 | 50 | 100 | 0 | 10 min |
| 3 | 75 | 150 | 0 | 10 min |
| 4 | 100 | 200 | 25 | 10 min |
| - | BREAK | - | - | 10 min |
| 5 | 150 | 300 | 50 | 10 min |
| 6 | 200 | 400 | 50 | 10 min |
| 7 | 300 | 600 | 75 | 10 min |
| 8 | 400 | 800 | 100 | 10 min |
| 9 | 500 | 1000 | 100 | 10 min |
| 10 | 600 | 1200 | 200 | 10 min |

#### Regular (15 min por nivel)
| Nivel | SB | BB | Ante | Duracao |
|-------|-----|------|------|---------|
| 1 | 25 | 50 | 0 | 15 min |
| 2 | 50 | 100 | 0 | 15 min |
| 3 | 75 | 150 | 0 | 15 min |
| 4 | 100 | 200 | 25 | 15 min |
| - | BREAK | - | - | 15 min |
| 5 | 150 | 300 | 25 | 15 min |
| 6 | 200 | 400 | 50 | 15 min |
| 7 | 300 | 600 | 75 | 15 min |
| - | BREAK | - | - | 10 min |
| 8 | 400 | 800 | 100 | 15 min |
| 9 | 500 | 1000 | 100 | 15 min |
| 10 | 600 | 1200 | 200 | 15 min |

#### Deep Stack (20 min por nivel)
| Nivel | SB | BB | Ante | Duracao |
|-------|-----|------|------|---------|
| 1 | 25 | 50 | 0 | 20 min |
| 2 | 50 | 100 | 0 | 20 min |
| 3 | 75 | 150 | 0 | 20 min |
| 4 | 100 | 200 | 0 | 20 min |
| - | BREAK | - | - | 15 min |
| 5 | 125 | 250 | 25 | 20 min |
| 6 | 150 | 300 | 25 | 20 min |
| 7 | 200 | 400 | 50 | 20 min |
| 8 | 250 | 500 | 50 | 20 min |
| - | BREAK | - | - | 15 min |
| 9 | 300 | 600 | 75 | 20 min |
| 10 | 400 | 800 | 100 | 20 min |
| 11 | 500 | 1000 | 100 | 20 min |
| 12 | 600 | 1200 | 200 | 20 min |

### Estruturas de Premiacao Padrao
| Jogadores | 1o | 2o | 3o | 4o |
|-----------|-----|-----|-----|-----|
| 2-3 | 100% | - | - | - |
| 4-5 | 70% | 30% | - | - |
| 6-7 | 55% | 30% | 15% | - |
| 8-10 | 50% | 30% | 15% | 5% |

---

## Proximos Passos Sugeridos

### Melhorias de UX
- [ ] Adicionar loading states em todas as paginas
- [ ] Implementar notificacoes push para pagamentos
- [ ] Modo offline para timer

### Funcionalidades Adicionais
- [ ] Historico de torneios com graficos
- [ ] Exportacao de dados (PDF/Excel)
- [ ] Sistema de convites por email
- [ ] Integracao com WhatsApp para notificacoes

### Infraestrutura
- [ ] Testes unitarios e de integracao
- [ ] CI/CD pipeline
- [ ] Monitoramento e logging
- [ ] Cache Redis para performance

---

## Notas para Futuras Sessoes

1. **Sempre verificar rendermode**: Paginas Blazor com formularios precisam de `@rendermode InteractiveServer`

2. **EF Migrations**: Usar os exports de ambiente antes de rodar comandos EF:
   ```bash
   export DOTNET_ROOT=/home/anderson/.dotnet
   export PATH="$PATH:$HOME/.dotnet/tools"
   ```

3. **Cascade Delete**: Ao criar novos relacionamentos, verificar se nao criam ciclos de cascade

4. **Connection String**: Esta em `appsettings.json` apontando para Azure SQL

5. **MudBlazor**: Documentacao em https://mudblazor.com/

6. **Tema**: Usando tema escuro com verde poker como cor primaria

### 7. Mobile Responsive - Bottom Navigation
**Problema**: MudNavMenu/MudNavLink tem estilos dificeis de sobrescrever, causando truncamento de texto

**Solucao**: Usar HTML puro com CSS customizado ao inves de componentes MudBlazor:
```razor
<div class="bottom-nav-container">
    <button class="bottom-nav-item @(_activeTab == 0 ? "active" : "")" @onclick="@(() => _activeTab = 0)">
        <MudIcon Icon="@Icons.Material.Filled.People" Size="Size.Small" />
        <span>Jogadores</span>
    </button>
    <a class="bottom-nav-item" href="@($"/rota")">
        <MudIcon Icon="@Icons.Material.Filled.Savings" Size="Size.Small" />
        <span>Caixa</span>
    </a>
</div>
```

**CSS em app.css**:
```css
.bottom-nav-container {
    position: fixed; bottom: 0; left: 0; right: 0;
    display: flex; justify-content: space-around;
    background: var(--mud-palette-surface);
    padding: 8px 4px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
}
.bottom-nav-item {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; gap: 4px;
    background: transparent; border: none;
    color: var(--mud-palette-text-secondary);
}
.bottom-nav-item.active { color: #ffc107; }
.bottom-nav-item span { font-size: 10px; white-space: nowrap; }
```

### 8. Auto-Inscricao em Torneios
**Funcionalidade**: Jogadores podem se auto-inscrever em torneios agendados de ligas que participam

**Arquivos**:
- `TournamentService.SelfRegisterPlayerAsync()` - Retorna `(bool Success, string Message)`
- `Dashboard.razor` - Botao "Inscrever-me" / status "Inscrito"
- `TournamentMobileDashboard.razor` - Mesma logica para mobile

**Verificacoes**:
1. Usuario e membro da liga
2. Torneio esta em status Scheduled
3. Usuario nao esta inscrito ainda
4. Usuario nao tem debitos pendentes (se `League.BlockCheckInWithDebt = true`)

### 9. Sistema de Debitos e Bloqueio
**Propriedade**: `League.BlockCheckInWithDebt` (bool)

**Comportamento**:
- Se `true`: Jogadores com debitos pendentes NAO podem se auto-inscrever
- Admins podem adicionar jogadores diretamente (bypass)

**Verificacao de debitos**:
```csharp
var hasPendingDebts = await _context.Payments
    .AnyAsync(p => p.FromPlayerId == player.Id &&
                  p.Status == PaymentStatus.Pending &&
                  p.ToPlayerId != null);
```

### 10. EF Core - Atualizar Entidades com Colecoes Filhas
**Problema**: Erro de concorrencia otimista ao atualizar entidade pai e substituir colecao filha:
`The database operation was expected to affect 1 row(s), but actually affected 0 row(s)`

**Causa**: Usar `RemoveRange(entity.Children)` + `entity.Children.Add(new...)` causa conflito no change tracker do EF.

**Solucao**: Usar `ExecuteDeleteAsync()` para deletar filhos diretamente no banco (bypassa change tracker):
```csharp
// NAO FAZER:
_context.ChildEntities.RemoveRange(parent.Children);
parent.Children.Clear();
parent.Children.Add(new Child { ... }); // Conflito!

// FAZER:
await _context.ChildEntities
    .Where(c => c.ParentId == parentId)
    .ExecuteDeleteAsync(); // Deleta direto no banco

var newChildren = new List<Child> { new Child { ... } };
_context.ChildEntities.AddRange(newChildren); // Adiciona novos
await _context.SaveChangesAsync();
```

**Exemplo real**: `TournamentExpenseService.UpdateExpenseAsync()` - atualiza despesa e substitui shares.

### 11. Dialogs Reutilizaveis para Criar/Editar
**Padrao**: Usar mesmo dialog para criar e editar, com parametro `Id` opcional.

```csharp
// Dialog
[Parameter] public Guid? ExpenseId { get; set; }
private bool _isEditMode => ExpenseId.HasValue;

protected override async Task OnInitializedAsync()
{
    if (_isEditMode)
    {
        var existing = await Service.GetByIdAsync(ExpenseId!.Value);
        // Preencher campos com dados existentes
    }
}

private async Task Submit()
{
    if (_isEditMode)
        await Service.UpdateAsync(ExpenseId!.Value, dto);
    else
        await Service.CreateAsync(dto);
}
```

**Exemplo**: `AddExpenseDialog.razor` - cria ou edita despesas de torneio.
