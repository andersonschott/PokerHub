using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Rankings;

public static class RankingEndpoints
{
    public static void Map(WebApplication app)
    {
        // -------------------------------------------------------------------------
        // League-scoped ranking routes: /api/leagues/{leagueId}/rankings
        // -------------------------------------------------------------------------
        var leagueGroup = app.MapGroup("/api/leagues/{leagueId:guid}/rankings")
            .WithTags("Rankings")
            .RequireAuthorization();

        // GET /api/leagues/{leagueId}/rankings
        // Returns the full league ranking (all players). The DTO already includes
        // Profit, ROI, ITMRate — the front sorts/filters client-side as needed.
        leagueGroup.MapGet("/", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IRankingService rankings) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var list = await rankings.GetLeagueRankingAsync(leagueId);
            return Results.Ok(list);
        });

        // -------------------------------------------------------------------------
        // Player-scoped ranking-stats route: /api/players/{playerId}/ranking-stats
        // Authorization: caller must be a member of the league the player belongs to.
        // -------------------------------------------------------------------------
        var playerGroup = app.MapGroup("/api/players")
            .WithTags("Rankings")
            .RequireAuthorization();

        // GET /api/players/{playerId}/ranking-stats
        playerGroup.MapGet("/{playerId:guid}/ranking-stats", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players,
            IRankingService rankings) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var stats = await rankings.GetPlayerStatsAsync(playerId);
            return stats is null ? Results.NotFound() : Results.Ok(stats);
        });
    }
}
