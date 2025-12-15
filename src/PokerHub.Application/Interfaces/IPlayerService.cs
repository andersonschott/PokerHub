using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.DTOs.Player;

namespace PokerHub.Application.Interfaces;

public interface IPlayerService
{
    Task<IReadOnlyList<PlayerDto>> GetPlayersByLeagueAsync(Guid leagueId);
    Task<PlayerDto?> GetPlayerByIdAsync(Guid playerId);
    Task<PlayerDto?> GetPlayerByUserIdAsync(string userId);
    Task<IReadOnlyList<PlayerDto>> GetAllPlayersByUserAsync(string userId);
    Task<PlayerStatsDto?> GetPlayerStatsAsync(Guid playerId);
    Task<PlayerDto> CreatePlayerAsync(Guid leagueId, CreatePlayerDto dto);
    Task<PlayerDto?> UpdatePlayerAsync(Guid playerId, UpdatePlayerDto dto);
    Task<bool> DeletePlayerAsync(Guid playerId);
    Task<bool> LinkPlayerToUserAsync(Guid playerId, string? userId);
    Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsAsync(Guid playerId);
    Task<bool> HasPendingDebtsAsync(Guid playerId);

    /// <summary>
    /// Links all players with the given email to the user account.
    /// Used during registration to auto-link existing players.
    /// </summary>
    Task<int> LinkPlayersByEmailAsync(string email, string userId);
}
