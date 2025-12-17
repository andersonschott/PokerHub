namespace PokerHub.Application.DTOs.Player;

public record PlayerRankingDto(
    int Position,
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
    decimal ROI,
    decimal ITMRate
);
