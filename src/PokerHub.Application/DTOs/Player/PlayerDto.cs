using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Player;

public record PlayerDto(
    Guid Id,
    Guid LeagueId,
    string Name,
    string? Nickname,
    string? Email,
    string? Phone,
    string? PixKey,
    PixKeyType? PixKeyType,
    string? UserId,
    DateTime CreatedAt,
    bool IsActive,
    decimal TotalProfit,
    int TournamentsPlayed,
    int Wins,
    int SecondPlaces,
    int ThirdPlaces,
    decimal TotalBuyIns,
    decimal TotalPrizes,
    int ITMCount
)
{
    public decimal ROI => TotalBuyIns > 0 ? (TotalProfit / TotalBuyIns) * 100 : 0;
    public decimal ITMRate => TournamentsPlayed > 0 ? (decimal)ITMCount / TournamentsPlayed * 100 : 0;
}
