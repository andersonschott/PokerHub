namespace PokerHub.Application.DTOs.Jackpot;

public record JackpotStatusDto(
    Guid LeagueId,
    decimal AccumulatedPrizePool,
    decimal JackpotPercentage,
    int TotalContributions,
    IReadOnlyList<JackpotContributionDto> RecentContributions
);

public record JackpotContributionDto(
    Guid Id,
    Guid TournamentId,
    string TournamentName,
    DateTime TournamentDate,
    decimal TournamentPrizePool,
    decimal PercentageApplied,
    decimal Amount,
    DateTime CreatedAt
);

public record UpdateJackpotSettingsDto(
    decimal JackpotPercentage
);

public record UseJackpotDto(
    decimal Amount,
    string? Description
);

public record JackpotUsageDto(
    Guid Id,
    decimal Amount,
    string? Description,
    decimal BalanceBefore,
    decimal BalanceAfter,
    DateTime CreatedAt
);
