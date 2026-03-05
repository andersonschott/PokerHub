using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/players")]
public class PlayersController(IPlayerService playerService) : BaseApiController
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMyPlayer()
    {
        var player = await playerService.GetPlayerByUserIdAsync(GetUserId());
        if (player is null) return NotFound();
        return Ok(player);
    }

    [HttpGet("me/all")]
    public async Task<IActionResult> GetAllMyPlayers()
    {
        var players = await playerService.GetAllPlayersByUserAsync(GetUserId());
        return Ok(players);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPlayer(Guid id)
    {
        var player = await playerService.GetPlayerByIdAsync(id);
        if (player is null) return NotFound();
        return Ok(player);
    }

    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetPlayerStats(Guid id)
    {
        var stats = await playerService.GetPlayerStatsAsync(id);
        if (stats is null) return NotFound();
        return Ok(stats);
    }

    [HttpGet("{id:guid}/debts")]
    public async Task<IActionResult> GetPlayerDebts(Guid id)
    {
        var debts = await playerService.GetPendingDebtsAsync(id);
        return Ok(debts);
    }

    [HttpPost("/api/leagues/{leagueId:guid}/players")]
    public async Task<IActionResult> CreatePlayer(Guid leagueId, [FromBody] CreatePlayerDto dto)
    {
        var player = await playerService.CreatePlayerAsync(leagueId, dto);
        return CreatedAtAction(nameof(GetPlayer), new { id = player.Id }, player);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePlayer(Guid id, [FromBody] UpdatePlayerDto dto)
    {
        var player = await playerService.UpdatePlayerAsync(id, dto);
        if (player is null) return NotFound();
        return Ok(player);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePlayer(Guid id, [FromQuery] bool checkDebts = true)
    {
        var (success, message) = await playerService.DeletePlayerAsync(id, checkDebts);
        if (!success) return BadRequest(new { message });
        return NoContent();
    }
}
