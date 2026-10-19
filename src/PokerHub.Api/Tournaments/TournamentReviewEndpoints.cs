using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PokerHub.Api.Common;
using PokerHub.Application.Interfaces;
using PokerHub.Application.DTOs.PrizeTable;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Tournaments;

public static class TournamentReviewEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/tournaments").WithTags("Tournaments").RequireAuthorization();
        group.MapGet("/{id:guid}/settlement-preview", async (Guid id, ClaimsPrincipal user,
            ITournamentService tournaments, IPrizeTableService prizes) =>
        {
            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.Finish))
                return Results.Forbid();
            var detail = await tournaments.GetTournamentDetailAsync(id, user.GetUserId());
            if (detail == null) return Results.NotFound();
            var distribution = await prizes.CalculatePrizeDistributionAsync(detail.LeagueId, detail.PrizePool,
                detail.PrizeStructure, detail.UsePrizeTable, detail.PrizeDistributionType);
            return Results.Ok(distribution);
        }).Produces<PrizeDistributionResultDto>();
        group.MapGet("/{id:guid}/history", async (Guid id, ClaimsPrincipal user,
            ITournamentService tournaments, ILeagueService leagues, PokerHubDbContext db) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(id);
            if (tournament == null) return Results.NotFound();
            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();
            var history = await db.OperationLogs.AsNoTracking()
                .Where(o => o.ScopeId == id && o.ScopeType == "Tournament")
                .OrderByDescending(o => o.CreatedAt).Take(100)
                .Select(o => new
                {
                    o.Id, o.Action, o.CreatedAt,
                    ActorName = db.Users.Where(u => u.Id == o.ActorId).Select(u => u.Name).FirstOrDefault() ?? "Sistema"
                }).ToListAsync();
            return Results.Ok(history);
        });
    }
}
