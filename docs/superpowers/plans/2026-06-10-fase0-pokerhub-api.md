# Fase 0 — Fundação PokerHub.Api Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o projeto `PokerHub.Api` (.NET 10 minimal APIs) com autenticação JWT + refresh token rotativo sobre o ASP.NET Identity existente, endpoints de Auth e Ligas, e testes de integração — sem tocar no PokerHub.Web (Blazor continua funcionando).

**Architecture:** `PokerHub.Api` é um host fino sobre `PokerHub.Application` (services existentes, intocados) e `PokerHub.Infrastructure` (EF, intocado exceto nova entidade `RefreshToken`). Auth replica o padrão do health-system (`/home/aschott/Projects/health-system`): access token JWT de 15 min + refresh token de 30 dias com rotação e hash SHA-256 no banco. **Importante:** `User : IdentityUser` usa chave **string** — `RefreshToken.UserId` é `string`, não Guid. O timer/SignalR NÃO entram nesta fase (ficam no Web até a Onda 4, conforme `~/Documents/Obsidian/1 - Projetos/Migracao PokerHub React/03-roadmap-fases.md`).

**Tech Stack:** .NET 10, minimal APIs, ASP.NET Identity (existente), `Microsoft.AspNetCore.Authentication.JwtBearer`, EF Core 10 + SQL Server (prod) / SQLite in-memory (testes), xunit + `Microsoft.AspNetCore.Mvc.Testing`.

**Convenções do repo:** solution é `PokerHub.slnx` (formato novo). Testes existentes em `tests/PokerHub.Application.Tests` (xunit 2.9.3, sem FluentAssertions — usar `Assert.*`). Sem Mediator/CQRS — services diretos. Commits em inglês no padrão dos recentes (`feat: ...`, sem escopo).

---

### Task 1: Criar projeto PokerHub.Api com Program.cs mínimo

**Files:**
- Create: `src/PokerHub.Api/PokerHub.Api.csproj`
- Create: `src/PokerHub.Api/Program.cs`
- Create: `src/PokerHub.Api/Properties/launchSettings.json`
- Create: `src/PokerHub.Api/appsettings.json`
- Create: `src/PokerHub.Api/appsettings.Development.json`
- Modify: `PokerHub.slnx` (via `dotnet sln add`)

- [ ] **Step 1: Criar csproj e adicionar à solution**

Criar `src/PokerHub.Api/PokerHub.Api.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <Nullable>enable</Nullable>
        <ImplicitUsings>enable</ImplicitUsings>
        <UserSecretsId>pokerhub-api-f0a1b2c3</UserSecretsId>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.1" />
        <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="10.0.1" />
        <PackageReference Include="Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore" Version="10.0.1" />
    </ItemGroup>

    <ItemGroup>
        <ProjectReference Include="..\PokerHub.Application\PokerHub.Application.csproj" />
        <ProjectReference Include="..\PokerHub.Infrastructure\PokerHub.Infrastructure.csproj" />
    </ItemGroup>

</Project>
```

Run: `cd /var/home/aschott/Projects/PokerHub && dotnet sln PokerHub.slnx add src/PokerHub.Api/PokerHub.Api.csproj`
Expected: `Project added to the solution.` (ou mensagem equivalente do slnx)

- [ ] **Step 2: Program.cs mínimo (DbContext + Identity + services + health)**

Criar `src/PokerHub.Api/Program.cs`:

```csharp
using System.Globalization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PokerHub.Application;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Cultura pt-BR (mesma configuração do PokerHub.Web)
var cultureInfo = new CultureInfo("pt-BR");
CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<PokerHubDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
        sqlOptions.CommandTimeout(60);
    }));

// Identity core sem cookies — a API é JWT-only. AddSignInManager fica de fora;
// senha é validada via UserManager.CheckPasswordAsync.
builder.Services.AddIdentityCore<User>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
        options.Stores.SchemaVersion = IdentitySchemaVersions.Version3;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<PokerHubDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddApplicationServices();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<PokerHubDbContext>("database");

var app = builder.Build();

app.MapHealthChecks("/health");

app.Run();

// Exposto para WebApplicationFactory nos testes de integração.
public partial class Program { }
```

- [ ] **Step 3: launchSettings + appsettings**

Criar `src/PokerHub.Api/Properties/launchSettings.json`:

```json
{
  "$schema": "https://json.schemastore.org/launchsettings.json",
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "applicationUrl": "http://localhost:5100",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

Criar `src/PokerHub.Api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "Jwt": {
    "Issuer": "pokerhub",
    "Audience": "pokerhub-api",
    "SigningKey": "",
    "AccessTokenLifetimeMinutes": 15,
    "RefreshTokenLifetimeDays": 30
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

Criar `src/PokerHub.Api/appsettings.Development.json` copiando a connection string do Web (não inventar valor — copiar do arquivo real):

Run: `python3 - <<'EOF'
import json
web = json.load(open('src/PokerHub.Web/appsettings.json'))
dev = {
  "ConnectionStrings": {"DefaultConnection": web["ConnectionStrings"]["DefaultConnection"]},
  "Jwt": {
    "Issuer": "pokerhub",
    "Audience": "pokerhub-api",
    "SigningKey": "dev-only-signing-key-32-plus-chars-pokerhub!",
    "AccessTokenLifetimeMinutes": 15,
    "RefreshTokenLifetimeDays": 30
  }
}
json.dump(dev, open('src/PokerHub.Api/appsettings.Development.json','w'), indent=2)
EOF`
Expected: arquivo criado; `ConnectionStrings.DefaultConnection` idêntico ao do Web.

- [ ] **Step 4: Build**

Run: `dotnet build src/PokerHub.Api/PokerHub.Api.csproj`
Expected: `Build succeeded` com 0 erros (warnings de nullable são aceitáveis se já existirem no repo).

- [ ] **Step 5: Commit**

```bash
git add src/PokerHub.Api PokerHub.slnx
git commit -m "feat: scaffold PokerHub.Api host project (minimal APIs, Identity core, health check)"
```

---

### Task 2: Entidade RefreshToken + testes + migration

**Files:**
- Create: `src/PokerHub.Domain/Entities/RefreshToken.cs`
- Create: `src/PokerHub.Infrastructure/Data/Configurations/RefreshTokenConfiguration.cs`
- Modify: `src/PokerHub.Infrastructure/Data/PokerHubDbContext.cs` (adicionar DbSet)
- Test: `tests/PokerHub.Application.Tests/RefreshTokenTests.cs`
- Create (gerada): `src/PokerHub.Infrastructure/Data/Migrations/*_AddRefreshTokens.cs`

- [ ] **Step 1: Escrever os testes da entidade (falhando)**

Criar `tests/PokerHub.Application.Tests/RefreshTokenTests.cs`:

```csharp
using PokerHub.Domain.Entities;

namespace PokerHub.Application.Tests;

public class RefreshTokenTests
{
    private static readonly DateTime Now = new(2026, 6, 10, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Issue_StoresHashNotRawToken()
    {
        var token = RefreshToken.Issue("user-1", "raw-secret", TimeSpan.FromDays(30), Now);

        Assert.NotEqual("raw-secret", token.TokenHash);
        Assert.Equal(RefreshToken.HashToken("raw-secret"), token.TokenHash);
        Assert.Equal("user-1", token.UserId);
        Assert.Equal(Now.AddDays(30), token.ExpiresAt);
    }

    [Fact]
    public void HashToken_IsDeterministic()
    {
        Assert.Equal(RefreshToken.HashToken("abc"), RefreshToken.HashToken("abc"));
        Assert.NotEqual(RefreshToken.HashToken("abc"), RefreshToken.HashToken("abd"));
    }

    [Fact]
    public void IsActive_FalseWhenExpired()
    {
        var token = RefreshToken.Issue("user-1", "raw", TimeSpan.FromDays(1), Now);

        Assert.True(token.IsActive(Now.AddHours(23)));
        Assert.False(token.IsActive(Now.AddDays(2)));
    }

    [Fact]
    public void Revoke_SetsRevokedAtAndChainsReplacement()
    {
        var token = RefreshToken.Issue("user-1", "raw", TimeSpan.FromDays(30), Now);
        var replacementId = Guid.NewGuid();

        token.Revoke(replacementId, Now.AddMinutes(5));

        Assert.True(token.IsRevoked);
        Assert.Equal(Now.AddMinutes(5), token.RevokedAt);
        Assert.Equal(replacementId, token.ReplacedByTokenId);
        Assert.False(token.IsActive(Now.AddMinutes(6)));
    }

    [Fact]
    public void Revoke_IsIdempotent()
    {
        var token = RefreshToken.Issue("user-1", "raw", TimeSpan.FromDays(30), Now);
        token.Revoke(null, Now.AddMinutes(5));
        token.Revoke(Guid.NewGuid(), Now.AddMinutes(10));

        Assert.Equal(Now.AddMinutes(5), token.RevokedAt);
        Assert.Null(token.ReplacedByTokenId);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `dotnet test tests/PokerHub.Application.Tests --filter RefreshTokenTests`
Expected: FAIL — `RefreshToken` não existe (erro de compilação CS0246).

- [ ] **Step 3: Implementar a entidade**

Criar `src/PokerHub.Domain/Entities/RefreshToken.cs`:

```csharp
using System.Security.Cryptography;
using System.Text;

namespace PokerHub.Domain.Entities;

/// <summary>
/// Refresh token persistido para renovar access tokens sem repetir credenciais.
/// O valor bruto vive apenas no cliente; o banco guarda somente o hash SHA-256,
/// então um vazamento de banco não permite forjar sessões.
/// Rotação: cada refresh revoga o token atual e emite um novo, encadeado via
/// ReplacedByTokenId para análise forense.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; private set; }

    /// <summary>FK para AspNetUsers (IdentityUser usa chave string).</summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>Hash SHA-256 (hex) do token bruto. Nunca armazenar o valor bruto.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }

    public bool IsRevoked => RevokedAt is not null;
    public bool IsExpired(DateTime utcNow) => utcNow >= ExpiresAt;
    public bool IsActive(DateTime utcNow) => !IsRevoked && !IsExpired(utcNow);

    private RefreshToken() { } // EF Core

    public static RefreshToken Issue(string userId, string rawToken, TimeSpan ttl, DateTime utcNow)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(rawToken))
            throw new ArgumentException("Raw token is required.", nameof(rawToken));
        if (ttl <= TimeSpan.Zero)
            throw new ArgumentException("TTL must be positive.", nameof(ttl));

        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = HashToken(rawToken),
            CreatedAt = utcNow,
            ExpiresAt = utcNow.Add(ttl)
        };
    }

    public void Revoke(Guid? replacedByTokenId, DateTime utcNow)
    {
        if (RevokedAt is not null) return; // idempotente
        RevokedAt = utcNow;
        ReplacedByTokenId = replacedByTokenId;
    }

    public static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }
}
```

- [ ] **Step 4: Rodar testes e ver passar**

Run: `dotnet test tests/PokerHub.Application.Tests --filter RefreshTokenTests`
Expected: PASS — 5 testes.

- [ ] **Step 5: Configuração EF + DbSet**

Criar `src/PokerHub.Infrastructure/Data/Configurations/RefreshTokenConfiguration.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.UserId)
            .IsRequired()
            .HasMaxLength(450); // mesmo tamanho da PK de AspNetUsers

        builder.Property(t => t.TokenHash)
            .IsRequired()
            .HasMaxLength(64); // SHA-256 hex

        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasIndex(t => t.UserId);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

Em `src/PokerHub.Infrastructure/Data/PokerHubDbContext.cs`, adicionar após a linha `public DbSet<TournamentDelegate> TournamentDelegates => Set<TournamentDelegate>();`:

```csharp
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
```

- [ ] **Step 6: Build + gerar migration**

Run: `dotnet build`
Expected: Build succeeded.

Run (se `dotnet ef` não estiver disponível, instalar antes com `dotnet tool install --global dotnet-ef`):
```bash
dotnet ef migrations add AddRefreshTokens --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web --output-dir Data/Migrations
```
Expected: `Done.` — novo arquivo `*_AddRefreshTokens.cs` criando apenas a tabela `RefreshTokens` (verificar que o `Up()` NÃO contém DropTable/AlterColumn de outras tabelas; se contiver, PARAR e investigar antes de aplicar).

> Nota: usar `--startup-project src/PokerHub.Web` (e não Api) porque o `PokerHubDbContextFactory` design-time lê `../PokerHub.Web/appsettings.json`. Gerar migration não conecta no banco.

- [ ] **Step 7: Aplicar migration**

⚠️ O banco é o Azure SQL usado pelo grupo. A migration é **aditiva** (só cria tabela nova) — não afeta o Blazor em produção. Conferir o `Up()` antes (passo anterior).

Run: `dotnet ef database update --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web`
Expected: `Applying migration '..._AddRefreshTokens'. Done.`

- [ ] **Step 8: Commit**

```bash
git add src/PokerHub.Domain/Entities/RefreshToken.cs src/PokerHub.Infrastructure/Data tests/PokerHub.Application.Tests/RefreshTokenTests.cs
git commit -m "feat: add RefreshToken entity with SHA-256 hashing and rotation chain"
```

---

### Task 3: JwtTokenService + RefreshTokenService (no projeto Api)

**Files:**
- Create: `src/PokerHub.Api/Auth/JwtOptions.cs`
- Create: `src/PokerHub.Api/Auth/JwtTokenService.cs`
- Create: `src/PokerHub.Api/Auth/RefreshTokenService.cs`
- Create: `tests/PokerHub.Api.Tests/PokerHub.Api.Tests.csproj`
- Test: `tests/PokerHub.Api.Tests/JwtTokenServiceTests.cs`

> Os serviços de token moram no Api (único consumidor) para não levar pacotes JWT para a Application.

- [ ] **Step 1: Criar projeto de testes do Api**

Criar `tests/PokerHub.Api.Tests/PokerHub.Api.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="coverlet.collector" Version="6.0.4" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.1" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="10.0.1" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.4" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\PokerHub.Api\PokerHub.Api.csproj" />
  </ItemGroup>

</Project>
```

Run: `dotnet sln PokerHub.slnx add tests/PokerHub.Api.Tests/PokerHub.Api.Tests.csproj`
Expected: projeto adicionado.

- [ ] **Step 2: Teste do JwtTokenService (falhando)**

Criar `tests/PokerHub.Api.Tests/JwtTokenServiceTests.cs`:

```csharp
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using PokerHub.Api.Auth;

namespace PokerHub.Api.Tests;

public class JwtTokenServiceTests
{
    private static JwtTokenService CreateSut() => new(Options.Create(new JwtOptions
    {
        Issuer = "pokerhub-test",
        Audience = "pokerhub-api-test",
        SigningKey = "test-signing-key-with-32-plus-characters!",
        AccessTokenLifetimeMinutes = 15
    }));

    [Fact]
    public void GenerateAccessToken_ContainsExpectedClaims()
    {
        var sut = CreateSut();

        var jwt = sut.GenerateAccessToken("user-123", "Anderson", "a@a.com");

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);
        Assert.Equal("pokerhub-test", token.Issuer);
        Assert.Equal("user-123", token.Claims.Single(c => c.Type == "sub").Value);
        Assert.Equal("Anderson", token.Claims.Single(c => c.Type == "name").Value);
        Assert.Equal("a@a.com", token.Claims.Single(c => c.Type == "email").Value);
        Assert.NotEmpty(token.Claims.Single(c => c.Type == "jti").Value);
    }

    [Fact]
    public void GenerateAccessToken_ExpiresInConfiguredLifetime()
    {
        var sut = CreateSut();
        var before = DateTime.UtcNow;

        var jwt = sut.GenerateAccessToken("user-123", "Anderson", "a@a.com");

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);
        Assert.InRange(token.ValidTo, before.AddMinutes(14), before.AddMinutes(16));
    }

    [Fact]
    public void RefreshTokenService_GeneratesUniqueUrlSafeTokens()
    {
        var refreshSvc = new RefreshTokenService(Options.Create(new JwtOptions
        {
            Issuer = "x", Audience = "y",
            SigningKey = "test-signing-key-with-32-plus-characters!",
            RefreshTokenLifetimeDays = 30
        }));

        var (raw1, entity1) = refreshSvc.Issue("user-1", DateTime.UtcNow);
        var (raw2, _) = refreshSvc.Issue("user-1", DateTime.UtcNow);

        Assert.NotEqual(raw1, raw2);
        Assert.DoesNotContain('+', raw1);
        Assert.DoesNotContain('/', raw1);
        Assert.DoesNotContain('=', raw1);
        Assert.Equal(PokerHub.Domain.Entities.RefreshToken.HashToken(raw1), entity1.TokenHash);
    }
}
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `dotnet test tests/PokerHub.Api.Tests`
Expected: FAIL — namespace `PokerHub.Api.Auth` não existe.

- [ ] **Step 4: Implementar JwtOptions + serviços**

Criar `src/PokerHub.Api/Auth/JwtOptions.cs`:

```csharp
namespace PokerHub.Api.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = null!;
    public string Audience { get; set; } = null!;
    public string SigningKey { get; set; } = null!;

    /// <summary>Vida do access token. Curta — renovada de forma transparente pelo refresh.</summary>
    public int AccessTokenLifetimeMinutes { get; set; } = 15;

    public int RefreshTokenLifetimeDays { get; set; } = 30;
}
```

Criar `src/PokerHub.Api/Auth/JwtTokenService.cs`:

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace PokerHub.Api.Auth;

public sealed class JwtTokenService
{
    private readonly JwtOptions _opts;

    public JwtTokenService(IOptions<JwtOptions> opts) => _opts = opts.Value;

    public string GenerateAccessToken(string userId, string name, string email)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opts.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("sub", userId),
            new("jti", Guid.NewGuid().ToString()),
            new("name", name),
            new("email", email)
        };

        var now = DateTime.UtcNow;
        var token = new JwtSecurityToken(
            issuer: _opts.Issuer,
            audience: _opts.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(_opts.AccessTokenLifetimeMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

Criar `src/PokerHub.Api/Auth/RefreshTokenService.cs`:

```csharp
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using PokerHub.Domain.Entities;

namespace PokerHub.Api.Auth;

public sealed class RefreshTokenService
{
    private readonly JwtOptions _opts;

    public RefreshTokenService(IOptions<JwtOptions> opts) => _opts = opts.Value;

    /// <summary>
    /// Gera token bruto (64 bytes aleatórios, base64url — sem +/= que quebram URLs)
    /// e a entidade correspondente já com hash. O bruto vai só para o cliente.
    /// </summary>
    public (string RawToken, RefreshToken Entity) Issue(string userId, DateTime utcNow)
    {
        Span<byte> bytes = stackalloc byte[64];
        RandomNumberGenerator.Fill(bytes);
        var raw = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var entity = RefreshToken.Issue(
            userId, raw, TimeSpan.FromDays(_opts.RefreshTokenLifetimeDays), utcNow);

        return (raw, entity);
    }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `dotnet test tests/PokerHub.Api.Tests`
Expected: PASS — 3 testes.

- [ ] **Step 6: Commit**

```bash
git add src/PokerHub.Api/Auth tests/PokerHub.Api.Tests PokerHub.slnx
git commit -m "feat: add JWT and refresh token services with unit tests"
```

---

### Task 4: Endpoints de Auth (register/login/refresh/logout) + JWT bearer no pipeline

**Files:**
- Create: `src/PokerHub.Api/Auth/AuthEndpoints.cs`
- Create: `src/PokerHub.Api/Auth/AuthModels.cs`
- Modify: `src/PokerHub.Api/Program.cs`
- Create: `tests/PokerHub.Api.Tests/ApiFactory.cs`
- Test: `tests/PokerHub.Api.Tests/AuthEndpointsTests.cs`

- [ ] **Step 1: Factory de testes com SQLite in-memory**

Criar `tests/PokerHub.Api.Tests/ApiFactory.cs`:

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Tests;

/// <summary>
/// WebApplicationFactory usando SQLite in-memory (conexão única mantida aberta —
/// o banco vive enquanto a conexão viver). EnsureCreated no lugar de migrations.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "unused-overridden-below",
                ["Jwt:Issuer"] = "pokerhub-test",
                ["Jwt:Audience"] = "pokerhub-api-test",
                ["Jwt:SigningKey"] = "test-signing-key-with-32-plus-characters!",
                ["Jwt:AccessTokenLifetimeMinutes"] = "15",
                ["Jwt:RefreshTokenLifetimeDays"] = "30"
            });
        });

        builder.ConfigureServices(services =>
        {
            var descriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<PokerHubDbContext>)
                         || d.ServiceType == typeof(PokerHubDbContext))
                .ToList();
            foreach (var d in descriptors) services.Remove(d);

            _connection.Open();
            services.AddDbContext<PokerHubDbContext>(options => options.UseSqlite(_connection));

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            scope.ServiceProvider.GetRequiredService<PokerHubDbContext>().Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection.Dispose();
    }
}
```

- [ ] **Step 2: Testes de integração de auth (falhando)**

Criar `tests/PokerHub.Api.Tests/AuthEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class AuthEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public AuthEndpointsTests(ApiFactory factory) => _client = factory.CreateClient();

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);

    private async Task<AuthResponse> RegisterAsync(string email)
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/register",
            new { Name = "Test User", Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    [Fact]
    public async Task Register_ThenLogin_ReturnsTokens()
    {
        await RegisterAsync("login@test.com");

        var resp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "login@test.com", Password = "Senha123!" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.False(string.IsNullOrEmpty(body!.AccessToken));
        Assert.False(string.IsNullOrEmpty(body.RefreshToken));
        Assert.Equal("login@test.com", body.Email);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        await RegisterAsync("wrongpw@test.com");

        var resp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "wrongpw@test.com", Password = "errada!" });

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Refresh_RotatesToken_OldOneStopsWorking()
    {
        var auth = await RegisterAsync("rotate@test.com");

        var first = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var rotated = await first.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotEqual(auth.RefreshToken, rotated!.RefreshToken);

        // o refresh antigo foi revogado na rotação
        var replay = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        // o novo continua válido
        var second = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = rotated.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        var auth = await RegisterAsync("logout@test.com");

        var logout = await _client.PostAsJsonAsync("/api/auth/logout",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var resp = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Refresh_UnknownToken_Returns401()
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = "token-fantasma" });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
}
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `dotnet test tests/PokerHub.Api.Tests --filter AuthEndpointsTests`
Expected: FAIL — 404 nos endpoints (não mapeados ainda).

- [ ] **Step 4: Models + endpoints**

Criar `src/PokerHub.Api/Auth/AuthModels.cs`:

```csharp
namespace PokerHub.Api.Auth;

public sealed record RegisterRequest(string Name, string Email, string Password);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshRequest(string RefreshToken);
public sealed record LogoutRequest(string RefreshToken);

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    string UserId,
    string Name,
    string Email);
```

Criar `src/PokerHub.Api/Auth/AuthEndpoints.cs`:

```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Auth;

public static class AuthEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth").AllowAnonymous();

        group.MapPost("/register", async (
            RegisterRequest req,
            UserManager<User> userManager,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var user = new User { UserName = email, Email = email, Name = req.Name.Trim() };

            var result = await userManager.CreateAsync(user, req.Password);
            if (!result.Succeeded)
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["register"] = result.Errors.Select(e => e.Description).ToArray()
                });

            return Results.Ok(await IssueTokensAsync(user, jwt, refreshSvc, db));
        });

        group.MapPost("/login", async (
            LoginRequest req,
            UserManager<User> userManager,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            var user = await userManager.FindByEmailAsync(req.Email.Trim().ToLowerInvariant());
            if (user is null || !user.IsActive || !await userManager.CheckPasswordAsync(user, req.Password))
                return Results.Problem(detail: "E-mail ou senha inválidos.", statusCode: 401);

            return Results.Ok(await IssueTokensAsync(user, jwt, refreshSvc, db));
        });

        group.MapPost("/refresh", async (
            RefreshRequest req,
            UserManager<User> userManager,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            // Resposta uniforme para unknown/expirado/revogado — não vazar status
            // de tokens roubados para quem sonda o endpoint.
            const string invalid = "Refresh token inválido.";

            if (string.IsNullOrWhiteSpace(req.RefreshToken))
                return Results.Problem(detail: invalid, statusCode: 401);

            var hash = RefreshToken.HashToken(req.RefreshToken);
            var existing = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
            var now = DateTime.UtcNow;

            if (existing is null || !existing.IsActive(now))
                return Results.Problem(detail: invalid, statusCode: 401);

            var user = await userManager.FindByIdAsync(existing.UserId);
            if (user is null || !user.IsActive)
                return Results.Problem(detail: invalid, statusCode: 401);

            // Rotação: emite o novo antes para encadear o ponteiro, depois revoga o antigo.
            var (raw, entity) = refreshSvc.Issue(user.Id, now);
            db.RefreshTokens.Add(entity);
            existing.Revoke(entity.Id, now);
            await db.SaveChangesAsync();

            var access = jwt.GenerateAccessToken(user.Id, user.Name, user.Email!);
            return Results.Ok(new AuthResponse(access, raw, user.Id, user.Name, user.Email!));
        });

        group.MapPost("/logout", async (LogoutRequest req, PokerHubDbContext db) =>
        {
            // Best-effort: sempre 204, mesmo para token desconhecido (fire-and-forget).
            if (!string.IsNullOrWhiteSpace(req.RefreshToken))
            {
                var hash = RefreshToken.HashToken(req.RefreshToken);
                var existing = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
                if (existing is not null)
                {
                    existing.Revoke(null, DateTime.UtcNow);
                    await db.SaveChangesAsync();
                }
            }
            return Results.NoContent();
        });
    }

    private static async Task<AuthResponse> IssueTokensAsync(
        User user, JwtTokenService jwt, RefreshTokenService refreshSvc, PokerHubDbContext db)
    {
        var (raw, entity) = refreshSvc.Issue(user.Id, DateTime.UtcNow);
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync();

        var access = jwt.GenerateAccessToken(user.Id, user.Name, user.Email!);
        return new AuthResponse(access, raw, user.Id, user.Name, user.Email!);
    }
}
```

- [ ] **Step 5: Wire-up no Program.cs**

Em `src/PokerHub.Api/Program.cs`:

Adicionar aos usings:

```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PokerHub.Api.Auth;
```

Após `builder.Services.AddApplicationServices();`, adicionar:

```csharp
// --- JWT bearer ---
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwtOpts = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");
if (string.IsNullOrWhiteSpace(jwtOpts.SigningKey) || jwtOpts.SigningKey.Length < 32)
    throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters.");

builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<RefreshTokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        // Mantém os nomes originais das claims (sub, name, email) sem remap XML.
        opts.MapInboundClaims = false;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOpts.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOpts.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOpts.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
            NameClaimType = "name"
        };
    });
builder.Services.AddAuthorization();
```

Após `var app = builder.Build();`, antes de `app.MapHealthChecks`:

```csharp
app.UseAuthentication();
app.UseAuthorization();

AuthEndpoints.Map(app);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `dotnet test tests/PokerHub.Api.Tests`
Expected: PASS — todos (3 unit + 5 integração).

- [ ] **Step 7: Commit**

```bash
git add src/PokerHub.Api tests/PokerHub.Api.Tests
git commit -m "feat: add auth endpoints (register/login/refresh/logout) with rotating refresh tokens"
```

---

### Task 5: Endpoints de Ligas com autorização

**Files:**
- Create: `src/PokerHub.Api/Common/ClaimsPrincipalExtensions.cs`
- Create: `src/PokerHub.Api/Leagues/LeagueEndpoints.cs`
- Modify: `src/PokerHub.Api/Program.cs` (mapear)
- Test: `tests/PokerHub.Api.Tests/LeagueEndpointsTests.cs`

- [ ] **Step 1: Testes de integração (falhando)**

Criar `tests/PokerHub.Api.Tests/LeagueEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class LeagueEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public LeagueEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string? Description, string InviteCode, string OrganizerId);

    private async Task<HttpClient> AuthenticatedClientAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        var auth = (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return client;
    }

    [Fact]
    public async Task GetLeagues_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/leagues");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task CreateLeague_ThenList_ReturnsIt()
    {
        var client = await AuthenticatedClientAsync("organizer@test.com");

        var create = await client.PostAsJsonAsync("/api/leagues",
            new { Name = "Liga Teste", Description = "desc", BlockCheckInWithDebt = false });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var league = await create.Content.ReadFromJsonAsync<LeagueResponse>();
        Assert.Equal("Liga Teste", league!.Name);
        Assert.False(string.IsNullOrEmpty(league.InviteCode));

        var list = await client.GetFromJsonAsync<List<LeagueResponse>>("/api/leagues");
        Assert.Contains(list!, l => l.Id == league.Id);
    }

    [Fact]
    public async Task UpdateLeague_AsNonOrganizer_Returns403()
    {
        var organizer = await AuthenticatedClientAsync("owner@test.com");
        var create = await organizer.PostAsJsonAsync("/api/leagues",
            new { Name = "Liga do Owner", Description = (string?)null, BlockCheckInWithDebt = false });
        var league = await create.Content.ReadFromJsonAsync<LeagueResponse>();

        var intruder = await AuthenticatedClientAsync("intruder@test.com");
        var update = await intruder.PutAsJsonAsync($"/api/leagues/{league!.Id}",
            new { Name = "Hackeada", Description = (string?)null, BlockCheckInWithDebt = false, JackpotPercentage = 0m });

        Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
    }

    [Fact]
    public async Task JoinByInviteCode_AddsUserAsPlayer()
    {
        var organizer = await AuthenticatedClientAsync("host@test.com");
        var create = await organizer.PostAsJsonAsync("/api/leagues",
            new { Name = "Liga Convite", Description = (string?)null, BlockCheckInWithDebt = false });
        var league = await create.Content.ReadFromJsonAsync<LeagueResponse>();

        var joiner = await AuthenticatedClientAsync("joiner@test.com");
        var join = await joiner.PostAsync($"/api/leagues/join/{league!.InviteCode}", null);
        Assert.Equal(HttpStatusCode.OK, join.StatusCode);

        var myLeagues = await joiner.GetFromJsonAsync<List<LeagueResponse>>("/api/leagues");
        Assert.Contains(myLeagues!, l => l.Id == league.Id);
    }

    [Fact]
    public async Task GetLeagueDetails_AsNonMember_Returns403()
    {
        var organizer = await AuthenticatedClientAsync("priv@test.com");
        var create = await organizer.PostAsJsonAsync("/api/leagues",
            new { Name = "Liga Privada", Description = (string?)null, BlockCheckInWithDebt = false });
        var league = await create.Content.ReadFromJsonAsync<LeagueResponse>();

        var outsider = await AuthenticatedClientAsync("outsider@test.com");
        var resp = await outsider.GetAsync($"/api/leagues/{league!.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `dotnet test tests/PokerHub.Api.Tests --filter LeagueEndpointsTests`
Expected: FAIL — 404 (endpoints não existem).

- [ ] **Step 3: Helper de claims + endpoints**

Criar `src/PokerHub.Api/Common/ClaimsPrincipalExtensions.cs`:

```csharp
using System.Security.Claims;

namespace PokerHub.Api.Common;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Lê o userId da claim "sub" (MapInboundClaims=false preserva o nome).</summary>
    public static string GetUserId(this ClaimsPrincipal principal)
        => principal.FindFirstValue("sub")
           ?? throw new InvalidOperationException("Authenticated principal without 'sub' claim.");

    public static string GetUserName(this ClaimsPrincipal principal)
        => principal.FindFirstValue("name") ?? string.Empty;

    public static string? GetUserEmail(this ClaimsPrincipal principal)
        => principal.FindFirstValue("email");
}
```

Criar `src/PokerHub.Api/Leagues/LeagueEndpoints.cs`:

```csharp
using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.League;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Leagues;

public static class LeagueEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/leagues").WithTags("Leagues").RequireAuthorization();

        // Minhas ligas (organizador + jogador), sem duplicatas.
        group.MapGet("/", async (ClaimsPrincipal user, ILeagueService leagues) =>
        {
            var userId = user.GetUserId();
            var asOrganizer = await leagues.GetLeaguesByUserAsync(userId);
            var asPlayer = await leagues.GetLeaguesAsPlayerAsync(userId);
            var all = asOrganizer.Concat(asPlayer)
                .DistinctBy(l => l.Id)
                .OrderBy(l => l.Name)
                .ToList();
            return Results.Ok(all);
        });

        group.MapGet("/{leagueId:guid}", async (Guid leagueId, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var league = await leagues.GetLeagueByIdAsync(leagueId);
            return league is null ? Results.NotFound() : Results.Ok(league);
        });

        group.MapGet("/{leagueId:guid}/players", async (Guid leagueId, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var league = await leagues.GetLeagueWithPlayersAsync(leagueId);
            return league is null ? Results.NotFound() : Results.Ok(league);
        });

        group.MapPost("/", async (CreateLeagueDto dto, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            var created = await leagues.CreateLeagueAsync(user.GetUserId(), dto);
            return Results.Created($"/api/leagues/{created.Id}", created);
        });

        group.MapPut("/{leagueId:guid}", async (Guid leagueId, UpdateLeagueDto dto, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var updated = await leagues.UpdateLeagueAsync(leagueId, dto);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        group.MapDelete("/{leagueId:guid}", async (Guid leagueId, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var deleted = await leagues.DeleteLeagueAsync(leagueId);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/{leagueId:guid}/regenerate-invite", async (Guid leagueId, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var code = await leagues.RegenerateInviteCodeAsync(leagueId);
            return Results.Ok(new { InviteCode = code });
        });

        group.MapPost("/join/{inviteCode}", async (string inviteCode, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            var league = await leagues.GetLeagueByInviteCodeAsync(inviteCode);
            if (league is null) return Results.NotFound();

            var (success, message) = await leagues.JoinLeagueAsync(
                league.Id, user.GetUserId(), user.GetUserName(), user.GetUserEmail());

            return success
                ? Results.Ok(new { league.Id, Message = message })
                : Results.Conflict(new { Message = message });
        });

        group.MapPost("/{leagueId:guid}/leave", async (Guid leagueId, ClaimsPrincipal user, ILeagueService leagues) =>
        {
            var (success, message) = await leagues.LeaveLeagueAsync(leagueId, user.GetUserId());
            return success
                ? Results.Ok(new { Message = message })
                : Results.Conflict(new { Message = message });
        });
    }
}
```

Em `src/PokerHub.Api/Program.cs`, adicionar using `PokerHub.Api.Leagues;` e, logo após `AuthEndpoints.Map(app);`:

```csharp
LeagueEndpoints.Map(app);
```

- [ ] **Step 4: Rodar e ver passar**

Run: `dotnet test tests/PokerHub.Api.Tests`
Expected: PASS — todos os testes (auth + leagues).
Nota: se `JoinLeagueAsync`/`LeaveLeagueAsync` falharem no SQLite por uso de feature SQL Server-specific (ex.: `ExecuteDeleteAsync` é suportado; tipos `decimal` são tolerados), investigar a mensagem real antes de mudar abordagem — não contornar silenciosamente.

- [ ] **Step 5: Commit**

```bash
git add src/PokerHub.Api tests/PokerHub.Api.Tests
git commit -m "feat: add league endpoints with organizer/member authorization"
```

---

### Task 6: CORS configurável + OpenAPI + smoke final

**Files:**
- Modify: `src/PokerHub.Api/Program.cs`
- Modify: `src/PokerHub.Api/PokerHub.Api.csproj` (pacote OpenApi)
- Test: `tests/PokerHub.Api.Tests/HealthAndDocsTests.cs`

- [ ] **Step 1: Teste de health + openapi (falhando no openapi)**

Criar `tests/PokerHub.Api.Tests/HealthAndDocsTests.cs`:

```csharp
using System.Net;

namespace PokerHub.Api.Tests;

public class HealthAndDocsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public HealthAndDocsTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Health_ReturnsHealthy()
    {
        var resp = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("Healthy", await resp.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task OpenApiDocument_IsServed()
    {
        var resp = await _client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadAsStringAsync();
        Assert.Contains("/api/auth/login", json);
        Assert.Contains("/api/leagues", json);
    }
}
```

Run: `dotnet test tests/PokerHub.Api.Tests --filter HealthAndDocsTests`
Expected: `Health_ReturnsHealthy` PASS; `OpenApiDocument_IsServed` FAIL (404).

- [ ] **Step 2: Adicionar OpenAPI + CORS**

Adicionar ao `src/PokerHub.Api/PokerHub.Api.csproj`, no ItemGroup de pacotes:

```xml
        <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.1" />
```

Em `src/PokerHub.Api/Program.cs`, após `builder.Services.AddAuthorization();`:

```csharp
builder.Services.AddOpenApi();

// CORS para o front (SWA em prod, Vite em dev usa proxy mas registramos por robustez).
// Origens vêm de config: "Cors:AllowedOrigins": ["http://localhost:5173", "https://<swa>.azurestaticapps.net"]
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("web", policy =>
    policy.WithOrigins(allowedOrigins)
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials()));
```

Após `var app = builder.Build();`, antes de `app.UseAuthentication();`:

```csharp
app.MapOpenApi(); // /openapi/v1.json — fonte para geração de tipos TS na Fase 1

if (allowedOrigins.Length > 0)
    app.UseCors("web");
```

Em `src/PokerHub.Api/appsettings.Development.json`, adicionar a seção (editar o JSON gerado na Task 1):

```json
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173"]
  }
```

- [ ] **Step 3: Rodar TODOS os testes da solution**

Run: `dotnet test`
Expected: PASS — Application.Tests (engine + safety-net + RefreshToken) e Api.Tests completos, 0 falhas.

- [ ] **Step 4: Smoke manual contra o banco real**

Run: `timeout 30 dotnet run --project src/PokerHub.Api --no-build & sleep 15 && curl -s http://localhost:5100/health && curl -s -o /dev/null -w "%{http_code}" http://localhost:5100/api/leagues`
Expected: `Healthy` e `401` (sem token). Encerrar o processo depois.

- [ ] **Step 5: Commit + atualizar tracker no vault**

```bash
git add src/PokerHub.Api tests/PokerHub.Api.Tests
git commit -m "feat: add OpenAPI document, configurable CORS and health/docs smoke tests"
```

Atualizar `~/Documents/Obsidian/1 - Projetos/Migracao PokerHub React/03-roadmap-fases.md`: marcar os itens da Fase 0 concluídos (1, 2, 4 e 5 — o item 3 "mover hub/timer" está explicitamente adiado para a Onda 4 conforme a nota da própria Fase 0).

---

## Fora de escopo desta fase (não implementar)

- Mover `TorneioHub`/`TournamentTimerService` para o Api (fica para a Onda 4 — ver nota na Fase 0 do roadmap).
- Endpoints de Tournaments/Payments/etc. (nascem junto com as telas que os consomem).
- Deploy/Bicep/CI do Api.
- Qualquer mudança no PokerHub.Web.
