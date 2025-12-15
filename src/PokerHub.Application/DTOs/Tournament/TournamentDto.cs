using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Tournament;

public record TournamentDto(
    Guid Id,
    Guid LeagueId,
    string LeagueName,
    string Name,
    DateTime ScheduledDateTime,
    string? Location,
    decimal BuyIn,
    decimal? RebuyValue,
    decimal? AddonValue,
    int StartingStack,
    TournamentStatus Status,
    int PlayerCount,
    int CheckedInCount,
    decimal PrizePool,
    DateTime CreatedAt
);
