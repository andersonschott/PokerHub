using PokerHub.Application.DTOs.Jackpot;

namespace PokerHub.Application.Interfaces;

public interface IJackpotService
{
    Task<JackpotStatusDto> GetJackpotStatusAsync(Guid leagueId);
    Task<IReadOnlyList<JackpotContributionDto>> GetContributionHistoryAsync(Guid leagueId);
    Task<IReadOnlyList<JackpotUsageDto>> GetUsageHistoryAsync(Guid leagueId);
    Task<bool> UpdateJackpotSettingsAsync(Guid leagueId, UpdateJackpotSettingsDto dto);
    Task<JackpotContributionDto?> RecordContributionAsync(Guid tournamentId, decimal amount);
    Task<bool> UseJackpotAsync(Guid leagueId, UseJackpotDto dto);
    Task<decimal> CalculateJackpotContributionAsync(Guid tournamentId);
}
