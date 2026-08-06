using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using PokerHub.Domain.Enums;

namespace PokerHub.Api.Tests;

/// <summary>
/// Regressão do bug "delegado sem permissão": a UI libera operar o torneio para
/// delegados (canOperateTournament), mas vários endpoints exigiam organizador.
/// Estes testes cobrem o contrato unificado: delegado com DelegatePermissions.All
/// consegue start/finish/add-player; membro comum continua 403; e delegado que nem
/// é membro da liga consegue ler liga/torneio (CanUserAccessLeagueAsync).
/// </summary>
public class DelegatePermissionsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public DelegatePermissionsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record TournamentResponse(Guid Id, Guid LeagueId, string Name, TournamentStatus Status, string InviteCode);
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

    private static object DefaultTournamentPayload(string name) => new
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
            new { Level = 1, SmallBlind = 25, BigBlind = 50, Ante = 0, DurationMinutes = 15, IsBreak = false },
        },
    };

    /// <summary>Cria liga + torneio com 2 jogadores em check-in, retorna clientes e ids.</summary>
    private async Task<(HttpClient organizer, HttpClient delegateClient, string delegateUserId,
        LeagueResponse league, TournamentResponse tournament, List<Guid> playerIds)>
        SetupTournamentWithDelegateAsync(string slug, bool delegateJoinsLeague = true)
    {
        var (organizer, _) = await RegisteredClientAsync($"{slug}-org@test.com");
        var league = await CreateLeagueAsync(organizer, $"Liga {slug}");

        var (delegateClient, delegateAuth) = await RegisteredClientAsync($"{slug}-delegate@test.com");
        if (delegateJoinsLeague)
        {
            var joinResp = await delegateClient.PostAsync($"/api/leagues/join/{league.InviteCode}", null);
            Assert.Equal(HttpStatusCode.OK, joinResp.StatusCode);
        }

        var createResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/tournaments", DefaultTournamentPayload($"Torneio {slug}"));
        var tournament = (await createResp.Content.ReadFromJsonAsync<TournamentResponse>())!;

        var playerIds = new List<Guid>();
        foreach (var name in new[] { $"P1 {slug}", $"P2 {slug}" })
        {
            var pResp = await organizer.PostAsJsonAsync(
                $"/api/leagues/{league.Id}/players-list",
                new { Name = name, Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (int?)null });
            Assert.Equal(HttpStatusCode.Created, pResp.StatusCode);
            var player = (await pResp.Content.ReadFromJsonAsync<PlayerResponse>())!;
            playerIds.Add(player.Id);

            Assert.Equal(HttpStatusCode.OK,
                (await organizer.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/players", new { PlayerId = player.Id })).StatusCode);
            Assert.Equal(HttpStatusCode.OK,
                (await organizer.PostAsync($"/api/tournaments/{tournament.Id}/players/{player.Id}/checkin", null)).StatusCode);
        }

        // Organizer nomeia o delegado com permissão total
        var addDelegateResp = await organizer.PostAsJsonAsync(
            $"/api/tournaments/{tournament.Id}/delegates",
            new { UserId = delegateAuth.UserId, Permissions = 15 });
        Assert.Equal(HttpStatusCode.OK, addDelegateResp.StatusCode);

        return (organizer, delegateClient, delegateAuth.UserId, league, tournament, playerIds);
    }

    [Fact]
    public async Task Delegate_CanStartAndFinishTournament()
    {
        var (_, delegateClient, _, _, tournament, playerIds) =
            await SetupTournamentWithDelegateAsync("del-finish");

        var startResp = await delegateClient.PostAsync($"/api/tournaments/{tournament.Id}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResp.StatusCode);

        var finishResp = await delegateClient.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/finish",
            new { Positions = new[]
            {
                new { PlayerId = playerIds[0], Position = 1 },
                new { PlayerId = playerIds[1], Position = 2 },
            } });
        Assert.Equal(HttpStatusCode.OK, finishResp.StatusCode);

        // Fluxo completo da noite: quem finaliza também gera e gerencia o acerto.
        Assert.Equal(HttpStatusCode.OK,
            (await delegateClient.PostAsync($"/api/tournaments/{tournament.Id}/payments/calculate", null)).StatusCode);

        var paymentsResp = await delegateClient.GetAsync($"/api/tournaments/{tournament.Id}/payments");
        var paymentsJson = await paymentsResp.Content.ReadAsStringAsync();
        var firstId = System.Text.Json.JsonDocument.Parse(paymentsJson)
            .RootElement.EnumerateArray().First().GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.OK,
            (await delegateClient.PostAsync($"/api/payments/{firstId}/admin-confirm", null)).StatusCode);
    }

    [Fact]
    public async Task Delegate_CanAddAndRemovePlayer()
    {
        var (organizer, delegateClient, _, league, tournament, _) =
            await SetupTournamentWithDelegateAsync("del-addplayer");

        var pResp = await organizer.PostAsJsonAsync(
            $"/api/leagues/{league.Id}/players-list",
            new { Name = "P3 extra", Nickname = (string?)null, Email = (string?)null, Phone = (string?)null, PixKey = (string?)null, PixKeyType = (int?)null });
        var player = (await pResp.Content.ReadFromJsonAsync<PlayerResponse>())!;

        var addResp = await delegateClient.PostAsJsonAsync(
            $"/api/tournaments/{tournament.Id}/players", new { PlayerId = player.Id });
        Assert.Equal(HttpStatusCode.OK, addResp.StatusCode);

        var removeResp = await delegateClient.DeleteAsync(
            $"/api/tournaments/{tournament.Id}/players/{player.Id}");
        Assert.Equal(HttpStatusCode.OK, removeResp.StatusCode);
    }

    [Fact]
    public async Task Delegate_CanEliminateAndRestorePlayer()
    {
        var (_, delegateClient, _, _, tournament, playerIds) =
            await SetupTournamentWithDelegateAsync("del-eliminate");

        Assert.Equal(HttpStatusCode.OK,
            (await delegateClient.PostAsync($"/api/tournaments/{tournament.Id}/start", null)).StatusCode);

        var elimResp = await delegateClient.PostAsJsonAsync(
            $"/api/tournaments/{tournament.Id}/players/{playerIds[1]}/eliminate",
            new { EliminatedByPlayerId = (Guid?)playerIds[0], Position = (int?)2 });
        Assert.Equal(HttpStatusCode.OK, elimResp.StatusCode);

        var restoreResp = await delegateClient.PostAsync(
            $"/api/tournaments/{tournament.Id}/players/{playerIds[1]}/restore", null);
        Assert.Equal(HttpStatusCode.OK, restoreResp.StatusCode);
    }

    [Fact]
    public async Task NonDelegateMember_CannotStartOrFinish()
    {
        var (_, _, _, league, tournament, playerIds) =
            await SetupTournamentWithDelegateAsync("del-member403");

        var (member, _) = await RegisteredClientAsync("del-member403-member@test.com");
        Assert.Equal(HttpStatusCode.OK,
            (await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null)).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await member.PostAsync($"/api/tournaments/{tournament.Id}/start", null)).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await member.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/finish",
                new { Positions = new[] { new { PlayerId = playerIds[0], Position = 1 } } })).StatusCode);
    }

    [Fact]
    public async Task Delegate_WhoIsNotLeagueMember_CanReadLeagueAndTournament()
    {
        var (_, delegateClient, _, league, tournament, _) =
            await SetupTournamentWithDelegateAsync("del-nonmember", delegateJoinsLeague: false);

        // Antes do fix, CanUserAccessLeagueAsync só reconhecia organizador/jogador vinculado
        Assert.Equal(HttpStatusCode.OK,
            (await delegateClient.GetAsync($"/api/tournaments/{tournament.Id}")).StatusCode);

        // Torneio agendado não tem estado de timer (404 esperado); o que importa é não ser 403.
        Assert.NotEqual(HttpStatusCode.Forbidden,
            (await delegateClient.GetAsync($"/api/tournaments/{tournament.Id}/timer-state")).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await delegateClient.GetAsync($"/api/tournaments/{tournament.Id}/delegates")).StatusCode);
    }

    [Fact]
    public async Task Delegate_CannotManageDelegatesOrCancel()
    {
        var (_, delegateClient, delegateUserId, _, tournament, _) =
            await SetupTournamentWithDelegateAsync("del-restricted");

        // Gerir delegados e cancelar torneio seguem exclusivos do organizador
        Assert.Equal(HttpStatusCode.Forbidden,
            (await delegateClient.PostAsJsonAsync($"/api/tournaments/{tournament.Id}/delegates",
                new { UserId = delegateUserId, Permissions = 15 })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await delegateClient.PostAsync($"/api/tournaments/{tournament.Id}/cancel", null)).StatusCode);
    }

    // ── Desfazer check-in: dono da liga e delegado, mais ninguém ────────────────

    private sealed record DetailPermissions(bool IsOrganizer, bool CanOperate);

    private static async Task<DetailPermissions> ReadDetailPermissionsAsync(HttpClient client, Guid tournamentId)
    {
        var resp = await client.GetAsync($"/api/tournaments/{tournamentId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var root = System.Text.Json.JsonDocument.Parse(await resp.Content.ReadAsStringAsync()).RootElement;
        return new DetailPermissions(
            root.GetProperty("isOrganizer").GetBoolean(),
            root.GetProperty("canOperate").GetBoolean());
    }

    [Fact]
    public async Task Organizer_CanUndoCheckIn_AndDetailSaysSo()
    {
        var (organizer, _, _, _, tournament, playerIds) =
            await SetupTournamentWithDelegateAsync("undo-org");

        var perms = await ReadDetailPermissionsAsync(organizer, tournament.Id);
        Assert.True(perms.IsOrganizer);
        Assert.True(perms.CanOperate);

        Assert.Equal(HttpStatusCode.OK,
            (await organizer.PostAsync($"/api/tournaments/{tournament.Id}/players/{playerIds[0]}/checkout", null)).StatusCode);
    }

    [Fact]
    public async Task Delegate_CanUndoCheckIn_AndDetailSaysSo()
    {
        var (_, delegateClient, _, _, tournament, playerIds) =
            await SetupTournamentWithDelegateAsync("undo-del");

        var perms = await ReadDetailPermissionsAsync(delegateClient, tournament.Id);
        Assert.False(perms.IsOrganizer);
        Assert.True(perms.CanOperate);

        Assert.Equal(HttpStatusCode.OK,
            (await delegateClient.PostAsync($"/api/tournaments/{tournament.Id}/players/{playerIds[0]}/checkout", null)).StatusCode);
    }

    [Fact]
    public async Task LeagueMember_CannotUndoCheckIn_AndDetailSaysSo()
    {
        var (_, _, _, league, tournament, playerIds) =
            await SetupTournamentWithDelegateAsync("undo-member");

        var (member, _) = await RegisteredClientAsync("undo-member-plain@test.com");
        Assert.Equal(HttpStatusCode.OK,
            (await member.PostAsync($"/api/leagues/join/{league.InviteCode}", null)).StatusCode);

        var perms = await ReadDetailPermissionsAsync(member, tournament.Id);
        Assert.False(perms.IsOrganizer);
        Assert.False(perms.CanOperate);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await member.PostAsync($"/api/tournaments/{tournament.Id}/players/{playerIds[0]}/checkout", null)).StatusCode);
    }
}
