using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Payment;

public record PaymentDto(
    Guid Id,
    Guid TournamentId,
    string TournamentName,
    Guid FromPlayerId,
    string FromPlayerName,
    Guid? ToPlayerId,
    string ToPlayerName, // Can be "Caixinha" for jackpot payments
    string? ToPlayerPixKey,
    PixKeyType? ToPlayerPixKeyType,
    decimal Amount,
    PaymentStatus Status,
    PaymentType Type,
    DateTime CreatedAt,
    DateTime? PaidAt,
    DateTime? ConfirmedAt,
    int DaysOpen,
    string? Description = null,
    Guid? ExpenseId = null,
    bool IsJackpotContribution = false
);
