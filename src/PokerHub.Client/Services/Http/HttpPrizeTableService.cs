using System.Net.Http.Json;
using PokerHub.Application.DTOs.PrizeTable;
using PokerHub.Application.Interfaces;

namespace PokerHub.Client.Services.Http;

public class HttpPrizeTableService(HttpClient http) : IPrizeTableService
{
    public async Task<IReadOnlyList<LeaguePrizeTableDto>> GetPrizeTablesByLeagueAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<LeaguePrizeTableDto>>($"api/leagues/{leagueId}/prize-tables") ?? [];

    public async Task<LeaguePrizeTableDto?> GetPrizeTableByIdAsync(Guid prizeTableId)
        => await http.GetFromJsonAsync<LeaguePrizeTableDto>($"api/prize-tables/{prizeTableId}");

    public async Task<LeaguePrizeTableDto?> FindMatchingPrizeTableAsync(Guid leagueId, decimal prizePoolTotal)
        => null;

    public async Task<LeaguePrizeTableDto> CreatePrizeTableAsync(Guid leagueId, CreatePrizeTableDto dto)
    {
        var response = await http.PostAsJsonAsync($"api/leagues/{leagueId}/prize-tables", dto);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LeaguePrizeTableDto>())!;
    }

    public async Task<LeaguePrizeTableDto?> UpdatePrizeTableAsync(Guid prizeTableId, UpdatePrizeTableDto dto)
    {
        var response = await http.PutAsJsonAsync($"api/prize-tables/{prizeTableId}", dto);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<LeaguePrizeTableDto>();
    }

    public async Task<bool> DeletePrizeTableAsync(Guid prizeTableId)
        => (await http.DeleteAsync($"api/prize-tables/{prizeTableId}")).IsSuccessStatusCode;

    public async Task<PrizeDistributionResultDto> CalculatePrizeDistributionAsync(Guid leagueId, decimal prizePoolTotal, string? fallbackPercentages, bool usePrizeTable = true)
        => await http.GetFromJsonAsync<PrizeDistributionResultDto>($"api/leagues/{leagueId}/prize-tables/calculate?prizePool={prizePoolTotal}&fallbackPercentages={fallbackPercentages}&usePrizeTable={usePrizeTable}")
           ?? new PrizeDistributionResultDto(false, null, 0, []);
}
