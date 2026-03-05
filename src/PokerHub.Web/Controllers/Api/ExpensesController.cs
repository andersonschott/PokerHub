using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.DTOs.Expense;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/expenses")]
public class ExpensesController(ITournamentExpenseService expenseService) : BaseApiController
{
    [HttpGet("/api/tournaments/{tournamentId:guid}/expenses")]
    public async Task<IActionResult> GetTournamentExpenses(Guid tournamentId)
    {
        var expenses = await expenseService.GetExpensesByTournamentAsync(tournamentId);
        return Ok(expenses);
    }

    [HttpGet("/api/tournaments/{tournamentId:guid}/expenses/summary")]
    public async Task<IActionResult> GetExpenseSummary(Guid tournamentId)
    {
        var summary = await expenseService.GetExpenseSummaryByTournamentAsync(tournamentId);
        return Ok(summary);
    }

    [HttpPost("/api/tournaments/{tournamentId:guid}/expenses")]
    public async Task<IActionResult> CreateExpense(Guid tournamentId, [FromBody] CreateExpenseDto dto)
    {
        var expense = await expenseService.CreateExpenseAsync(tournamentId, dto);
        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetExpense(Guid id)
    {
        var expense = await expenseService.GetExpenseByIdAsync(id);
        if (expense is null) return NotFound();
        return Ok(expense);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateExpense(Guid id, [FromBody] CreateExpenseDto dto)
    {
        var ok = await expenseService.UpdateExpenseAsync(id, dto);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteExpense(Guid id)
    {
        var ok = await expenseService.DeleteExpenseAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpGet("/api/tournaments/{tournamentId:guid}/expenses/eligible-players")]
    public async Task<IActionResult> GetEligiblePlayers(Guid tournamentId)
    {
        var players = await expenseService.GetEligiblePlayersForShareAsync(tournamentId);
        return Ok(players);
    }
}
