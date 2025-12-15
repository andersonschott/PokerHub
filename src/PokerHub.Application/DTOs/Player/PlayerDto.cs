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
    int Wins
);
