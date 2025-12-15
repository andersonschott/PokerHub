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

---

## Arquivos Importantes

### Configuracoes de Entidade
- `src/PokerHub.Infrastructure/Data/Configurations/` - Todas as configuracoes EF

### Services
- `src/PokerHub.Application/Services/` - Logica de negocio
- `src/PokerHub.Web/Services/TournamentTimerService.cs` - Background service do timer

### Hubs SignalR
- `src/PokerHub.Web/Hubs/TorneioHub.cs` - Hub para tempo real

### Paginas Principais
```
Components/Pages/
├── Liga/           # CRUD de ligas
├── Jogador/        # CRUD de jogadores
├── Torneio/        # Gestao de torneios (Index, Create, Dashboard)
├── Timer/          # Timer TV mode
├── Pagamento/      # Sistema de pagamentos
└── Ranking/        # Ranking e estatisticas
```

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
