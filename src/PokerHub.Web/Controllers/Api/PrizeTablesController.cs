using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.DTOs.PrizeTable;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/prize-tables")]
public class PrizeTablesController(IPrizeTableService prizeTableService) : BaseApiController
{
    [HttpGet("/api/leagues/{leagueId:guid}/prize-tables")]
    public async Task<IActionResult> GetPrizeTables(Guid leagueId)
    {
        var tables = await prizeTableService.GetPrizeTablesByLeagueAsync(leagueId);
        return Ok(tables);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPrizeTable(Guid id)
    {
        var table = await prizeTableService.GetPrizeTableByIdAsync(id);
        if (table is null) return NotFound();
        return Ok(table);
    }

    [HttpPost("/api/leagues/{leagueId:guid}/prize-tables")]
    public async Task<IActionResult> CreatePrizeTable(Guid leagueId, [FromBody] CreatePrizeTableDto dto)
    {
        var table = await prizeTableService.CreatePrizeTableAsync(leagueId, dto);
        return CreatedAtAction(nameof(GetPrizeTable), new { id = table.Id }, table);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePrizeTable(Guid id, [FromBody] UpdatePrizeTableDto dto)
    {
        var table = await prizeTableService.UpdatePrizeTableAsync(id, dto);
        if (table is null) return NotFound();
        return Ok(table);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePrizeTable(Guid id)
    {
        var ok = await prizeTableService.DeletePrizeTableAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpGet("/api/leagues/{leagueId:guid}/prize-tables/calculate")]
    public async Task<IActionResult> CalculatePrizeDistribution(
        Guid leagueId,
        [FromQuery] decimal prizePool,
        [FromQuery] string? fallbackPercentages = null,
        [FromQuery] bool usePrizeTable = true)
    {
        var result = await prizeTableService.CalculatePrizeDistributionAsync(
            leagueId, prizePool, fallbackPercentages, usePrizeTable);
        return Ok(result);
    }
}
