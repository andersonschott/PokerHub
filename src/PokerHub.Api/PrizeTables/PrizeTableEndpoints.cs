using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.PrizeTable;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.PrizeTables;

public static class PrizeTableEndpoints
{
    public static void Map(WebApplication app)
    {
        // -------------------------------------------------------------------------
        // League-scoped prize-table routes: /api/leagues/{leagueId}/prize-tables
        // -------------------------------------------------------------------------
        var leagueGroup = app.MapGroup("/api/leagues/{leagueId:guid}/prize-tables")
            .WithTags("PrizeTables")
            .RequireAuthorization();

        // GET /api/leagues/{leagueId}/prize-tables
        leagueGroup.MapGet("/", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPrizeTableService prizeTables) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var list = await prizeTables.GetPrizeTablesByLeagueAsync(leagueId);
            return Results.Ok(list);
        });

        // POST /api/leagues/{leagueId}/prize-tables
        leagueGroup.MapPost("/", async (
            Guid leagueId,
            CreatePrizeTableDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPrizeTableService prizeTables) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var created = await prizeTables.CreatePrizeTableAsync(leagueId, dto);
            return Results.Created($"/api/prize-tables/{created.Id}", created);
        });

        // -------------------------------------------------------------------------
        // Prize-table-scoped routes: /api/prize-tables/{prizeTableId}
        // Authorization: derive leagueId from the fetched entity.
        // -------------------------------------------------------------------------
        var prizeTableGroup = app.MapGroup("/api/prize-tables")
            .WithTags("PrizeTables")
            .RequireAuthorization();

        // GET /api/prize-tables/{prizeTableId}
        prizeTableGroup.MapGet("/{prizeTableId:guid}", async (
            Guid prizeTableId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPrizeTableService prizeTables) =>
        {
            var pt = await prizeTables.GetPrizeTableByIdAsync(prizeTableId);
            if (pt is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(pt.LeagueId, user.GetUserId()))
                return Results.Forbid();

            return Results.Ok(pt);
        });

        // PUT /api/prize-tables/{prizeTableId}
        prizeTableGroup.MapPut("/{prizeTableId:guid}", async (
            Guid prizeTableId,
            UpdatePrizeTableDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPrizeTableService prizeTables) =>
        {
            var pt = await prizeTables.GetPrizeTableByIdAsync(prizeTableId);
            if (pt is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(pt.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var updated = await prizeTables.UpdatePrizeTableAsync(prizeTableId, dto);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        // DELETE /api/prize-tables/{prizeTableId}
        prizeTableGroup.MapDelete("/{prizeTableId:guid}", async (
            Guid prizeTableId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPrizeTableService prizeTables) =>
        {
            var pt = await prizeTables.GetPrizeTableByIdAsync(prizeTableId);
            if (pt is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(pt.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var deleted = await prizeTables.DeletePrizeTableAsync(prizeTableId);
            return deleted ? Results.NoContent() : Results.NotFound();
        });
    }
}
