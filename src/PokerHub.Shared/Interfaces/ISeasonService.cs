using PokerHub.Application.DTOs.Player;
using PokerHub.Application.DTOs.Season;

namespace PokerHub.Application.Interfaces;

public interface ISeasonService
{
    Task<IReadOnlyList<SeasonDto>> GetSeasonsByLeagueAsync(Guid leagueId);
    Task<SeasonDto?> GetSeasonByIdAsync(Guid seasonId);
    Task<SeasonDto?> GetActiveSeasonAsync(Guid leagueId);
    Task<SeasonDto?> GetSeasonForDateAsync(Guid leagueId, DateTime date);
    Task<SeasonDto> CreateSeasonAsync(Guid leagueId, CreateSeasonDto dto);
    Task<SeasonDto?> UpdateSeasonAsync(Guid seasonId, UpdateSeasonDto dto);
    Task<bool> DeleteSeasonAsync(Guid seasonId);
    Task<IReadOnlyList<PlayerRankingDto>> GetSeasonRankingAsync(Guid seasonId);
    Task<bool> ValidateSeasonDatesAsync(Guid leagueId, DateTime startDate, DateTime endDate, Guid? excludeSeasonId = null);
    Task<IReadOnlyList<SeasonSummaryDto>> GetSeasonSummariesAsync(Guid leagueId);
}
