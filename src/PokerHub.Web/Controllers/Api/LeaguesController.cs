using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.DTOs.League;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Enums;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/leagues")]
public class LeaguesController(ILeagueService leagueService) : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetMyLeagues()
    {
        var userId = GetUserId();
        var organized = await leagueService.GetLeaguesByUserAsync(userId);
        var asPlayer = await leagueService.GetLeaguesAsPlayerAsync(userId);
        return Ok(organized.Concat(asPlayer));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetLeague(Guid id)
    {
        var league = await leagueService.GetLeagueByIdAsync(id);
        if (league is null) return NotFound();
        if (!await leagueService.CanUserAccessLeagueAsync(id, GetUserId()))
            return Forbid();
        return Ok(league);
    }

    [HttpGet("{id:guid}/players")]
    public async Task<IActionResult> GetLeaguePlayers(Guid id)
    {
        if (!await leagueService.CanUserAccessLeagueAsync(id, GetUserId()))
            return Forbid();
        var league = await leagueService.GetLeagueWithPlayersAsync(id);
        if (league is null) return NotFound();
        return Ok(league);
    }

    [HttpPost]
    public async Task<IActionResult> CreateLeague([FromBody] CreateLeagueDto dto)
    {
        var league = await leagueService.CreateLeagueAsync(GetUserId(), dto);
        return CreatedAtAction(nameof(GetLeague), new { id = league.Id }, league);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateLeague(Guid id, [FromBody] UpdateLeagueDto dto)
    {
        if (!await leagueService.IsUserOrganizerAsync(id, GetUserId()))
            return Forbid();
        var league = await leagueService.UpdateLeagueAsync(id, dto);
        if (league is null) return NotFound();
        return Ok(league);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteLeague(Guid id)
    {
        if (!await leagueService.IsUserOrganizerAsync(id, GetUserId()))
            return Forbid();
        var deleted = await leagueService.DeleteLeagueAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/invite-code/regenerate")]
    public async Task<IActionResult> RegenerateInviteCode(Guid id)
    {
        if (!await leagueService.IsUserOrganizerAsync(id, GetUserId()))
            return Forbid();
        var code = await leagueService.RegenerateInviteCodeAsync(id);
        return Ok(new { inviteCode = code });
    }

    [HttpPost("join/{inviteCode}")]
    public async Task<IActionResult> JoinLeague(string inviteCode, [FromBody] JoinLeagueRequest? request)
    {
        var league = await leagueService.GetLeagueByInviteCodeAsync(inviteCode);
        if (league is null) return NotFound(new { message = "Liga não encontrada para este código." });

        var (success, message) = await leagueService.JoinLeagueAsync(
            league.Id,
            GetUserId(),
            GetUserName(),
            GetUserEmail(),
            request?.Nickname,
            request?.Phone,
            request?.PixKey,
            request?.PixKeyType);

        if (!success) return Conflict(new { message });
        return Ok(new { message });
    }

    [HttpDelete("{id:guid}/leave")]
    public async Task<IActionResult> LeaveLeague(Guid id)
    {
        var (success, message) = await leagueService.LeaveLeagueAsync(id, GetUserId());
        if (!success) return BadRequest(new { message });
        return Ok(new { message });
    }
}

public record JoinLeagueRequest(
    string? Nickname,
    string? Phone,
    string? PixKey,
    PixKeyType? PixKeyType);
