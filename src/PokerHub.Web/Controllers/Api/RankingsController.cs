using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/rankings")]
public class RankingsController(IRankingService rankingService) : BaseApiController
{
    [HttpGet("/api/leagues/{leagueId:guid}/ranking")]
    public async Task<IActionResult> GetLeagueRanking(Guid leagueId)
    {
        var ranking = await rankingService.GetLeagueRankingAsync(leagueId);
        return Ok(ranking);
    }

    [HttpGet("/api/players/{playerId:guid}/ranking-stats")]
    public async Task<IActionResult> GetPlayerRankingStats(Guid playerId)
    {
        var stats = await rankingService.GetPlayerStatsAsync(playerId);
        if (stats is null) return NotFound();
        return Ok(stats);
    }
}
