using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.DTOs.Season;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/seasons")]
public class SeasonsController(ISeasonService seasonService) : BaseApiController
{
    [HttpGet("/api/leagues/{leagueId:guid}/seasons")]
    public async Task<IActionResult> GetSeasons(Guid leagueId)
    {
        var seasons = await seasonService.GetSeasonsByLeagueAsync(leagueId);
        return Ok(seasons);
    }

    [HttpGet("/api/leagues/{leagueId:guid}/seasons/summaries")]
    public async Task<IActionResult> GetSeasonSummaries(Guid leagueId)
    {
        var summaries = await seasonService.GetSeasonSummariesAsync(leagueId);
        return Ok(summaries);
    }

    [HttpGet("/api/leagues/{leagueId:guid}/seasons/active")]
    public async Task<IActionResult> GetActiveSeason(Guid leagueId)
    {
        var season = await seasonService.GetActiveSeasonAsync(leagueId);
        if (season is null) return NotFound();
        return Ok(season);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSeason(Guid id)
    {
        var season = await seasonService.GetSeasonByIdAsync(id);
        if (season is null) return NotFound();
        return Ok(season);
    }

    [HttpGet("{id:guid}/ranking")]
    public async Task<IActionResult> GetSeasonRanking(Guid id)
    {
        var ranking = await seasonService.GetSeasonRankingAsync(id);
        return Ok(ranking);
    }

    [HttpPost("/api/leagues/{leagueId:guid}/seasons")]
    public async Task<IActionResult> CreateSeason(Guid leagueId, [FromBody] CreateSeasonDto dto)
    {
        var season = await seasonService.CreateSeasonAsync(leagueId, dto);
        return CreatedAtAction(nameof(GetSeason), new { id = season.Id }, season);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSeason(Guid id, [FromBody] UpdateSeasonDto dto)
    {
        var season = await seasonService.UpdateSeasonAsync(id, dto);
        if (season is null) return NotFound();
        return Ok(season);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSeason(Guid id)
    {
        var ok = await seasonService.DeleteSeasonAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
