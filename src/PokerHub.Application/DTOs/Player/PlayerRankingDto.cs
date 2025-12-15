namespace PokerHub.Application.DTOs.Player;

public record PlayerRankingDto(
    int Position,
    Guid PlayerId,
    string PlayerName,
    string? Nickname,
    int TournamentsPlayed,
    int Wins,
    int Top3Finishes,
    decimal TotalBuyIns,
    decimal TotalPrizes,
    decimal Profit
);
