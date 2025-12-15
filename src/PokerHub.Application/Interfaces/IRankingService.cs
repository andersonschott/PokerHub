using PokerHub.Application.DTOs.Player;

namespace PokerHub.Application.Interfaces;

public interface IRankingService
{
    Task<IReadOnlyList<PlayerRankingDto>> GetLeagueRankingAsync(Guid leagueId);
    Task<PlayerStatsDto?> GetPlayerStatsAsync(Guid playerId);
}
