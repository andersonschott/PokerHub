using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class RankingAndPrizeTableEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public RankingAndPrizeTableEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record PlayerResponse(Guid Id, Guid LeagueId, string Name, string? Nickname);
    private sealed record PrizeTableResponse(Guid Id, Guid LeagueId, string Name, decimal PrizePoolTotal, decimal JackpotAmount);

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

    // =========================================================================
    // Rankings — 401 without token
    // =========================================================================

    [Fact]
    public async Task GetRanking_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/leagues/{Guid.NewGuid()}/rankings");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetPlayerStats_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/players/{Guid.NewGuid()}/ranking-stats");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // =========================================================================
    // Rankings — 403 non-member
    // =========================================================================

    [Fact]
    public async Task GetRanking_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("ranking-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Ranking 403");

        var (outsider, _) = await RegisteredClientAsync("ranking-403-outsider@test.com");
        var resp = await outsider.GetAsync($"/api/leagues/{league.Id}/rankings");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // =========================================================================
    // Rankings — happy path
    // =========================================================================

    [Fact]
    public async Task GetRanking_AsMember_ReturnsListOk()
    {
        var (organizer, _) = await RegisteredClientAsync("ranking-happy-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Ranking Happy");

        var resp = await organizer.GetAsync($"/api/leagues/{league.Id}/rankings");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var list = await resp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(list);
    }

    // =========================================================================
    // Player stats — 404 for unknown player
    // =========================================================================

    [Fact]
    public async Task GetPlayerStats_UnknownPlayer_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("stats-404-org@test.com");
        var resp = await organizer.GetAsync($"/api/players/{Guid.NewGuid()}/ranking-stats");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // =========================================================================
    // Player stats — 403 non-member cannot read stats of player in foreign league
    // =========================================================================

    [Fact]
    public async Task GetPlayerStats_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("stats-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Stats 403");

        // Create a player in that league
        var createPlayer = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Player Stats 403", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Created, createPlayer.StatusCode);
        var player = (await createPlayer.Content.ReadFromJsonAsync<PlayerResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("stats-403-outsider@test.com");
        var resp = await outsider.GetAsync($"/api/players/{player.Id}/ranking-stats");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // =========================================================================
    // PrizeTables — 401 without token
    // =========================================================================

    [Fact]
    public async Task GetPrizeTables_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/leagues/{Guid.NewGuid()}/prize-tables");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task CreatePrizeTable_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync($"/api/leagues/{Guid.NewGuid()}/prize-tables",
            new { Name = "Test", PrizePoolTotal = 100m, JackpotAmount = 10m, Entries = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // =========================================================================
    // PrizeTables — 403 non-member
    // =========================================================================

    [Fact]
    public async Task GetPrizeTables_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-list-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga PT List 403");

        var (outsider, _) = await RegisteredClientAsync("pt-list-403-outsider@test.com");
        var resp = await outsider.GetAsync($"/api/leagues/{league.Id}/prize-tables");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // =========================================================================
    // PrizeTables — 403 non-organizer cannot create
    // =========================================================================

    [Fact]
    public async Task CreatePrizeTable_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-create-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga PT Create 403");

        var (member, _) = await RegisteredClientAsync("pt-create-403-member@test.com");
        var join = await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
        Assert.Equal(HttpStatusCode.OK, join.StatusCode);

        var resp = await member.PostAsJsonAsync($"/api/leagues/{league.Id}/prize-tables",
            new { Name = "Table Hacker", PrizePoolTotal = 100m, JackpotAmount = 0m, Entries = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // =========================================================================
    // PrizeTables — happy path: list empty
    // =========================================================================

    [Fact]
    public async Task GetPrizeTables_AsMember_ReturnsEmptyList()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-empty-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga PT Empty");

        var list = await organizer.GetFromJsonAsync<List<PrizeTableResponse>>($"/api/leagues/{league.Id}/prize-tables");
        Assert.NotNull(list);
        Assert.Empty(list);
    }

    // =========================================================================
    // PrizeTables — happy path: CRUD
    // =========================================================================

    [Fact]
    public async Task CreatePrizeTable_ThenGetById_ReturnsIt()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-create-get-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga PT Create Get");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/prize-tables",
            new
            {
                Name = "Tabela Padrao",
                PrizePoolTotal = 300m,
                JackpotAmount = 30m,
                Entries = new[]
                {
                    new { Position = 1, PrizeAmount = 180m },
                    new { Position = 2, PrizeAmount = 90m },
                    new { Position = 3, PrizeAmount = 30m }
                }
            });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = (await create.Content.ReadFromJsonAsync<PrizeTableResponse>())!;
        Assert.Equal("Tabela Padrao", created.Name);
        Assert.Equal(league.Id, created.LeagueId);

        // Get by ID
        var get = await organizer.GetAsync($"/api/prize-tables/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var fetched = (await get.Content.ReadFromJsonAsync<PrizeTableResponse>())!;
        Assert.Equal(created.Id, fetched.Id);
    }

    [Fact]
    public async Task UpdatePrizeTable_AsOrganizer_ReturnsUpdated()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-update-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga PT Update");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/prize-tables",
            new
            {
                Name = "Original",
                PrizePoolTotal = 200m,
                JackpotAmount = 20m,
                Entries = new[] { new { Position = 1, PrizeAmount = 180m } }
            });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = (await create.Content.ReadFromJsonAsync<PrizeTableResponse>())!;

        var update = await organizer.PutAsJsonAsync($"/api/prize-tables/{created.Id}",
            new
            {
                Name = "Atualizada",
                PrizePoolTotal = 200m,
                JackpotAmount = 20m,
                Entries = new[] { new { Position = 1, PrizeAmount = 180m } }
            });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = (await update.Content.ReadFromJsonAsync<PrizeTableResponse>())!;
        Assert.Equal("Atualizada", updated.Name);
    }

    [Fact]
    public async Task DeletePrizeTable_AsOrganizer_ReturnsNoContent()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-delete-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga PT Delete");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/prize-tables",
            new
            {
                Name = "Para Deletar",
                PrizePoolTotal = 100m,
                JackpotAmount = 0m,
                Entries = new[] { new { Position = 1, PrizeAmount = 100m } }
            });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = (await create.Content.ReadFromJsonAsync<PrizeTableResponse>())!;

        var delete = await organizer.DeleteAsync($"/api/prize-tables/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    // =========================================================================
    // PrizeTables — 404 for unknown
    // =========================================================================

    [Fact]
    public async Task GetPrizeTable_Unknown_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-404-org@test.com");
        var resp = await organizer.GetAsync($"/api/prize-tables/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // =========================================================================
    // PrizeTables — 403 non-member cannot update prize table
    // =========================================================================

    [Fact]
    public async Task UpdatePrizeTable_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("pt-update-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga PT Update 403");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/prize-tables",
            new
            {
                Name = "Tabela Protegida",
                PrizePoolTotal = 100m,
                JackpotAmount = 0m,
                Entries = new[] { new { Position = 1, PrizeAmount = 100m } }
            });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = (await create.Content.ReadFromJsonAsync<PrizeTableResponse>())!;

        // Member joins but is NOT organizer
        var (member, _) = await RegisteredClientAsync("pt-update-403-member@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);

        var update = await member.PutAsJsonAsync($"/api/prize-tables/{created.Id}",
            new
            {
                Name = "Hackeada",
                PrizePoolTotal = 100m,
                JackpotAmount = 0m,
                Entries = new[] { new { Position = 1, PrizeAmount = 100m } }
            });
        Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
    }
}
