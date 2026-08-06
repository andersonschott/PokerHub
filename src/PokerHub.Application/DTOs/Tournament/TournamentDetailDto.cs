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
    IReadOnlyList<TournamentPlayerDto> Players,
    IReadOnlyList<TournamentPrizeDto> Prizes,
    PrizeDistributionType PrizeDistributionType,

    // Quem pede o detalhe é dono da liga? Vale para as ações exclusivas do organizador
    // (delegar, cancelar). false para chamadas sem usuário (modo TV / convite público).
    bool IsOrganizer = false,

    // Pode operar a mesa (dono da liga OU delegado do torneio). É a MESMA regra que os
    // endpoints aplicam — a SPA não rededuz permissão a partir de liga + delegados, senão
    // um GET que falha vira "silenciosamente virou membro" e o botão some.
    bool CanOperate = false
)
{
    public bool IsCheckInAllowed => Status == TournamentStatus.Scheduled ||
        (Status is TournamentStatus.InProgress or TournamentStatus.Paused &&
         AllowCheckInUntilLevel.HasValue && CurrentLevel <= AllowCheckInUntilLevel.Value);
}
