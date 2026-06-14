using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.Season;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Seasons;

public static class SeasonEndpoints
{
    public static void Map(WebApplication app)
    {
        // -------------------------------------------------------------------------
        // League-scoped season routes: /api/leagues/{leagueId}/seasons
        // -------------------------------------------------------------------------
        var leagueGroup = app.MapGroup("/api/leagues/{leagueId:guid}/seasons")
            .WithTags("Seasons")
            .RequireAuthorization();

        // GET /api/leagues/{leagueId}/seasons
        leagueGroup.MapGet("/", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var list = await seasons.GetSeasonsByLeagueAsync(leagueId);
            return Results.Ok(list);
        });

        // GET /api/leagues/{leagueId}/seasons/active
        leagueGroup.MapGet("/active", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var active = await seasons.GetActiveSeasonAsync(leagueId);
            return active is null ? Results.NotFound() : Results.Ok(active);
        });

        // GET /api/leagues/{leagueId}/seasons/summaries
        leagueGroup.MapGet("/summaries", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var summaries = await seasons.GetSeasonSummariesAsync(leagueId);
            return Results.Ok(summaries);
        });

        // POST /api/leagues/{leagueId}/seasons
        leagueGroup.MapPost("/", async (
            Guid leagueId,
            CreateSeasonDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var created = await seasons.CreateSeasonAsync(leagueId, dto);
            return Results.Created($"/api/seasons/{created.Id}", created);
        });

        // -------------------------------------------------------------------------
        // Season-scoped routes: /api/seasons/{seasonId}
        // Note: Authorization for individual season operations checks the caller
        // is an organizer of the league owning the season (fetched from service).
        // For read-only access, membership is sufficient.
        // -------------------------------------------------------------------------
        var seasonGroup = app.MapGroup("/api/seasons")
            .WithTags("Seasons")
            .RequireAuthorization();

        // GET /api/seasons/{seasonId}
        seasonGroup.MapGet("/{seasonId:guid}", async (
            Guid seasonId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            var season = await seasons.GetSeasonByIdAsync(seasonId);
            if (season is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(season.LeagueId, user.GetUserId()))
                return Results.Forbid();

            return Results.Ok(season);
        });

        // GET /api/seasons/{seasonId}/ranking
        seasonGroup.MapGet("/{seasonId:guid}/ranking", async (
            Guid seasonId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            var season = await seasons.GetSeasonByIdAsync(seasonId);
            if (season is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(season.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ranking = await seasons.GetSeasonRankingAsync(seasonId);
            return Results.Ok(ranking);
        });

        // PUT /api/seasons/{seasonId}
        seasonGroup.MapPut("/{seasonId:guid}", async (
            Guid seasonId,
            UpdateSeasonDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            var season = await seasons.GetSeasonByIdAsync(seasonId);
            if (season is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(season.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var updated = await seasons.UpdateSeasonAsync(seasonId, dto);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        // DELETE /api/seasons/{seasonId}
        seasonGroup.MapDelete("/{seasonId:guid}", async (
            Guid seasonId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ISeasonService seasons) =>
        {
            var season = await seasons.GetSeasonByIdAsync(seasonId);
            if (season is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(season.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var deleted = await seasons.DeleteSeasonAsync(seasonId);
            return deleted ? Results.NoContent() : Results.NotFound();
        });
    }
}
