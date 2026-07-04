using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using PokerHub.Domain.Enums;

namespace PokerHub.Api.Tests;

public class TournamentEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public TournamentEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record TournamentResponse(Guid Id, Guid LeagueId, string Name, TournamentStatus Status, string InviteCode);
    private sealed record TournamentDetailResponse(Guid Id, string Name, TournamentStatus Status);
    private sealed record DelegateResponse(Guid Id, Guid TournamentId, string UserId, DelegatePermissions Permissions);

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

    private async Task<LeagueResponse> CreateLeagueAsync(HttpClient client, string name = "Test League")
    {
        var resp = await client.PostAsJsonAsync("/api/leagues",
            new { Name = name, Description = "desc", BlockCheckInWithDebt = false });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<LeagueResponse>())!;
    }

    private static object DefaultTournamentPayload(string name = "Torneio Teste") => new
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
    // GET /api/leagues/{leagueId}/tournaments
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ListTournaments_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/leagues/{Guid.NewGuid()}/tournaments");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task ListTournaments_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("tlist-organizer@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga ListTournaments");

        var (outsider, _) = await RegisteredClientAsync("tlist-outsider@test.com");
        var resp = await outsider.GetAsync($"/api/leagues/{league.Id}/tournaments");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task ListTournaments_AsMember_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("tlist-member@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga ListOk");

        var resp = await organizer.GetAsync($"/api/leagues/{league.Id}/tournaments");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var list = await resp.Content.ReadFromJsonAsync<List<TournamentResponse>>();
        Assert.NotNull(list);
    }

    // -------------------------------------------------------------------------
    // POST /api/leagues/{leagueId}/tournaments
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CreateTournament_AsOrganizer_Returns201()
    {
        var (organizer, _) = await RegisteredClientAsync("tcreate@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Create");

        var resp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Novo Torneio"));

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var t = await resp.Content.ReadFromJsonAsync<TournamentResponse>();
        Assert.Equal("Novo Torneio", t!.Name);
        Assert.Equal(league.Id, t.LeagueId);
        Assert.False(string.IsNullOrEmpty(t.InviteCode));
    }

    [Fact]
    public async Task CreateTournament_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("tcreate-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Create Non-Org");

        var (member, _) = await RegisteredClientAsync("tcreate-member@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);

        var resp = await member.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Torneio Indevido"));

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTournamentDetail_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/tournaments/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetTournamentDetail_NotFound_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("tdetail-404@test.com");
        var resp = await organizer.GetAsync($"/api/tournaments/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetTournamentDetail_AsMember_ReturnsDetail()
    {
        var (organizer, _) = await RegisteredClientAsync("tdetail-ok@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Detail");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Detail Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.GetAsync($"/api/tournaments/{t.Id}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var detail = await resp.Content.ReadFromJsonAsync<TournamentDetailResponse>();
        Assert.Equal(t.Id, detail!.Id);
    }

    [Fact]
    public async Task GetTournamentDetail_AsNonMember_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("tdetail-forbid-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Detail Forbid");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Forbid Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("tdetail-forbid-out@test.com");
        var resp = await outsider.GetAsync($"/api/tournaments/{t.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // PUT /api/tournaments/{id}
    // -------------------------------------------------------------------------

    [Fact]
    public async Task UpdateTournament_AsOrganizer_Returns200()
    {
        var (organizer, _) = await RegisteredClientAsync("tupdate-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Update");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Original Name"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.PutAsJsonAsync(
            $"/api/tournaments/{t.Id}",
            DefaultTournamentPayload("Updated Name"));

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task UpdateTournament_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("tupdate-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Update NonOrg");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Name"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("tupdate-out@test.com");
        var resp = await outsider.PutAsJsonAsync(
            $"/api/tournaments/{t.Id}",
            DefaultTournamentPayload("Hack"));

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/tournaments/{id}
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeleteTournament_AsOrganizer_Returns204()
    {
        var (organizer, _) = await RegisteredClientAsync("tdelete-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Delete");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("To Delete"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.DeleteAsync($"/api/tournaments/{t.Id}");
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    [Fact]
    public async Task DeleteTournament_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("tdelete-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Delete NonOrg");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("No Delete"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("tdelete-out@test.com");
        var resp = await outsider.DeleteAsync($"/api/tournaments/{t.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/tournaments/{id}/duplicate
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DuplicateTournament_AsOrganizer_Returns201()
    {
        var (organizer, _) = await RegisteredClientAsync("tdup-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Dup");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Source Torneio"));
        var source = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.PostAsync($"/api/tournaments/{source.Id}/duplicate", null);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var dup = await resp.Content.ReadFromJsonAsync<TournamentResponse>();
        Assert.NotEqual(source.Id, dup!.Id);
        Assert.Equal(league.Id, dup.LeagueId);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/by-invite/{inviteCode}
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetByInviteCode_ValidCode_Returns200()
    {
        var (organizer, _) = await RegisteredClientAsync("tinvite-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Invite");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Invite Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.GetAsync($"/api/tournaments/by-invite/{t.InviteCode}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var found = await resp.Content.ReadFromJsonAsync<TournamentResponse>();
        Assert.Equal(t.Id, found!.Id);
    }

    [Fact]
    public async Task GetByInviteCode_InvalidCode_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("tinvite-404@test.com");
        var resp = await organizer.GetAsync("/api/tournaments/by-invite/nonexistent-code");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/tournaments/{id}/self-register  /  self-unregister
    // -------------------------------------------------------------------------

    [Fact]
    public async Task SelfRegister_AsMember_Returns200()
    {
        var (organizer, _) = await RegisteredClientAsync("sreg-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga SelfReg");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("SelfReg Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        // Join as member then self-register
        var (member, memberAuth) = await RegisteredClientAsync("sreg-member@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);

        var resp = await member.PostAsync($"/api/tournaments/{t.Id}/self-register", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task SelfUnregister_AfterRegister_Returns200()
    {
        var (organizer, _) = await RegisteredClientAsync("sunreg-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga SelfUnreg");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("SelfUnreg Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (member, _) = await RegisteredClientAsync("sunreg-member@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
        await member.PostAsync($"/api/tournaments/{t.Id}/self-register", null);

        var resp = await member.PostAsync($"/api/tournaments/{t.Id}/self-unregister", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/tournaments/{id}/players  (admin add)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AddPlayer_AsOrganizer_Returns200()
    {
        var (organizer, _) = await RegisteredClientAsync("addplayer-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga AddPlayer");

        // Create a player via players endpoint is task B3; use league join to get a player
        var (member, _) = await RegisteredClientAsync("addplayer-member@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("AddPlayer Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        // Get players in the league to find the player id
        var leagueDetail = await organizer.GetFromJsonAsync<LeagueWithPlayersHelper>($"/api/leagues/{league.Id}/players");
        var player = leagueDetail!.Players.First();

        var resp = await organizer.PostAsJsonAsync(
            $"/api/tournaments/{t.Id}/players",
            new { PlayerId = player.Id });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task AddPlayer_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("addplayer-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga AddPlayer NonOrg");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("AddPlayer NonOrg Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("addplayer-out@test.com");
        var resp = await outsider.PostAsJsonAsync(
            $"/api/tournaments/{t.Id}/players",
            new { PlayerId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/tournaments/{id}/players/{playerId}
    // -------------------------------------------------------------------------

    [Fact]
    public async Task RemovePlayer_AsOrganizer_Returns200OrNotFound()
    {
        var (organizer, _) = await RegisteredClientAsync("rmplayer-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga RmPlayer");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("RmPlayer Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        // Remove a non-existent player — service returns false → 404
        var resp = await organizer.DeleteAsync($"/api/tournaments/{t.Id}/players/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/tournaments/{id}/players/{playerId}/checkin
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CheckIn_AsOrganizer_Returns200OrNotFound()
    {
        var (organizer, _) = await RegisteredClientAsync("checkin-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga CheckIn");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("CheckIn Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        // No players added yet → false → 404
        var resp = await organizer.PostAsync(
            $"/api/tournaments/{t.Id}/players/{Guid.NewGuid()}/checkin", null);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/tournaments/{id}/start  /  pause  /  resume  /  cancel
    // -------------------------------------------------------------------------

    [Fact]
    public async Task StartTournament_WithBlindsConfigured_Returns200()
    {
        // Service only requires at least one blind level to start (no player count check).
        var (organizer, _) = await RegisteredClientAsync("tstart-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Start");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Start Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.PostAsync($"/api/tournaments/{t.Id}/start", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task StartTournament_AsNonOrganizer_Returns403()
    {
        var (organizer, _) = await RegisteredClientAsync("tstart-owner@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Start NonOrg");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Start NonOrg"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (outsider, _) = await RegisteredClientAsync("tstart-out@test.com");
        var resp = await outsider.PostAsync($"/api/tournaments/{t.Id}/start", null);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task CancelTournament_AsOrganizer_Returns204()
    {
        var (organizer, _) = await RegisteredClientAsync("tcancel-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Cancel");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Cancel Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.PostAsync($"/api/tournaments/{t.Id}/cancel", null);
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // POST /api/tournaments/{id}/regenerate-invite
    // -------------------------------------------------------------------------

    [Fact]
    public async Task RegenerateInvite_AsOrganizer_ReturnsNewCode()
    {
        var (organizer, _) = await RegisteredClientAsync("tregen-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Regen");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Regen Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.PostAsync($"/api/tournaments/{t.Id}/regenerate-invite", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<InviteCodeResponse>();
        Assert.False(string.IsNullOrEmpty(body!.InviteCode));
        Assert.NotEqual(t.InviteCode, body.InviteCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/delegates  /  POST  /  DELETE
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ListDelegates_AsOrganizer_ReturnsOk()
    {
        var (organizer, _) = await RegisteredClientAsync("tdelegate-list@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Delegates");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Delegates Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.GetAsync($"/api/tournaments/{t.Id}/delegates");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var list = await resp.Content.ReadFromJsonAsync<List<DelegateResponse>>();
        Assert.NotNull(list);
    }

    [Fact]
    public async Task AddDelegate_AsOrganizer_Returns200()
    {
        var (organizer, orgAuth) = await RegisteredClientAsync("tdelegate-add@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga AddDelegate");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("AddDelegate Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var (member, memberAuth) = await RegisteredClientAsync("tdelegate-addmember@test.com");
        await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null);

        var resp = await organizer.PostAsJsonAsync(
            $"/api/tournaments/{t.Id}/delegates",
            new { UserId = memberAuth.UserId, Permissions = DelegatePermissions.All });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task RemoveDelegate_AsOrganizer_Returns204OrNotFound()
    {
        var (organizer, _) = await RegisteredClientAsync("tdelegate-rm@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga RmDelegate");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("RmDelegate Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        // Non-existent delegate → false → 404
        var resp = await organizer.DeleteAsync(
            $"/api/tournaments/{t.Id}/delegates/nonexistent-user");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // -------------------------------------------------------------------------
    // GET /api/tournaments/{id}/timer-state
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetTimerState_WithBlinds_Returns200()
    {
        // Service returns a TimerStateDto as long as CurrentLevel matches a BlindLevel.Order.
        // A newly created tournament starts at CurrentLevel=1; our default payload has Order=1.
        var (organizer, _) = await RegisteredClientAsync("ttimer-org@test.com");
        var league = await CreateLeagueAsync(organizer, "Liga Timer");

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments",
            DefaultTournamentPayload("Timer Torneio"));
        var t = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var resp = await organizer.GetAsync($"/api/tournaments/{t.Id}/timer-state");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetTimerState_NonExistentTournament_Returns404()
    {
        var (organizer, _) = await RegisteredClientAsync("ttimer-404@test.com");
        var resp = await organizer.GetAsync($"/api/tournaments/{Guid.NewGuid()}/timer-state");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // helper records for deserialization
    private sealed record InviteCodeResponse(string InviteCode);
    private sealed record LeagueWithPlayersHelper(Guid Id, List<PlayerHelper> Players);
    private sealed record PlayerHelper(Guid Id, string Name);
}
