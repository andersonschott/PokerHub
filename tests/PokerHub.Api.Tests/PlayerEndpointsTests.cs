using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class PlayerEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public PlayerEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record PlayerResponse(Guid Id, Guid LeagueId, string Name, string? Nickname, string? Email, bool IsActive);

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

    // ---- 401 without token ----

    [Fact]
    public async Task GetPlayers_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var leagueId = Guid.NewGuid();
        var resp = await client.GetAsync($"/api/leagues/{leagueId}/players-list");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task CreatePlayer_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var leagueId = Guid.NewGuid();
        var resp = await client.PostAsJsonAsync($"/api/leagues/{leagueId}/players-list",
            new { Name = "Test", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ---- Happy path: list players ----

    [Fact]
    public async Task GetPlayers_AsMember_ReturnsPlayerList()
    {
        var (organizer, _) = await RegisteredClientAsync("player-get-organizer@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Player Get");

        // Create a player
        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Jogador Alpha", Nickname = "Alpha", Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var list = await organizer.GetFromJsonAsync<List<PlayerResponse>>($"/api/leagues/{league.Id}/players-list");
        Assert.NotNull(list);
        Assert.Contains(list, p => p.Name == "Jogador Alpha");
    }

    // ---- 403 non-member cannot list players ----

    [Fact]
    public async Task GetPlayers_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("player-list-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Player List 403");

        var (outsider, _) = await RegisteredClientAsync("player-list-outsider@test.com");
        var resp = await outsider.GetAsync($"/api/leagues/{league.Id}/players-list");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ---- 403 non-organizer cannot create player ----

    [Fact]
    public async Task CreatePlayer_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("player-create-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Player Create 403");

        // Join as member (not organizer)
        var (member, _) = await RegisteredClientAsync("player-create-member@test.com");
        var join = await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
        Assert.Equal(HttpStatusCode.OK, join.StatusCode);

        var resp = await member.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Hacker", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ---- Happy path: create, get by ID, update, delete ----

    [Fact]
    public async Task CreateUpdateDelete_Player_HappyPath()
    {
        var (organizer, _) = await RegisteredClientAsync("player-crud-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Player CRUD");

        // Create
        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Jogador Beta", Nickname = "Beta", Email = "beta@test.com", Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = (await create.Content.ReadFromJsonAsync<PlayerResponse>())!;
        Assert.Equal("Jogador Beta", created.Name);

        // Get by ID
        var get = await organizer.GetAsync($"/api/players/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var fetched = (await get.Content.ReadFromJsonAsync<PlayerResponse>())!;
        Assert.Equal(created.Id, fetched.Id);

        // Update
        var update = await organizer.PutAsJsonAsync($"/api/players/{created.Id}",
            new { Name = "Jogador Beta Atualizado", Nickname = "BetaUp", Email = "betaup@test.com", Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = (await update.Content.ReadFromJsonAsync<PlayerResponse>())!;
        Assert.Equal("Jogador Beta Atualizado", updated.Name);

        // Delete (soft)
        var delete = await organizer.DeleteAsync($"/api/players/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    // ---- 404 for unknown player ----

    [Fact]
    public async Task GetPlayer_Unknown_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("player-404-org@test.com");
        var resp = await organizer.GetAsync($"/api/players/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ---- Link player to user ----

    [Fact]
    public async Task LinkPlayer_AsOrganizer_ReturnsNoContent()
    {
        var (organizer, orgAuth) = await RegisteredClientAsync("player-link-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Player Link");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Jogador Link", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var player = (await create.Content.ReadFromJsonAsync<PlayerResponse>())!;

        // Link to a user (using organizer's own userId for simplicity)
        var resp = await organizer.PostAsJsonAsync($"/api/players/{player.Id}/link-user",
            new { UserId = orgAuth.UserId });
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }
}
