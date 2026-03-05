using PokerHub.Application.DTOs.PrizeTable;

namespace PokerHub.Application.Interfaces;

public interface IPrizeTableService
{
    Task<IReadOnlyList<LeaguePrizeTableDto>> GetPrizeTablesByLeagueAsync(Guid leagueId);
    Task<LeaguePrizeTableDto?> GetPrizeTableByIdAsync(Guid prizeTableId);
    Task<LeaguePrizeTableDto?> FindMatchingPrizeTableAsync(Guid leagueId, decimal prizePoolTotal);
    Task<LeaguePrizeTableDto> CreatePrizeTableAsync(Guid leagueId, CreatePrizeTableDto dto);
    Task<LeaguePrizeTableDto?> UpdatePrizeTableAsync(Guid prizeTableId, UpdatePrizeTableDto dto);
    Task<bool> DeletePrizeTableAsync(Guid prizeTableId);
    Task<PrizeDistributionResultDto> CalculatePrizeDistributionAsync(Guid leagueId, decimal prizePoolTotal, string? fallbackPercentages, bool usePrizeTable = true);
}
