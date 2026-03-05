namespace PokerHub.Application.DTOs.Season;

public record SeasonDto(
    Guid Id,
    Guid LeagueId,
    string Name,
    DateTime StartDate,
    DateTime EndDate,
    bool IsActive,
    int TournamentCount,
    DateTime CreatedAt
);

public record CreateSeasonDto(
    string Name,
    DateTime StartDate,
    DateTime EndDate
);

public record UpdateSeasonDto(
    string Name,
    DateTime StartDate,
    DateTime EndDate,
    bool IsActive
);

public record SeasonSummaryDto(
    Guid Id,
    string Name,
    DateTime StartDate,
    DateTime EndDate,
    bool IsActive,
    bool IsCurrent,
    int TournamentCount
);
