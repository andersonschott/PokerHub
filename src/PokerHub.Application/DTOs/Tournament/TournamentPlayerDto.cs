namespace PokerHub.Application.DTOs.Tournament;

public record TournamentPlayerDto(
    Guid Id,
    Guid TournamentId,
    Guid PlayerId,
    string PlayerName,
    string? Nickname,
    bool IsCheckedIn,
    DateTime? CheckedInAt,
    int RebuyCount,
    bool HasAddon,
    int? Position,
    decimal Prize,
    Guid? EliminatedByPlayerId,
    string? EliminatedByPlayerName,
    DateTime? EliminatedAt,
    decimal TotalInvestment,
    decimal ProfitLoss
);
