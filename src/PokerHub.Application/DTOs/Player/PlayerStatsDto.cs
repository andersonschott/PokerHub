namespace PokerHub.Application.DTOs.Player;

public record PlayerStatsDto(
    Guid PlayerId,
    string PlayerName,
    string? Nickname,
    int TournamentsPlayed,
    int Wins,
    int SecondPlaces,
    int ThirdPlaces,
    int Top3Finishes,
    decimal TotalBuyIns,
    decimal TotalPrizes,
    decimal Profit,
    decimal? BestResult,
    decimal? WorstResult,
    decimal AveragePosition,
    IReadOnlyList<PlayerTournamentResultDto> RecentResults,
    bool HasLegacyData = false
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
