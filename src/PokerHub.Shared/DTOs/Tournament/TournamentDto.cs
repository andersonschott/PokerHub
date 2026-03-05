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
    int CurrentLevel,
    int PlayerCount,
    int CheckedInCount,
    decimal PrizePool,
    string InviteCode,
    int? AllowCheckInUntilLevel,
    DateTime CreatedAt
)
{
    public bool IsCheckInAllowed => Status == TournamentStatus.Scheduled ||
        (Status is TournamentStatus.InProgress or TournamentStatus.Paused &&
         AllowCheckInUntilLevel.HasValue && CurrentLevel <= AllowCheckInUntilLevel.Value);
}
