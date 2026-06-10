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
