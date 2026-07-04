# Feature A — Perfil Real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a tela de Perfil real — stats de temporada vindos da API, PIX/WhatsApp persistidos no cadastro do jogador, e troca de senha funcional.

**Architecture:** Backend .NET 10 (PokerHub.Api minimal APIs): novo grupo autenticado `/api/me/contact` (GET/PUT) que escreve PIX/telefone em **todos** os `Player` do usuário, e `POST /api/auth/change-password` autenticado. Frontend React (`web/`): resolver puro de stats lido do ranking da temporada ativa, hooks TanStack Query novos (`use-me.ts`), e fiação na `perfil/index.tsx` (stats reais + write-through de contato + sheet de senha).

**Tech Stack:** .NET 10 minimal APIs, EF Core, ASP.NET Identity (`UserManager`), xUnit + Testcontainers (SQL Server) para testes de endpoint; React 19, TanStack Query, Vitest.

## Global Constraints

- Backend: endpoints autenticados usam `ClaimsPrincipal.GetUserId()` (claim `sub`) de `PokerHub.Api.Common.ClaimsPrincipalExtensions`.
- Backend: registrar endpoints em `src/PokerHub.Api/Program.cs` no padrão `XxxEndpoints.Map(app)` (após `app.UseAuthorization()`).
- Senha nova deve satisfazer a política do Identity (mín. 6, requer maiúscula, minúscula, dígito e caractere especial). Senha de teste válida: `Senha123!`.
- Mensagens de erro de auth devem ser opacas (mesmo padrão de `AuthEndpoints.Map` no `register`).
- Frontend: `api<T>(path, opts)` já prefixa `/api` — chamar `api('/me/contact', ...)`, não `/api/me/contact`.
- Frontend: nunca exibir número mock; ausência de dado → `—`.
- Testes de endpoint herdam `IClassFixture<ApiFactory>` e autenticam via Bearer (helper `RegisteredClientAsync`). Exigem Docker (Testcontainers).

---

### Task 1: Backend — `POST /api/auth/change-password`

**Files:**
- Modify: `src/PokerHub.Api/Auth/AuthModels.cs` (adicionar record de request)
- Modify: `src/PokerHub.Api/Auth/AuthEndpoints.cs` (adicionar endpoint autenticado)
- Test: `tests/PokerHub.Api.Tests/ChangePasswordEndpointTests.cs` (novo)

**Interfaces:**
- Consumes: `UserManager<User>` (já registrado), `ClaimsPrincipalExtensions.GetUserId()`.
- Produces: `POST /api/auth/change-password` body `{ currentPassword, newPassword }` → `204` em sucesso, `400` em senha atual errada/política violada, `401` sem token.

- [ ] **Step 1: Write the failing test**

Criar `tests/PokerHub.Api.Tests/ChangePasswordEndpointTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class ChangePasswordEndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ChangePasswordEndpointTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);

    private async Task<(HttpClient client, string email)> RegisteredClientAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var auth = (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return (client, email);
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrent_Returns204_AndNewPasswordWorks()
    {
        var (client, email) = await RegisteredClientAsync("changepw-ok@test.com");

        var change = await client.PostAsJsonAsync("/api/auth/change-password",
            new { CurrentPassword = "Senha123!", NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        var anon = _factory.CreateClient();
        var oldLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Returns400()
    {
        var (client, _) = await RegisteredClientAsync("changepw-wrong@test.com");
        var change = await client.PostAsJsonAsync("/api/auth/change-password",
            new { CurrentPassword = "ErradaXYZ!", NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.BadRequest, change.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithoutToken_Returns401()
    {
        var anon = _factory.CreateClient();
        var change = await anon.PostAsJsonAsync("/api/auth/change-password",
            new { CurrentPassword = "Senha123!", NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.Unauthorized, change.StatusCode);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~ChangePasswordEndpointTests"`
Expected: FAIL — endpoint não existe ainda (404 → asserts falham). (Requer Docker rodando.)

- [ ] **Step 3: Add the request record**

Em `src/PokerHub.Api/Auth/AuthModels.cs`, adicionar:

```csharp
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
```

- [ ] **Step 4: Add the endpoint**

Em `src/PokerHub.Api/Auth/AuthEndpoints.cs`, adicionar os usings no topo:

```csharp
using System.Security.Claims;
using PokerHub.Api.Common;
```

E, dentro de `Map(WebApplication app)`, **após** o bloco `group.MapPost("/logout", ...)` e antes do fechamento do método, adicionar (mapeado direto em `app` porque `group` é `AllowAnonymous`):

```csharp
        app.MapPost("/api/auth/change-password", async (
            ChangePasswordRequest req,
            ClaimsPrincipal principal,
            UserManager<User> userManager) =>
        {
            if (string.IsNullOrWhiteSpace(req.CurrentPassword) || string.IsNullOrWhiteSpace(req.NewPassword))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["changePassword"] = ["Senha atual e nova senha são obrigatórias."]
                });
            }

            var user = await userManager.FindByIdAsync(principal.GetUserId());
            if (user is null) return Results.Unauthorized();

            var result = await userManager.ChangePasswordAsync(user, req.CurrentPassword, req.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors
                    .Select(e => e.Code switch
                    {
                        "PasswordMismatch" => "Senha atual incorreta.",
                        "PasswordTooShort" => "Senha muito curta.",
                        "PasswordRequiresNonAlphanumeric" => "Senha deve conter ao menos um caractere especial.",
                        "PasswordRequiresDigit" => "Senha deve conter ao menos um número.",
                        "PasswordRequiresLower" => "Senha deve conter ao menos uma letra minúscula.",
                        "PasswordRequiresUpper" => "Senha deve conter ao menos uma letra maiúscula.",
                        "PasswordRequiresUniqueChars" => "Senha deve conter mais caracteres distintos.",
                        _ => "Requisição inválida."
                    })
                    .ToArray();

                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["changePassword"] = errors
                });
            }

            return Results.NoContent();
        })
        .WithTags("Auth")
        .RequireAuthorization();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~ChangePasswordEndpointTests"`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/PokerHub.Api/Auth/AuthModels.cs src/PokerHub.Api/Auth/AuthEndpoints.cs tests/PokerHub.Api.Tests/ChangePasswordEndpointTests.cs
git commit -m "feat(api): endpoint autenticado POST /api/auth/change-password"
```

---

### Task 2: Backend — `/api/me/contact` (GET/PUT) + serviço

**Files:**
- Create: `src/PokerHub.Application/DTOs/Me/MyContactDtos.cs`
- Modify: `src/PokerHub.Application/Interfaces/IPlayerService.cs` (1 método novo)
- Modify: `src/PokerHub.Application/Services/PlayerService.cs` (implementação)
- Create: `src/PokerHub.Api/Me/MeEndpoints.cs`
- Modify: `src/PokerHub.Api/Program.cs` (registrar `MeEndpoints.Map(app)`)
- Test: `tests/PokerHub.Api.Tests/MeEndpointsTests.cs` (novo)

**Interfaces:**
- Consumes: `IPlayerService.GetPlayerByUserIdAsync(string)` (existente), `ClaimsPrincipalExtensions.GetUserId()`.
- Produces:
  - `IPlayerService.UpdateContactForUserAsync(string userId, UpdateMyContactDto dto) → Task<int>` (nº de players atualizados).
  - `MyContactDto(string? PixKey, PixKeyType? PixKeyType, string? Phone)`, `UpdateMyContactDto(string? PixKey, PixKeyType? PixKeyType, string? Phone)`.
  - `GET /api/me/contact` → `MyContactDto`; `PUT /api/me/contact` (body `UpdateMyContactDto`) → `MyContactDto`.

- [ ] **Step 1: Write the failing test**

Criar `tests/PokerHub.Api.Tests/MeEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class MeEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public MeEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record ContactResponse(string? PixKey, int? PixKeyType, string? Phone);
    private sealed record PlayerResponse(Guid Id, Guid LeagueId, string Name, string? Phone, string? PixKey);

    private async Task<(HttpClient client, AuthResponse auth)> RegisteredClientAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var auth = (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return (client, auth);
    }

    private async Task<LeagueResponse> CreateLeagueAsync(HttpClient client, string name)
    {
        var resp = await client.PostAsJsonAsync("/api/leagues",
            new { Name = name, Description = "desc", BlockCheckInWithDebt = false });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<LeagueResponse>())!;
    }

    [Fact]
    public async Task GetContact_WithoutToken_Returns401()
    {
        var anon = _factory.CreateClient();
        var resp = await anon.GetAsync("/api/me/contact");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task PutContact_ThenGet_RoundTrips()
    {
        var (client, _) = await RegisteredClientAsync("me-contact-roundtrip@test.com");

        var put = await client.PutAsJsonAsync("/api/me/contact",
            new { PixKey = "me@pix.com", PixKeyType = (int?)1, Phone = "11999998888" });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var get = await client.GetFromJsonAsync<ContactResponse>("/api/me/contact");
        Assert.NotNull(get);
        Assert.Equal("me@pix.com", get!.PixKey);
        Assert.Equal("11999998888", get.Phone);
    }

    [Fact]
    public async Task PutContact_AppliesToAllLeaguesOfUser()
    {
        // Organizadores criam duas ligas; o membro entra nas duas (2 Players vinculados ao userId).
        var (orgA, _) = await RegisteredClientAsync("me-orgA@test.com");
        var leagueA = await CreateLeagueAsync(orgA, "Liga A");
        var (orgB, _) = await RegisteredClientAsync("me-orgB@test.com");
        var leagueB = await CreateLeagueAsync(orgB, "Liga B");

        var (member, _) = await RegisteredClientAsync("me-member@test.com");
        Assert.Equal(HttpStatusCode.OK, (await member.PostAsync($"/api/leagues/join/{leagueA.InviteCode}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await member.PostAsync($"/api/leagues/join/{leagueB.InviteCode}", null)).StatusCode);

        var put = await member.PutAsJsonAsync("/api/me/contact",
            new { PixKey = "multi@pix.com", PixKeyType = (int?)null, Phone = "21988887777" });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        // Cada organizador lista os jogadores da sua liga e vê o contato do membro atualizado.
        var playersA = await orgA.GetFromJsonAsync<List<PlayerResponse>>($"/api/leagues/{leagueA.Id}/players-list");
        var playersB = await orgB.GetFromJsonAsync<List<PlayerResponse>>($"/api/leagues/{leagueB.Id}/players-list");
        Assert.Contains(playersA!, p => p.PixKey == "multi@pix.com" && p.Phone == "21988887777");
        Assert.Contains(playersB!, p => p.PixKey == "multi@pix.com" && p.Phone == "21988887777");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~MeEndpointsTests"`
Expected: FAIL — `/api/me/contact` não existe (401/404).

- [ ] **Step 3: Create the DTOs**

Criar `src/PokerHub.Application/DTOs/Me/MyContactDtos.cs`:

```csharp
using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Me;

public record MyContactDto(string? PixKey, PixKeyType? PixKeyType, string? Phone);

public record UpdateMyContactDto(string? PixKey, PixKeyType? PixKeyType, string? Phone);
```

- [ ] **Step 4: Add the service method (interface + impl)**

Em `src/PokerHub.Application/Interfaces/IPlayerService.cs`, adicionar o using e o método:

```csharp
using PokerHub.Application.DTOs.Me;
```
```csharp
    /// <summary>
    /// Atualiza PIX/telefone em TODOS os players ativos vinculados ao usuário.
    /// Retorna o número de players atualizados (0 se o usuário não tem player).
    /// </summary>
    Task<int> UpdateContactForUserAsync(string userId, UpdateMyContactDto dto);
```

Em `src/PokerHub.Application/Services/PlayerService.cs`, adicionar o using `using PokerHub.Application.DTOs.Me;` no topo e o método (perto de `UpdatePlayerAsync`):

```csharp
    public async Task<int> UpdateContactForUserAsync(string userId, UpdateMyContactDto dto)
    {
        var players = await _context.Players
            .Where(p => p.UserId == userId && p.IsActive)
            .ToListAsync();

        foreach (var player in players)
        {
            player.PixKey = dto.PixKey;
            player.PixKeyType = dto.PixKeyType;
            player.Phone = dto.Phone;
        }

        await _context.SaveChangesAsync();
        return players.Count;
    }
```

- [ ] **Step 5: Create the endpoints**

Criar `src/PokerHub.Api/Me/MeEndpoints.cs`:

```csharp
using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.Me;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Me;

public static class MeEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/me").WithTags("Me").RequireAuthorization();

        group.MapGet("/contact", async (ClaimsPrincipal user, IPlayerService players) =>
        {
            var player = await players.GetPlayerByUserIdAsync(user.GetUserId());
            var contact = player is null
                ? new MyContactDto(null, null, null)
                : new MyContactDto(player.PixKey, player.PixKeyType, player.Phone);
            return Results.Ok(contact);
        });

        group.MapPut("/contact", async (UpdateMyContactDto dto, ClaimsPrincipal user, IPlayerService players) =>
        {
            await players.UpdateContactForUserAsync(user.GetUserId(), dto);
            return Results.Ok(new MyContactDto(dto.PixKey, dto.PixKeyType, dto.Phone));
        });
    }
}
```

- [ ] **Step 6: Register in Program.cs**

Em `src/PokerHub.Api/Program.cs`, adicionar o using `using PokerHub.Api.Me;` (junto aos outros `using PokerHub.Api.*`) e a chamada `MeEndpoints.Map(app);` na lista de `Map` (ex.: logo após `PlayerEndpoints.Map(app);`).

- [ ] **Step 7: Run test to verify it passes**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~MeEndpointsTests"`
Expected: PASS (3 testes).

- [ ] **Step 8: Commit**

```bash
git add src/PokerHub.Application/DTOs/Me/ src/PokerHub.Application/Interfaces/IPlayerService.cs src/PokerHub.Application/Services/PlayerService.cs src/PokerHub.Api/Me/ src/PokerHub.Api/Program.cs tests/PokerHub.Api.Tests/MeEndpointsTests.cs
git commit -m "feat(api): GET/PUT /api/me/contact persiste PIX/telefone em todas as ligas do usuario"
```

---

### Task 3: Frontend — resolver puro de stats do perfil

**Files:**
- Create: `web/src/features/profile/profile-stats.ts`
- Test: `web/src/features/profile/profile-stats.test.ts`

**Interfaces:**
- Consumes: `PlayerDto` (de `@/lib/api/hooks/use-leagues`), `PlayerRankingDto` (de `@/lib/api/hooks/use-rankings`).
- Produces: `resolveProfileStats(players, ranking, userId) → { profit: number | null, itmRate: number | null }`.

- [ ] **Step 1: Write the failing test**

Criar `web/src/features/profile/profile-stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveProfileStats } from './profile-stats';
import type { PlayerDto } from '@/lib/api/hooks/use-leagues';
import type { PlayerRankingDto } from '@/lib/api/hooks/use-rankings';

const player = (over: Partial<PlayerDto>): PlayerDto =>
  ({ id: 'p1', leagueId: 'l1', name: 'Eu', nickname: null, email: null, phone: null,
     pixKey: null, pixKeyType: null, userId: 'u1', createdAt: '', isActive: true,
     membershipStatus: 0, totalProfit: 0, tournamentsPlayed: 0, wins: 0, secondPlaces: 0,
     thirdPlaces: 0, totalBuyIns: 0, totalPrizes: 0, itmCount: 0, roi: 0, itmRate: 0,
     ...over }) as PlayerDto;

const rank = (over: Partial<PlayerRankingDto>): PlayerRankingDto =>
  ({ position: 1, playerId: 'p1', playerName: 'Eu', nickname: null, tournamentsPlayed: 0,
     wins: 0, secondPlaces: 0, thirdPlaces: 0, top3Finishes: 0, totalBuyIns: 0,
     totalPrizes: 0, profit: 0, roi: 0, itmRate: 0, totalSeasonTournaments: 0,
     participationPercentage: 0, ...over }) as PlayerRankingDto;

describe('resolveProfileStats', () => {
  it('retorna nulls quando faltam players, ranking ou userId', () => {
    expect(resolveProfileStats(undefined, [], 'u1')).toEqual({ profit: null, itmRate: null });
    expect(resolveProfileStats([], undefined, 'u1')).toEqual({ profit: null, itmRate: null });
    expect(resolveProfileStats([], [], undefined)).toEqual({ profit: null, itmRate: null });
  });

  it('retorna nulls quando o usuário não tem player vinculado', () => {
    const players = [player({ userId: 'outro' })];
    expect(resolveProfileStats(players, [rank({})], 'u1')).toEqual({ profit: null, itmRate: null });
  });

  it('retorna nulls quando não há entry no ranking para o player', () => {
    const players = [player({ id: 'p1', userId: 'u1' })];
    const ranking = [rank({ playerId: 'pX' })];
    expect(resolveProfileStats(players, ranking, 'u1')).toEqual({ profit: null, itmRate: null });
  });

  it('retorna profit e itmRate do entry do player do usuário', () => {
    const players = [player({ id: 'p1', userId: 'u1' })];
    const ranking = [rank({ playerId: 'p1', profit: 1840, itmRate: 62 })];
    expect(resolveProfileStats(players, ranking, 'u1')).toEqual({ profit: 1840, itmRate: 62 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/features/profile/profile-stats.test.ts`
Expected: FAIL — módulo `./profile-stats` não existe.

- [ ] **Step 3: Write the implementation**

Criar `web/src/features/profile/profile-stats.ts`:

```ts
import type { PlayerDto } from '@/lib/api/hooks/use-leagues';
import type { PlayerRankingDto } from '@/lib/api/hooks/use-rankings';

export interface ProfileStats {
  /** Lucro na temporada ativa; null quando indisponível. */
  profit: number | null;
  /** ITM em % (0–100); null quando indisponível. */
  itmRate: number | null;
}

/**
 * Resolve os stats do perfil para o usuário logado a partir do ranking da
 * temporada ativa. Retorna nulls (nunca número falso) quando qualquer dado falta.
 */
export function resolveProfileStats(
  players: PlayerDto[] | undefined,
  ranking: PlayerRankingDto[] | undefined,
  userId: string | undefined,
): ProfileStats {
  if (!players || !ranking || !userId) return { profit: null, itmRate: null };
  const me = players.find((p) => p.userId === userId);
  if (!me) return { profit: null, itmRate: null };
  const entry = ranking.find((r) => r.playerId === me.id);
  if (!entry) return { profit: null, itmRate: null };
  return { profit: entry.profit, itmRate: entry.itmRate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/features/profile/profile-stats.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add web/src/features/profile/profile-stats.ts web/src/features/profile/profile-stats.test.ts
git commit -m "feat(web): resolver puro de stats do perfil (ranking da temporada ativa)"
```

---

### Task 4: Frontend — hooks `use-me.ts` (contato + senha)

**Files:**
- Create: `web/src/lib/api/hooks/use-me.ts`

**Interfaces:**
- Consumes: `api` de `@/lib/api/client`.
- Produces:
  - `MyContactDto { pixKey: string | null; pixKeyType: number | null; phone: string | null }`.
  - `useMyContact()` → query `GET /me/contact`.
  - `useUpdateMyContact()` → mutation `PUT /me/contact` (atualiza o cache da query).
  - `useChangePassword()` → mutation `POST /auth/change-password`.

- [ ] **Step 1: Write the implementation**

Criar `web/src/lib/api/hooks/use-me.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

/** Espelha PokerHub.Application.DTOs.Me.MyContactDto (PixKeyType serializado como int). */
export interface MyContactDto {
  pixKey: string | null;
  pixKeyType: number | null;
  phone: string | null;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const meKeys = {
  contact: ['me', 'contact'] as const,
};

/** GET /api/me/contact — PIX/telefone do usuário logado. */
export function useMyContact() {
  return useQuery({
    queryKey: meKeys.contact,
    queryFn: () => api<MyContactDto>('/me/contact'),
  });
}

/** PUT /api/me/contact — grava PIX/telefone em todas as ligas do usuário. */
export function useUpdateMyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: MyContactDto) =>
      api<MyContactDto>('/me/contact', { method: 'PUT', body: dto }),
    onSuccess: (data) => {
      qc.setQueryData(meKeys.contact, data);
    },
  });
}

/** POST /api/auth/change-password — troca de senha do usuário logado. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) =>
      api<void>('/auth/change-password', { method: 'POST', body: dto }),
  });
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `cd web && npx tsc -b --noEmit`
Expected: sem erros relacionados a `use-me.ts`.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/api/hooks/use-me.ts
git commit -m "feat(web): hooks use-me (contato PIX/telefone + troca de senha)"
```

---

### Task 5: Frontend — stats reais na `perfil/index.tsx`

**Files:**
- Modify: `web/src/routes/app/perfil/index.tsx` (substituir os 2 tiles mock — mobile e desktop)

**Interfaces:**
- Consumes: `resolveProfileStats` (Task 3); `useActiveLeague`, `useActiveSeason`, `useSeasonRanking`, `useLeaguePlayers`, `useAuth`.

- [ ] **Step 1: Add the data wiring**

Em `web/src/routes/app/perfil/index.tsx`, adicionar os imports:

```tsx
import { useActiveSeason } from '@/lib/api/hooks/use-seasons';
import { useSeasonRanking } from '@/lib/api/hooks/use-rankings';
import { useLeaguePlayers } from '@/lib/api/hooks/use-leagues';
import { resolveProfileStats } from '@/features/profile/profile-stats';
```

Dentro de `PerfilRoute`, após a linha `const caixinhaBalance = jackpotBalance(...)`, adicionar:

```tsx
  const { data: activeSeason } = useActiveSeason(activeLeagueId ?? '');
  const { data: seasonRanking } = useSeasonRanking(activeSeason?.id ?? '');
  const { data: leaguePlayers } = useLeaguePlayers(activeLeagueId ?? '');
  const stats = resolveProfileStats(leaguePlayers, seasonRanking, user?.userId);
```

- [ ] **Step 2: Replace the mobile stat tiles**

Substituir o bloco `{/* Stat cards — mock */}` (os dois `<StatTile>` do grid mobile) por:

```tsx
      {/* Stat cards — reais (temporada ativa) */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <StatTile
          icon={TrendingUp}
          value={
            stats.profit === null
              ? '—'
              : <MoneyValue value={stats.profit} signed cents={false} size="19px" />
          }
          label="Lucro na temporada"
          tone={stats.profit !== null && stats.profit >= 0 ? 'positive' : undefined}
          center
          valueSize="19px"
        />
        <StatTile
          icon={Target}
          value={stats.itmRate === null ? '—' : `${Math.round(stats.itmRate)}%`}
          label="ITM"
          center
          valueSize="19px"
        />
      </div>
```

- [ ] **Step 3: Replace the desktop stat tiles**

No bloco desktop (`hidden lg:flex ...`), substituir os dois `<StatTile>` (com `value={<MoneyValue value={1840} .../>}` e `value="62%"`) pelos mesmos valores reais usados no Step 2 (`stats.profit` / `stats.itmRate`, com fallback `—`).

- [ ] **Step 4: Verify build + manual check**

Run: `cd web && npx tsc -b --noEmit && npm run build`
Expected: build OK, sem referências a `1840`/`62%` em `perfil/index.tsx`.
Manual: rodar `npm run dev`, abrir `/app/perfil` numa liga com temporada ativa onde o usuário é jogador → ver Lucro/ITM reais; numa liga sem dados → ver `—`.

- [ ] **Step 5: Commit**

```bash
git add web/src/routes/app/perfil/index.tsx
git commit -m "feat(web): stats reais do perfil (lucro/ITM da temporada ativa) substituindo mock"
```

---

### Task 6: Frontend — persistir PIX/WhatsApp (write-through)

**Files:**
- Modify: `web/src/routes/app/perfil/index.tsx`

**Interfaces:**
- Consumes: `useMyContact`, `useUpdateMyContact` (Task 4). `MyContactDto` shape.

- [ ] **Step 1: Wire the contact source + save**

Em `web/src/routes/app/perfil/index.tsx`, adicionar import:

```tsx
import { useMyContact, useUpdateMyContact, type MyContactDto } from '@/lib/api/hooks/use-me';
```

Dentro de `PerfilRoute`, adicionar:

```tsx
  const { data: myContact } = useMyContact();
  const updateContact = useUpdateMyContact();
```

Após o `useState` de `pix`/`whatsapp`, sincronizar com o backend quando chegar (mantendo localStorage como cache):

```tsx
  useEffect(() => {
    if (!myContact) return;
    if (myContact.pixKey != null) { setPix(myContact.pixKey); saveStorage(STORAGE_PIX, myContact.pixKey); }
    if (myContact.phone != null) { setWhatsapp(myContact.phone); saveStorage(STORAGE_WHATSAPP, myContact.phone); }
  }, [myContact]);
```

(adicionar `useEffect` ao import de `react`.)

- [ ] **Step 2: Make saveSheet write through to the API**

Substituir o corpo de `saveSheet` por uma versão que persiste no backend (PIX/telefone juntos, pois o endpoint grava o contato inteiro):

```tsx
  const saveSheet = () => {
    const nextPix = sheet === 'pix' ? draft.trim() : pix;
    const nextPhone = sheet === 'whatsapp' ? draft : whatsapp;
    const payload: MyContactDto = {
      pixKey: nextPix || null,
      pixKeyType: myContact?.pixKeyType ?? null,
      phone: nextPhone || null,
    };
    updateContact.mutate(payload);
    setPix(nextPix);
    saveStorage(STORAGE_PIX, nextPix);
    setWhatsapp(nextPhone);
    saveStorage(STORAGE_WHATSAPP, nextPhone);
    setSheet(null);
  };
```

Atualizar também os botões "Remover chave" / "Remover número" para chamar `updateContact.mutate` com o respectivo campo zerado (mantendo o outro), além de limpar localStorage como hoje.

- [ ] **Step 3: Verify build + manual check**

Run: `cd web && npx tsc -b --noEmit && npm run build`
Manual: salvar PIX no `/app/perfil`, recarregar (limpa localStorage antes para garantir) → valor volta do backend; conferir via admin de outra liga do mesmo usuário que o PIX aparece igual.

- [ ] **Step 4: Commit**

```bash
git add web/src/routes/app/perfil/index.tsx
git commit -m "feat(web): persistir PIX/WhatsApp do perfil via /api/me/contact (write-through)"
```

---

### Task 7: Frontend — sheet de troca de senha

**Files:**
- Modify: `web/src/routes/app/perfil/index.tsx` (nova linha + sheet)

**Interfaces:**
- Consumes: `useChangePassword` (Task 4); componentes `ProfileRow`, `Sheet`, `Input`, `Button` (já no arquivo).

- [ ] **Step 1: Add state, hook, and the row**

Em `web/src/routes/app/perfil/index.tsx`:
- Importar `useChangePassword` (já vem do mesmo módulo `use-me` — ajustar o import do Step 1 da Task 6 para incluir `useChangePassword`).
- Estender o tipo `SheetKind` para incluir `'senha'`: `type SheetKind = 'pix' | 'whatsapp' | 'senha' | null;`
- Adicionar estado do form de senha e mensagens:

```tsx
  const changePassword = useChangePassword();
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
```

- Adicionar a linha (após a `ProfileRow` de "Minha chave PIX" ou junto às preferências):

```tsx
          <ProfileRow
            icon={<KeyRound />}
            label="Alterar senha"
            onClick={() => { setCurPw(''); setNewPw(''); setConfirmPw(''); setPwError(null); setSheet('senha'); }}
          />
```

(`KeyRound` já está importado de `lucide-react`.)

- [ ] **Step 2: Add the password sheet**

Adicionar, junto aos outros sheets:

```tsx
      {sheet === 'senha' && (
        <Sheet fixed open onClose={() => setSheet(null)} title="Alterar senha" subtitle="Use uma senha forte que você não usa em outro lugar">
          <div className="flex flex-col gap-3.5">
            <Input type="password" placeholder="Senha atual" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoFocus />
            <Input type="password" placeholder="Nova senha" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <Input type="password" placeholder="Confirmar nova senha" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            {pwError ? <p className="text-[12px] text-negative">{pwError}</p> : null}
            <Button
              variant="primary"
              block
              disabled={changePassword.isPending || newPw.length < 6 || curPw.length < 1}
              onClick={() => {
                setPwError(null);
                if (newPw !== confirmPw) { setPwError('A confirmação não confere.'); return; }
                changePassword.mutate(
                  { currentPassword: curPw, newPassword: newPw },
                  {
                    onSuccess: () => setSheet(null),
                    onError: (err) => setPwError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.'),
                  },
                );
              }}
            >
              {changePassword.isPending ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </div>
        </Sheet>
      )}
```

- [ ] **Step 3: Verify build + manual check**

Run: `cd web && npx tsc -b --noEmit && npm run build`
Manual: `/app/perfil` → "Alterar senha": senha atual errada → erro do backend inline; sucesso → fecha; relogar com a nova senha.

- [ ] **Step 4: Commit**

```bash
git add web/src/routes/app/perfil/index.tsx
git commit -m "feat(web): sheet de troca de senha no perfil"
```

---

## Self-Review

**Spec coverage (Feature A do spec 2026-06-22):**
- A.1 stats reais → Tasks 3 (resolver) + 5 (wiring mobile/desktop), com fallback `—`. ✔
- A.2 PIX/WhatsApp persistidos em todas as ligas → Tasks 2 (backend `/api/me/contact` + serviço multi-liga) + 4 (hooks) + 6 (write-through). ✔
- A.3 trocar senha → Tasks 1 (backend) + 4 (hook) + 7 (sheet). ✔
- Fora de escopo (seletor de tipo PIX, avatar, notificações) → não incluído. ✔

**Placeholder scan:** nenhum TBD/TODO; todo passo de código mostra o código. ✔

**Type consistency:** `UpdateContactForUserAsync(string, UpdateMyContactDto)` consistente entre interface, impl e endpoint; `MyContactDto`/`UpdateMyContactDto` com `PixKey/PixKeyType/Phone`; `resolveProfileStats(players, ranking, userId)` idêntico em test/impl/uso; `MyContactDto` TS (`pixKey/pixKeyType/phone`) usado igual em hooks e perfil. ✔

**Notas:**
- Testes de backend exigem Docker (Testcontainers). Se indisponível, validar via `dotnet build` + execução manual da API.
- Serialização de `PixKeyType`: o teste de endpoint envia `PixKeyType` como int e o front trafega `number | null`; a UI atual envia `null` (sem seletor de tipo), então a serialização enum não afeta o fluxo.
