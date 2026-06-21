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

        // GET público (landing de convite): dados básicos da liga por código, sem auth.
        // Só campos públicos — não expõe inviteCode, financeiro nem organizerId.
        app.MapGet("/api/leagues/by-invite/{inviteCode}", async (string inviteCode, ILeagueService leagues) =>
        {
            var league = await leagues.GetLeagueByInviteCodeAsync(inviteCode);
            if (league is null) return Results.NotFound();
            return Results.Ok(new
            {
                league.Id,
                league.Name,
                league.Description,
                league.OrganizerName,
                league.PlayerCount,
                league.TournamentCount,
            });
        })
        .WithTags("Leagues")
        .AllowAnonymous();

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
