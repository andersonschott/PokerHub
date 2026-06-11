using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using PokerHub.Domain.Enums;

namespace PokerHub.Api.Tests;

public class PaymentEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public PaymentEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record TournamentResponse(Guid Id, Guid LeagueId, string Name, TournamentStatus Status, string InviteCode);
    private sealed record PaymentDto(Guid Id, Guid TournamentId, decimal Amount, string Status);
    private sealed record PendingDebtDto(Guid PaymentId, decimal Amount);
    private sealed record PlayerBalanceDto(Guid PlayerId, string PlayerName, decimal Balance);
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

    private static object DefaultTournamentPayload(string name = "Torneio Pay") => new
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

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments — 401 without token
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTournamentPayments_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/tournaments/{Guid.NewGuid()}/payments");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments — non-member gets 403
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTournamentPayments_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("pay-list-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Pay List");
        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments", DefaultTournamentPayload("Pay List"));
        var tournament = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("pay-list-out@test.com");
        var resp = await outsider.GetAsync($"/api/tournaments/{tournament.Id}/payments");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments — happy path returns list
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTournamentPayments_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("pay-list-ok@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Pay List OK");
        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments", DefaultTournamentPayload("Pay OK"));
        var tournament = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.GetAsync($"/api/tournaments/{tournament.Id}/payments");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var list = await resp.Content.ReadFromJsonAsync<List<PaymentDto>>();
        Assert.NotNull(list);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments — 404 for unknown tournament
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTournamentPayments_NotFound_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("pay-list-404@test.com");
        var resp = await organizer.GetAsync($"/api/tournaments/{Guid.NewGuid()}/payments");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/tournaments/{id}/payments/calculate — non-organizer gets 403
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CalculatePayments_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("pay-calc-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Pay Calc");
        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments", DefaultTournamentPayload("Pay Calc"));
        var tournament = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (member, _) = await RegisteredClientAsync("pay-calc-member@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);

        var resp = await member.PostAsync($"/api/tournaments/{tournament.Id}/payments/calculate", null);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments/balances — happy path
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTournamentBalances_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("pay-bal-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Pay Balances");
        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments", DefaultTournamentPayload("Pay Balances"));
        var tournament = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.GetAsync($"/api/tournaments/{tournament.Id}/payments/balances");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var list = await resp.Content.ReadFromJsonAsync<List<PlayerBalanceDto>>();
        Assert.NotNull(list);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments/balances — non-member gets 403
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTournamentBalances_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("pay-bal-forbid@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Pay Balances Forbid");
        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments", DefaultTournamentPayload("Pay Balances Forbid"));
        var tournament = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("pay-bal-out@test.com");
        var resp = await outsider.GetAsync($"/api/tournaments/{tournament.Id}/payments/balances");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/{paymentId}/mark-paid — 404 for unknown payment
    // -------------------------------------------------------------------------

    [Fact]
    public async Task MarkAsPaid_UnknownPayment_Returns404()
    {
        var (client, _) = await RegisteredClientAsync("pay-markpaid-404@test.com");
        var resp = await client.PostAsync($"/api/payments/{Guid.NewGuid()}/mark-paid", null);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/{paymentId}/confirm — 404 for unknown payment
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ConfirmPayment_UnknownPayment_Returns404()
    {
        var (client, _) = await RegisteredClientAsync("pay-confirm-404@test.com");
        var resp = await client.PostAsync($"/api/payments/{Guid.NewGuid()}/confirm", null);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/bulk-confirm — non-organizer of any league gets 400
    // -------------------------------------------------------------------------

    [Fact]
    public async Task BulkConfirm_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/payments/bulk-confirm",
            new { PaymentIds = new[] { Guid.NewGuid() } });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/payments/my-debts — 401 without token
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetMyDebts_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/payments/my-debts");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/payments/my-debts — authenticated user with no player returns 200 empty
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetMyDebts_WithNoPlayer_ReturnsEmptyList()
    {
        // A freshly registered user has no player linked (until they join a league)
        var (client, _) = await RegisteredClientAsync("pay-mydebts-empty@test.com");
        var resp = await client.GetAsync("/api/payments/my-debts");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var list = await resp.Content.ReadFromJsonAsync<List<PendingDebtDto>>();
        Assert.NotNull(list);
        Assert.Empty(list);
    }

    // -------------------------------------------------------------------------
    // GET /api/payments/organizer — 401 without token
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetOrganizerPayments_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/payments/organizer");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/payments/organizer — authenticated user returns 200
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetOrganizerPayments_Authenticated_ReturnsOk()
    {
        var (client, _) = await RegisteredClientAsync("pay-orgpay@test.com");
        var resp = await client.GetAsync("/api/payments/organizer");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var list = await resp.Content.ReadFromJsonAsync<List<PaymentDto>>();
        Assert.NotNull(list);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments/jackpot-contribution — 401 without token
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetJackpotContribution_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/tournaments/{Guid.NewGuid()}/payments/jackpot-contribution");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/payments/jackpot-contribution — member gets amount
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetJackpotContribution_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("pay-jackpot-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Jackpot Contribution");
        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments", DefaultTournamentPayload("Pay Jackpot"));
        var tournament = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.GetAsync($"/api/tournaments/{tournament.Id}/payments/jackpot-contribution");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/{paymentId}/admin-mark-paid — 401 without token
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AdminMarkAsPaid_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsync($"/api/payments/{Guid.NewGuid()}/admin-mark-paid", null);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/{paymentId}/admin-confirm — 401 without token
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AdminConfirmPayment_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsync($"/api/payments/{Guid.NewGuid()}/admin-confirm", null);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // C1-IDOR: GET /api/players/{playerId}/payments — outsider gets 403
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetPlayerPayments_AsOutsider_Returns403()
    {
        // Arrange: organizer creates a league and a player in it
        var (organizer, _) = await RegisteredClientAsync("idor-pay-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga IDOR Pay");

        var createResp = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Jogador IDOR", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var player = (await createResp.Content.ReadFromJsonAsync<PlayerResponse>())!;

        // Act: outsider (no membership in this league) tries to read the player's payments
        var (outsider, _) = await RegisteredClientAsync("idor-pay-out@test.com");
        var resp = await outsider.GetAsync($"/api/players/{player.Id}/payments");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // C1-IDOR: GET /api/players/{playerId}/payments/pending-debts — outsider gets 403
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetPlayerPendingDebts_AsOutsider_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("idor-debts-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga IDOR Debts");

        var createResp = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Jogador IDOR Debts", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var player = (await createResp.Content.ReadFromJsonAsync<PlayerResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("idor-debts-out@test.com");
        var resp = await outsider.GetAsync($"/api/players/{player.Id}/payments/pending-debts");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // C1-IDOR: GET /api/players/{playerId}/payments/pending-to-receive — outsider gets 403
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetPlayerPendingToReceive_AsOutsider_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("idor-recv-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga IDOR Recv");

        var createResp = await organizer.PostAsJsonAsync($"/api/leagues/{league.Id}/players-list",
            new { Name = "Jogador IDOR Recv", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (object?)null });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var player = (await createResp.Content.ReadFromJsonAsync<PlayerResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("idor-recv-out@test.com");
        var resp = await outsider.GetAsync($"/api/players/{player.Id}/payments/pending-to-receive");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // I1: POST /api/payments/bulk-confirm — non-organizer (plain member) gets 403
    // -------------------------------------------------------------------------

    [Fact]
    public async Task BulkConfirm_AsNonOrganizer_Returns403()
    {
        // Arrange: member joins a league (not as organizer) and tries to bulk-confirm
        // arbitrary payment IDs. GetPaymentsForOrganizerAsync returns empty for a
        // non-organizer, so any requested ID falls outside the authorized set → 403.
        var (organizer, _) = await RegisteredClientAsync("bulk-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Bulk Confirm Auth");

        var (member, _) = await RegisteredClientAsync("bulk-member@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);

        var resp = await member.PostAsJsonAsync("/api/payments/bulk-confirm",
            new { PaymentIds = new[] { Guid.NewGuid() } });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
