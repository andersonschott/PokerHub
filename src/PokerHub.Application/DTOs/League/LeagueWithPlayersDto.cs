using PokerHub.Application.DTOs.Player;

namespace PokerHub.Application.DTOs.League;

public record LeagueWithPlayersDto(
    Guid Id,
    string Name,
    string? Description,
    string InviteCode,
    string OrganizerId,
    string OrganizerName,
    bool BlockCheckInWithDebt,
    DateTime CreatedAt,
    bool IsActive,
    IReadOnlyList<PlayerDto> Players
);
