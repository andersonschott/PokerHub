namespace PokerHub.Application.DTOs.Player;

public record PlayerStatsDto(
    Guid PlayerId,
    string PlayerName,
    string? Nickname,
    int TournamentsPlayed,
    int Wins,
    int Top3Finishes,
    decimal TotalBuyIns,
    decimal TotalPrizes,
    decimal Profit,
    decimal? BestResult,
    decimal? WorstResult,
    decimal AveragePosition,
    IReadOnlyList<PlayerTournamentResultDto> RecentResults
);

public record PlayerTournamentResultDto(
    Guid TournamentId,
    string TournamentName,
    DateTime Date,
    int? Position,
    int TotalPlayers,
    decimal Investment,
    decimal Prize,
    decimal Profit
);
