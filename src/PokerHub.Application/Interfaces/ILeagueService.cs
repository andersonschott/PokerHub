using PokerHub.Application.DTOs.League;

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
}
