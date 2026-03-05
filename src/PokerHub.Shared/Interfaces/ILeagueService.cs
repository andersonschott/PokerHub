using PokerHub.Application.DTOs.League;
using PokerHub.Domain.Enums;

namespace PokerHub.Application.Interfaces;

public interface ILeagueService
{
    Task<IReadOnlyList<LeagueDto>> GetLeaguesByUserAsync(string userId);
    Task<LeagueDto?> GetLeagueByIdAsync(Guid leagueId);
    Task<LeagueWithPlayersDto?> GetLeagueWithPlayersAsync(Guid leagueId);
    Task<LeagueDto?> GetLeagueByInviteCodeAsync(string inviteCode);
    Task<LeagueDto> CreateLeagueAsync(string organizerId, CreateLeagueDto dto);
    Task<LeagueDto?> UpdateLeagueAsync(Guid leagueId, UpdateLeagueDto dto);
    Task<string> RegenerateInviteCodeAsync(Guid leagueId);
    Task<bool> DeleteLeagueAsync(Guid leagueId);
    Task<bool> IsUserOrganizerAsync(Guid leagueId, string userId);

    /// <summary>
    /// Gets leagues where the user is a linked player (not organizer).
    /// </summary>
    Task<IReadOnlyList<LeagueDto>> GetLeaguesAsPlayerAsync(string userId);

    /// <summary>
    /// Checks if user can access a league (organizer or linked player).
    /// </summary>
    Task<bool> CanUserAccessLeagueAsync(Guid leagueId, string userId);

    /// <summary>
    /// Joins a user to a league. If a player with the same email exists, links them.
    /// Otherwise, creates a new player.
    /// </summary>
    /// <returns>True if successfully joined, false if already a member.</returns>
    Task<(bool Success, string Message)> JoinLeagueAsync(
        Guid leagueId,
        string userId,
        string userName,
        string? userEmail,
        string? nickname = null,
        string? phone = null,
        string? pixKey = null,
        PixKeyType? pixKeyType = null);

    /// <summary>
    /// Allows a user to leave a league. The player record is soft-deleted (IsActive = false)
    /// but remains in rankings and history. Fails if the player has pending debts.
    /// </summary>
    Task<(bool Success, string Message)> LeaveLeagueAsync(Guid leagueId, string userId);
}
