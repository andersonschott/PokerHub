using PokerHub.Application.DTOs.Expense;
using PokerHub.Application.DTOs.Player;

namespace PokerHub.Application.Interfaces;

public interface ITournamentExpenseService
{
    Task<IReadOnlyList<TournamentExpenseDto>> GetExpensesByTournamentAsync(Guid tournamentId);
    Task<TournamentExpenseDto?> GetExpenseByIdAsync(Guid expenseId);
    Task<TournamentExpenseDto> CreateExpenseAsync(Guid tournamentId, CreateExpenseDto dto);
    Task<bool> UpdateExpenseAsync(Guid expenseId, CreateExpenseDto dto);
    Task<bool> DeleteExpenseAsync(Guid expenseId);
    Task<IReadOnlyList<ExpenseSummaryDto>> GetExpenseSummaryByTournamentAsync(Guid tournamentId);

    /// <summary>
    /// Get checked-in players for expense sharing (only tournament participants)
    /// </summary>
    Task<IReadOnlyList<PlayerDto>> GetEligiblePlayersForShareAsync(Guid tournamentId);

    /// <summary>
    /// Get all league players (for selecting who paid the expense)
    /// </summary>
    Task<IReadOnlyList<PlayerDto>> GetLeaguePlayersAsync(Guid tournamentId);
}
