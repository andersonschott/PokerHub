namespace PokerHub.Application.DTOs.PrizeTable;

public record LeaguePrizeTableDto(
    Guid Id,
    Guid LeagueId,
    string Name,
    decimal PrizePoolTotal,
    decimal JackpotAmount,
    IReadOnlyList<PrizeTableEntryDto> Entries,
    DateTime CreatedAt
);

public record PrizeTableEntryDto(
    int Position,
    decimal PrizeAmount
);

public record CreatePrizeTableDto(
    string Name,
    decimal PrizePoolTotal,
    decimal JackpotAmount,
    IList<CreatePrizeTableEntryDto> Entries
);

public record CreatePrizeTableEntryDto(
    int Position,
    decimal PrizeAmount
);

public record UpdatePrizeTableDto(
    string Name,
    decimal PrizePoolTotal,
    decimal JackpotAmount,
    IList<CreatePrizeTableEntryDto> Entries
);

public record PrizeDistributionResultDto(
    bool UsedPrizeTable,
    string? PrizeTableName,
    decimal JackpotContribution,
    IReadOnlyList<PrizeAllocationDto> Allocations
);

public record PrizeAllocationDto(
    int Position,
    decimal Amount,
    bool IsFromTable
);
