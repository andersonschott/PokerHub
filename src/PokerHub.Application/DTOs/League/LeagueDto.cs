namespace PokerHub.Application.DTOs.League;

public record LeagueDto(
    Guid Id,
    string Name,
    string? Description,
    string InviteCode,
    string OrganizerId,
    string OrganizerName,
    bool BlockCheckInWithDebt,
    int PlayerCount,
    int TournamentCount,
    decimal JackpotPercentage,
    decimal AccumulatedPrizePool,
    DateTime CreatedAt,
    bool IsActive
);
