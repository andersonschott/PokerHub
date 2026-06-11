using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.Jackpot;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Jackpot;

public static class JackpotEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/leagues/{leagueId:guid}/jackpot")
            .WithTags("Jackpot")
            .RequireAuthorization();

        // GET /api/leagues/{leagueId}/jackpot  — balance + status
        group.MapGet("/", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IJackpotService jackpot) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var status = await jackpot.GetJackpotStatusAsync(leagueId);
            return Results.Ok(status);
        });

        // GET /api/leagues/{leagueId}/jackpot/contributions  — contribution history
        group.MapGet("/contributions", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IJackpotService jackpot) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var history = await jackpot.GetContributionHistoryAsync(leagueId);
            return Results.Ok(history);
        });

        // GET /api/leagues/{leagueId}/jackpot/usages  — usage history
        group.MapGet("/usages", async (
            Guid leagueId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IJackpotService jackpot) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var history = await jackpot.GetUsageHistoryAsync(leagueId);
            return Results.Ok(history);
        });

        // PUT /api/leagues/{leagueId}/jackpot/settings  — organizer updates jackpot %
        group.MapPut("/settings", async (
            Guid leagueId,
            UpdateJackpotSettingsDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IJackpotService jackpot) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await jackpot.UpdateJackpotSettingsAsync(leagueId, dto);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // POST /api/leagues/{leagueId}/jackpot/use  — organizer uses jackpot amount
        group.MapPost("/use", async (
            Guid leagueId,
            UseJackpotDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IJackpotService jackpot) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await jackpot.UseJackpotAsync(leagueId, dto);
            return ok ? Results.Ok() : Results.BadRequest();
        });
    }
}
