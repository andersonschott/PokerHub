using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.DTOs.Jackpot;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/jackpots")]
public class JackpotsController(IJackpotService jackpotService) : BaseApiController
{
    [HttpGet("/api/leagues/{leagueId:guid}/jackpot")]
    public async Task<IActionResult> GetJackpotStatus(Guid leagueId)
    {
        var status = await jackpotService.GetJackpotStatusAsync(leagueId);
        return Ok(status);
    }

    [HttpGet("/api/leagues/{leagueId:guid}/jackpot/contributions")]
    public async Task<IActionResult> GetContributionHistory(Guid leagueId)
    {
        var history = await jackpotService.GetContributionHistoryAsync(leagueId);
        return Ok(history);
    }

    [HttpGet("/api/leagues/{leagueId:guid}/jackpot/usages")]
    public async Task<IActionResult> GetUsageHistory(Guid leagueId)
    {
        var history = await jackpotService.GetUsageHistoryAsync(leagueId);
        return Ok(history);
    }

    [HttpPut("/api/leagues/{leagueId:guid}/jackpot/settings")]
    public async Task<IActionResult> UpdateSettings(Guid leagueId, [FromBody] UpdateJackpotSettingsDto dto)
    {
        var ok = await jackpotService.UpdateJackpotSettingsAsync(leagueId, dto);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpPost("/api/leagues/{leagueId:guid}/jackpot/use")]
    public async Task<IActionResult> UseJackpot(Guid leagueId, [FromBody] UseJackpotDto dto)
    {
        var ok = await jackpotService.UseJackpotAsync(leagueId, dto);
        if (!ok) return BadRequest(new { message = "Saldo insuficiente no jackpot." });
        return NoContent();
    }
}
