using System.Net.Http.Json;
using PokerHub.Application.DTOs.Jackpot;
using PokerHub.Application.Interfaces;

namespace PokerHub.Client.Services.Http;

public class HttpJackpotService(HttpClient http) : IJackpotService
{
    public async Task<JackpotStatusDto> GetJackpotStatusAsync(Guid leagueId)
        => await http.GetFromJsonAsync<JackpotStatusDto>($"api/leagues/{leagueId}/jackpot")
           ?? new JackpotStatusDto(leagueId, 0, 0, 0, []);

    public async Task<IReadOnlyList<JackpotContributionDto>> GetContributionHistoryAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<JackpotContributionDto>>($"api/leagues/{leagueId}/jackpot/contributions") ?? [];

    public async Task<IReadOnlyList<JackpotUsageDto>> GetUsageHistoryAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<JackpotUsageDto>>($"api/leagues/{leagueId}/jackpot/usages") ?? [];

    public async Task<bool> UpdateJackpotSettingsAsync(Guid leagueId, UpdateJackpotSettingsDto dto)
        => (await http.PutAsJsonAsync($"api/leagues/{leagueId}/jackpot/settings", dto)).IsSuccessStatusCode;

    public async Task<JackpotContributionDto?> RecordContributionAsync(Guid tournamentId, decimal amount)
        => null;

    public async Task<bool> UseJackpotAsync(Guid leagueId, UseJackpotDto dto)
        => (await http.PostAsJsonAsync($"api/leagues/{leagueId}/jackpot/use", dto)).IsSuccessStatusCode;

    public async Task<decimal> CalculateJackpotContributionAsync(Guid tournamentId)
        => 0;
}
