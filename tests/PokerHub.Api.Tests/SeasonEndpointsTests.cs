using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class SeasonEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public SeasonEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record SeasonResponse(Guid Id, Guid LeagueId, string Name, DateTime StartDate, DateTime EndDate, bool IsActive);

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

    private static object DefaultSeasonPayload(string name = "Temporada 2026") => new
    {
        Name = name,
        StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc).ToString("o"),
        EndDate = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc).ToString("o")
    };

    // ---- 401 without token ----

    [Fact]
    public async Task GetSeasons_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var leagueId = Guid.NewGuid();
        var resp = await client.GetAsync($"/api/leagues/{leagueId}/seasons");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task CreateSeason_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var leagueId = Guid.NewGuid();
        var resp = await client.PostAsJsonAsync($"/api/leagues/{leagueId}/seasons", DefaultSeasonPayload());
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ---- 403 non-member cannot list seasons ----

    [Fact]
    public async Task GetSeasons_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("season-list-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season List 403");

        var (outsider, _) = await RegisteredClientAsync("season-list-outsider@test.com");
        var resp = await outsider.GetAsync($"/api/leagues/{league.Id}/seasons");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ---- 403 non-organizer cannot create season ----

    [Fact]
    public async Task CreateSeason_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("season-create-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season Create 403");

        var (member, _) = await RegisteredClientAsync("season-create-member@test.com");
        var join = await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
        Assert.Equal(HttpStatusCode.OK, join.StatusCode);

        var resp = await member.PostAsJsonAsync($"/api/leagues/{league.Id}/seasons", DefaultSeasonPayload());
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ---- Happy path: list seasons (empty) ----

    [Fact]
    public async Task GetSeasons_AsMember_ReturnsEmptyList()
    {
        var (organizer, _) = await RegisteredClientAsync("season-empty-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season Empty");

        var list = await organizer.GetFromJsonAsync<List<SeasonResponse>>($"/api/leagues/{league.Id}/seasons");
        Assert.NotNull(list);
        Assert.Empty(list);
    }

    // ---- Happy path: create + list ----

    [Fact]
    public async Task CreateSeason_ThenList_ReturnsIt()
    {
        var (organizer, _) = await RegisteredClientAsync("season-create-list@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season Create");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/seasons", DefaultSeasonPayload("Temporada Criada"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var season = (await create.Content.ReadFromJsonAsync<SeasonResponse>())!;
        Assert.Equal("Temporada Criada", season.Name);
        Assert.Equal(league.Id, season.LeagueId);

        var list = await organizer.GetFromJsonAsync<List<SeasonResponse>>($"/api/leagues/{league.Id}/seasons");
        Assert.Contains(list!, s => s.Id == season.Id);
    }

    // ---- Happy path: get by ID ----

    [Fact]
    public async Task GetSeason_ById_ReturnsIt()
    {
        var (organizer, _) = await RegisteredClientAsync("season-getbyid-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season GetById");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/seasons", DefaultSeasonPayload("Temp GetById"));
        var season = (await create.Content.ReadFromJsonAsync<SeasonResponse>())!;

        var get = await organizer.GetAsync($"/api/seasons/{season.Id}");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var fetched = (await get.Content.ReadFromJsonAsync<SeasonResponse>())!;
        Assert.Equal(season.Id, fetched.Id);
    }

    // ---- Happy path: get active season ----

    [Fact]
    public async Task GetActiveSeason_WithNoActive_ReturnsNotFound()
    {
        var (organizer, _) = await RegisteredClientAsync("season-active-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season Active");

        var resp = await organizer.GetAsync($"/api/leagues/{league.Id}/seasons/active");
        // No active season -> 404
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ---- Happy path: update season ----

    [Fact]
    public async Task UpdateSeason_AsOrganizer_ReturnsUpdated()
    {
        var (organizer, _) = await RegisteredClientAsync("season-update-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season Update");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/seasons", DefaultSeasonPayload("Temp Original"));
        var season = (await create.Content.ReadFromJsonAsync<SeasonResponse>())!;

        var update = await organizer.PutAsJsonAsync($"/api/seasons/{season.Id}", new
        {
            Name = "Temp Atualizada",
            StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc).ToString("o"),
            EndDate = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc).ToString("o"),
            IsActive = false
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = (await update.Content.ReadFromJsonAsync<SeasonResponse>())!;
        Assert.Equal("Temp Atualizada", updated.Name);
    }

    // ---- 404 for unknown season ----

    [Fact]
    public async Task GetSeason_Unknown_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("season-404-org@test.com");
        var resp = await organizer.GetAsync($"/api/seasons/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ---- Happy path: delete season ----

    [Fact]
    public async Task DeleteSeason_AsOrganizer_ReturnsNoContent()
    {
        var (organizer, _) = await RegisteredClientAsync("season-delete-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season Delete");

        var create = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/seasons", DefaultSeasonPayload("Temp Delete"));
        var season = (await create.Content.ReadFromJsonAsync<SeasonResponse>())!;

        var delete = await organizer.DeleteAsync($"/api/seasons/{season.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    // ---- Season summaries ----

    [Fact]
    public async Task GetSeasonSummaries_AsMember_ReturnsList()
    {
        var (organizer, _) = await RegisteredClientAsync("season-summary-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Season Summary");

        await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/seasons", DefaultSeasonPayload("Temp Summary"));

        var summaries = await organizer.GetFromJsonAsync<List<object>>($"/api/leagues/{league.Id}/seasons/summaries");
        Assert.NotNull(summaries);
        Assert.NotEmpty(summaries);
    }
}
