using System.Net.Http.Json;
using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;

namespace PokerHub.Client.Services.Http;

public class HttpPlayerService(HttpClient http) : IPlayerService
{
    public async Task<IReadOnlyList<PlayerDto>> GetPlayersByLeagueAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<PlayerDto>>($"api/leagues/{leagueId}/players") ?? [];

    public async Task<PlayerDto?> GetPlayerByIdAsync(Guid playerId)
        => await http.GetFromJsonAsync<PlayerDto>($"api/players/{playerId}");

    public async Task<PlayerDto?> GetPlayerByUserIdAsync(string userId)
        => await http.GetFromJsonAsync<PlayerDto>("api/players/me");

    public async Task<IReadOnlyList<PlayerDto>> GetAllPlayersByUserAsync(string userId)
        => await http.GetFromJsonAsync<List<PlayerDto>>("api/players/me/all") ?? [];

    public async Task<PlayerStatsDto?> GetPlayerStatsAsync(Guid playerId)
        => await http.GetFromJsonAsync<PlayerStatsDto>($"api/players/{playerId}/stats");

    public async Task<PlayerDto> CreatePlayerAsync(Guid leagueId, CreatePlayerDto dto)
    {
        var response = await http.PostAsJsonAsync($"api/leagues/{leagueId}/players", dto);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PlayerDto>())!;
    }

    public async Task<PlayerDto?> UpdatePlayerAsync(Guid playerId, UpdatePlayerDto dto)
    {
        var response = await http.PutAsJsonAsync($"api/players/{playerId}", dto);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<PlayerDto>();
    }

    public async Task<(bool Success, string Message)> DeletePlayerAsync(Guid playerId, bool checkDebts = true)
    {
        var response = await http.DeleteAsync($"api/players/{playerId}?checkDebts={checkDebts}");
        if (response.IsSuccessStatusCode) return (true, "Jogador removido.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro ao remover jogador.");
    }

    public async Task<bool> LinkPlayerToUserAsync(Guid playerId, string? userId)
    {
        // Not exposed via API currently
        return false;
    }

    public async Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsAsync(Guid playerId)
        => await http.GetFromJsonAsync<List<PendingDebtDto>>($"api/players/{playerId}/debts") ?? [];

    public async Task<bool> HasPendingDebtsAsync(Guid playerId)
    {
        var debts = await GetPendingDebtsAsync(playerId);
        return debts.Any();
    }

    public async Task<int> LinkPlayersByEmailAsync(string email, string userId)
        => 0; // Not exposed via API

    private record MessageResponse(string Message);
}
