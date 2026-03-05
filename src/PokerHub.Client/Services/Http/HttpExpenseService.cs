using System.Net.Http.Json;
using PokerHub.Application.DTOs.Expense;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;

namespace PokerHub.Client.Services.Http;

public class HttpExpenseService(HttpClient http) : ITournamentExpenseService
{
    public async Task<IReadOnlyList<TournamentExpenseDto>> GetExpensesByTournamentAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<List<TournamentExpenseDto>>($"api/tournaments/{tournamentId}/expenses") ?? [];

    public async Task<TournamentExpenseDto?> GetExpenseByIdAsync(Guid expenseId)
        => await http.GetFromJsonAsync<TournamentExpenseDto>($"api/expenses/{expenseId}");

    public async Task<TournamentExpenseDto> CreateExpenseAsync(Guid tournamentId, CreateExpenseDto dto)
    {
        var response = await http.PostAsJsonAsync($"api/tournaments/{tournamentId}/expenses", dto);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TournamentExpenseDto>())!;
    }

    public async Task<bool> UpdateExpenseAsync(Guid expenseId, CreateExpenseDto dto)
        => (await http.PutAsJsonAsync($"api/expenses/{expenseId}", dto)).IsSuccessStatusCode;

    public async Task<bool> DeleteExpenseAsync(Guid expenseId)
        => (await http.DeleteAsync($"api/expenses/{expenseId}")).IsSuccessStatusCode;

    public async Task<IReadOnlyList<ExpenseSummaryDto>> GetExpenseSummaryByTournamentAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<List<ExpenseSummaryDto>>($"api/tournaments/{tournamentId}/expenses/summary") ?? [];

    public async Task<IReadOnlyList<PlayerDto>> GetEligiblePlayersForShareAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<List<PlayerDto>>($"api/tournaments/{tournamentId}/expenses/eligible-players") ?? [];

    public async Task<IReadOnlyList<PlayerDto>> GetLeaguePlayersAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<List<PlayerDto>>($"api/tournaments/{tournamentId}/expenses/eligible-players") ?? [];
}
