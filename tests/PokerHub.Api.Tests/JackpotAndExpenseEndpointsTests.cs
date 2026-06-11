using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using PokerHub.Domain.Enums;

namespace PokerHub.Api.Tests;

public class JackpotAndExpenseEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public JackpotAndExpenseEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record TournamentResponse(Guid Id, Guid LeagueId, string Name, TournamentStatus Status, string InviteCode);
    private sealed record PlayerResponse(Guid Id, Guid LeagueId, string Name);
    private sealed record ExpenseResponse(Guid Id, Guid TournamentId, Guid PaidByPlayerId, string Description, decimal TotalAmount);

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

    private async Task<TournamentResponse> CreateTournamentAsync(HttpClient client, Guid leagueId, string name = "Torneio Expense")
    {
        var payload = new
        {
            Name = name,
            ScheduledDateTime = DateTime.UtcNow.AddDays(1).ToString("o"),
            Location = (string?)null,
            BuyIn = 50m,
            StartingStack = 10000,
            RebuyValue = (decimal?)null,
            RebuyStack = (int?)null,
            RebuyLimitLevel = (int?)null,
            RebuyLimitMinutes = (int?)null,
            RebuyLimitType = RebuyLimitType.Level,
            AddonValue = (decimal?)null,
            AddonStack = (int?)null,
            PrizeStructure = (string?)null,
            PrizeDistributionType = PrizeDistributionType.Percentage,
            UsePrizeTable = false,
            PrizeTableId = (Guid?)null,
            AllowCheckInUntilLevel = (int?)null,
            BlindLevels = new[]
            {
                new { Order = 1, SmallBlind = 25, BigBlind = 50, Ante = 0, DurationMinutes = 15, IsBreak = false, BreakDescription = (string?)null }
            }
        };
        var resp = await client.PostAsJsonAsync($"/api/leagues/{leagueId}/tournaments", payload);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<TournamentResponse>())!;
    }

    private async Task<PlayerResponse> CreatePlayerAsync(HttpClient client, Guid leagueId, string name)
    {
        var resp = await client.PostAsJsonAsync($"/api/leagues/{leagueId}/players-list",
            new { Name = name, Nickname = (string?)null, UserId = (string?)null });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<PlayerResponse>())!;
    }

    /// <summary>
    /// Creates a player, adds them to a tournament, and checks them in.
    /// Required because CreateExpenseAsync validates that share players are checked-in participants.
    /// </summary>
    private async Task<PlayerResponse> CreateCheckedInPlayerAsync(HttpClient client, Guid leagueId, Guid tournamentId, string name)
    {
        var player = await CreatePlayerAsync(client, leagueId, name);

        var addResp = await client.PostAsJsonAsync($"/api/tournaments/{tournamentId}/players",
            new { PlayerId = player.Id });
        Assert.Equal(HttpStatusCode.OK, addResp.StatusCode);

        var checkInResp = await client.PostAsync($"/api/tournaments/{tournamentId}/players/{player.Id}/checkin", null);
        Assert.Equal(HttpStatusCode.OK, checkInResp.StatusCode);

        return player;
    }

    // =========================================================================
    // Jackpot — 401 without token
    // =========================================================================

    [Fact]
    public async Task GetJackpot_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/leagues/{Guid.NewGuid()}/jackpot");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetJackpotContributions_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/leagues/{Guid.NewGuid()}/jackpot/contributions");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetJackpotUsages_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/leagues/{Guid.NewGuid()}/jackpot/usages");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // =========================================================================
    // Jackpot — 403 non-member
    // =========================================================================

    [Fact]
    public async Task GetJackpot_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("jackpot-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot 403");

        var (outsider, _) = await RegisteredClientAsync("jackpot-403-out@test.com");
        var resp = await outsider.GetAsync($"/api/leagues/{league.Id}/jackpot");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task UpdateJackpotSettings_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("jackpot-settings-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot Settings");

        // Member joins
        var (member, _) = await RegisteredClientAsync("jackpot-settings-member@test.com");
        var joinResp = await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
        Assert.Equal(HttpStatusCode.OK, joinResp.StatusCode);

        var resp = await member.PutAsJsonAsync($"/api/leagues/{league.Id}/jackpot/settings",
            new { JackpotPercentage = 10m });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task UseJackpot_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("jackpot-use-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot Use");

        var (member, _) = await RegisteredClientAsync("jackpot-use-member@test.com");
        var joinResp = await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
        Assert.Equal(HttpStatusCode.OK, joinResp.StatusCode);

        var resp = await member.PostAsJsonAsync($"/api/leagues/{league.Id}/jackpot/use",
            new { Amount = 50m, Description = "Prize" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // =========================================================================
    // Jackpot — happy path
    // =========================================================================

    [Fact]
    public async Task GetJackpot_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("jackpot-happy-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot Happy");

        var resp = await organizer.GetAsync($"/api/leagues/{league.Id}/jackpot");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var status = await resp.Content.ReadFromJsonAsync<dynamic>();
        Assert.NotNull(status);
    }

    [Fact]
    public async Task GetJackpotContributions_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("jackpot-contrib-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot Contrib");

        var resp = await organizer.GetAsync($"/api/leagues/{league.Id}/jackpot/contributions");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetJackpotUsages_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("jackpot-usages-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot Usages");

        var resp = await organizer.GetAsync($"/api/leagues/{league.Id}/jackpot/usages");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task UpdateJackpotSettings_AsOrganizer_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("jackpot-update-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot Update");

        var resp = await organizer.PutAsJsonAsync($"/api/leagues/{league.Id}/jackpot/settings",
            new { JackpotPercentage = 5m });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // =========================================================================
    // Expenses — 401 without token
    // =========================================================================

    [Fact]
    public async Task GetExpenses_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/tournaments/{Guid.NewGuid()}/expenses");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetExpenseSummary_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/tournaments/{Guid.NewGuid()}/expenses/summary");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetExpenseById_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/expenses/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // =========================================================================
    // Expenses — 403 non-member
    // =========================================================================

    [Fact]
    public async Task GetExpenses_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp 403");
        var tournament = await CreateTournamentAsync(organizer, league.Id);

        var (outsider, _) = await RegisteredClientAsync("exp-403-out@test.com");
        var resp = await outsider.GetAsync($"/api/tournaments/{tournament.Id}/expenses");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task CreateExpense_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-create-403-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp Create 403");
        var tournament = await CreateTournamentAsync(organizer, league.Id);
        // Use a simple player for the payer (403 check happens before service validation)
        var player = await CreatePlayerAsync(organizer, league.Id, "Jogador Payer");

        var (member, _) = await RegisteredClientAsync("exp-create-403-member@test.com");
        var joinResp = await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
        Assert.Equal(HttpStatusCode.OK, joinResp.StatusCode);

        var resp = await member.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/expenses", new
        {
            PaidByPlayerId = player.Id,
            Description = "Beer",
            TotalAmount = 100m,
            SplitType = ExpenseSplitType.Equal,
            Shares = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // =========================================================================
    // Expenses — 404 for unknown tournament
    // =========================================================================

    [Fact]
    public async Task GetExpenses_UnknownTournament_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-404-org@test.com");
        var resp = await organizer.GetAsync($"/api/tournaments/{Guid.NewGuid()}/expenses");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetExpenseById_UnknownExpense_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-byid-404-org@test.com");
        var resp = await organizer.GetAsync($"/api/expenses/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // =========================================================================
    // Expenses — happy path
    // =========================================================================

    [Fact]
    public async Task GetExpenses_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-happy-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp Happy");
        var tournament = await CreateTournamentAsync(organizer, league.Id);

        var resp = await organizer.GetAsync($"/api/tournaments/{tournament.Id}/expenses");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var list = await resp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(list);
    }

    [Fact]
    public async Task GetExpenseSummary_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-summary-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp Summary");
        var tournament = await CreateTournamentAsync(organizer, league.Id);

        var resp = await organizer.GetAsync($"/api/tournaments/{tournament.Id}/expenses/summary");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task CreateExpense_AsOrganizer_ReturnsCreated()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-create-happy-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp Create Happy");
        var tournament = await CreateTournamentAsync(organizer, league.Id);
        // Player must be checked-in for expense share validation
        var player = await CreateCheckedInPlayerAsync(organizer, league.Id, tournament.Id, "Payer Player");

        var resp = await organizer.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/expenses", new
        {
            PaidByPlayerId = player.Id,
            Description = "Drinks",
            TotalAmount = 80m,
            SplitType = ExpenseSplitType.Equal,
            Shares = new[] { new { PlayerId = player.Id, Amount = 80m } }
        });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var created = await resp.Content.ReadFromJsonAsync<ExpenseResponse>();
        Assert.NotNull(created);
        Assert.Equal(tournament.Id, created!.TournamentId);
        Assert.Equal("Drinks", created.Description);
        Assert.Equal(80m, created.TotalAmount);
    }

    [Fact]
    public async Task CreateThenGetExpenseById_ReturnsExpense()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-byid-happy-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp ById Happy");
        var tournament = await CreateTournamentAsync(organizer, league.Id);
        var player = await CreateCheckedInPlayerAsync(organizer, league.Id, tournament.Id, "ById Player");

        var createResp = await organizer.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/expenses", new
        {
            PaidByPlayerId = player.Id,
            Description = "Food",
            TotalAmount = 60m,
            SplitType = ExpenseSplitType.Equal,
            Shares = new[] { new { PlayerId = player.Id, Amount = 60m } }
        });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = (await createResp.Content.ReadFromJsonAsync<ExpenseResponse>())!;

        var getResp = await organizer.GetAsync($"/api/expenses/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var fetched = await getResp.Content.ReadFromJsonAsync<ExpenseResponse>();
        Assert.Equal(created.Id, fetched!.Id);
    }

    [Fact]
    public async Task UpdateExpense_AsOrganizer_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-update-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp Update");
        var tournament = await CreateTournamentAsync(organizer, league.Id);
        var player = await CreateCheckedInPlayerAsync(organizer, league.Id, tournament.Id, "Update Player");

        var createResp = await organizer.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/expenses", new
        {
            PaidByPlayerId = player.Id,
            Description = "Original",
            TotalAmount = 40m,
            SplitType = ExpenseSplitType.Equal,
            Shares = new[] { new { PlayerId = player.Id, Amount = 40m } }
        });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = (await createResp.Content.ReadFromJsonAsync<ExpenseResponse>())!;

        var updateResp = await organizer.PutAsJsonAsync($"/api/expenses/{created.Id}", new
        {
            PaidByPlayerId = player.Id,
            Description = "Updated",
            TotalAmount = 45m,
            SplitType = ExpenseSplitType.Equal,
            Shares = new[] { new { PlayerId = player.Id, Amount = 45m } }
        });
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
    }

    [Fact]
    public async Task DeleteExpense_AsOrganizer_ReturnsNoContent()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-delete-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp Delete");
        var tournament = await CreateTournamentAsync(organizer, league.Id);
        var player = await CreateCheckedInPlayerAsync(organizer, league.Id, tournament.Id, "Delete Player");

        var createResp = await organizer.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/expenses", new
        {
            PaidByPlayerId = player.Id,
            Description = "To Delete",
            TotalAmount = 30m,
            SplitType = ExpenseSplitType.Equal,
            Shares = new[] { new { PlayerId = player.Id, Amount = 30m } }
        });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = (await createResp.Content.ReadFromJsonAsync<ExpenseResponse>())!;

        var deleteResp = await organizer.DeleteAsync($"/api/expenses/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);
    }

    [Fact]
    public async Task GetEligiblePlayers_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-eligible-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp Eligible");
        var tournament = await CreateTournamentAsync(organizer, league.Id);

        var resp = await organizer.GetAsync($"/api/tournaments/{tournament.Id}/expenses/eligible-players");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetLeaguePlayers_ForExpense_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("exp-leagueplayers-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Exp LeaguePlayers");
        var tournament = await CreateTournamentAsync(organizer, league.Id);

        var resp = await organizer.GetAsync($"/api/tournaments/{tournament.Id}/expenses/league-players");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
