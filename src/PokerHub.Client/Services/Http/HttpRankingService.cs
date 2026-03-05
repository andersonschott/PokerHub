using System.Net.Http.Json;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;

namespace PokerHub.Client.Services.Http;

public class HttpRankingService(HttpClient http) : IRankingService
{
    public async Task<IReadOnlyList<PlayerRankingDto>> GetLeagueRankingAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<PlayerRankingDto>>($"api/leagues/{leagueId}/ranking") ?? [];

    public async Task<PlayerStatsDto?> GetPlayerStatsAsync(Guid playerId)
        => await http.GetFromJsonAsync<PlayerStatsDto>($"api/players/{playerId}/ranking-stats");
}
