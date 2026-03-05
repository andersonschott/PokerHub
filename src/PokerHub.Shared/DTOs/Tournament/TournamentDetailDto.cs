using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Tournament;

public record TournamentDetailDto(
    Guid Id,
    Guid LeagueId,
    string LeagueName,
    string Name,
    DateTime ScheduledDateTime,
    string? Location,
    decimal BuyIn,
    int StartingStack,
    decimal? RebuyValue,
    int? RebuyStack,
    int? RebuyLimitLevel,
    int? RebuyLimitMinutes,
    RebuyLimitType RebuyLimitType,
    decimal? AddonValue,
    int? AddonStack,
    string? PrizeStructure,
    bool UsePrizeTable,
    string InviteCode,
    int? AllowCheckInUntilLevel,
    TournamentStatus Status,
    int CurrentLevel,
    int? TimeRemainingSeconds,
    DateTime? CurrentLevelStartedAt,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? FinishedAt,
    decimal PrizePool,
    IReadOnlyList<BlindLevelDto> BlindLevels,
    IReadOnlyList<TournamentPlayerDto> Players
)
{
    public bool IsCheckInAllowed => Status == TournamentStatus.Scheduled ||
        (Status is TournamentStatus.InProgress or TournamentStatus.Paused &&
         AllowCheckInUntilLevel.HasValue && CurrentLevel <= AllowCheckInUntilLevel.Value);
}
