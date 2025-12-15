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
}
