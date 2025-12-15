using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Tournament;

public record TimerStateDto(
    Guid TournamentId,
    string TournamentName,
    TournamentStatus Status,
    int CurrentLevel,
    int TimeRemainingSeconds,
    BlindLevelDto CurrentBlindLevel,
    BlindLevelDto? NextBlindLevel,
    int PlayersRemaining,
    int TotalPlayers,
    decimal PrizePool,
    int TotalRebuys,
    int TotalAddons
);
