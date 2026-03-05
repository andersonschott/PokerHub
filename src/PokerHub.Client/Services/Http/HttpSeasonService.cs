using System.Net.Http.Json;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.DTOs.Season;
using PokerHub.Application.Interfaces;

namespace PokerHub.Client.Services.Http;

public class HttpSeasonService(HttpClient http) : ISeasonService
{
    public async Task<IReadOnlyList<SeasonDto>> GetSeasonsByLeagueAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<SeasonDto>>($"api/leagues/{leagueId}/seasons") ?? [];

    public async Task<SeasonDto?> GetSeasonByIdAsync(Guid seasonId)
        => await http.GetFromJsonAsync<SeasonDto>($"api/seasons/{seasonId}");

    public async Task<SeasonDto?> GetActiveSeasonAsync(Guid leagueId)
        => await http.GetFromJsonAsync<SeasonDto>($"api/leagues/{leagueId}/seasons/active");

    public async Task<SeasonDto?> GetSeasonForDateAsync(Guid leagueId, DateTime date)
        => await GetActiveSeasonAsync(leagueId);

    public async Task<SeasonDto> CreateSeasonAsync(Guid leagueId, CreateSeasonDto dto)
    {
        var response = await http.PostAsJsonAsync($"api/leagues/{leagueId}/seasons", dto);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SeasonDto>())!;
    }

    public async Task<SeasonDto?> UpdateSeasonAsync(Guid seasonId, UpdateSeasonDto dto)
    {
        var response = await http.PutAsJsonAsync($"api/seasons/{seasonId}", dto);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<SeasonDto>();
    }

    public async Task<bool> DeleteSeasonAsync(Guid seasonId)
        => (await http.DeleteAsync($"api/seasons/{seasonId}")).IsSuccessStatusCode;

    public async Task<IReadOnlyList<PlayerRankingDto>> GetSeasonRankingAsync(Guid seasonId)
        => await http.GetFromJsonAsync<List<PlayerRankingDto>>($"api/seasons/{seasonId}/ranking") ?? [];

    public Task<bool> ValidateSeasonDatesAsync(Guid leagueId, DateTime startDate, DateTime endDate, Guid? excludeSeasonId = null)
        => Task.FromResult(true);

    public async Task<IReadOnlyList<SeasonSummaryDto>> GetSeasonSummariesAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<SeasonSummaryDto>>($"api/leagues/{leagueId}/seasons/summaries") ?? [];
}
