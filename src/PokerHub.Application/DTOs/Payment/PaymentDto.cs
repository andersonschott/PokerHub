using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Payment;

public record PaymentDto(
    Guid Id,
    Guid TournamentId,
    string TournamentName,
    Guid FromPlayerId,
    string FromPlayerName,
    Guid ToPlayerId,
    string ToPlayerName,
    string? ToPlayerPixKey,
    PixKeyType? ToPlayerPixKeyType,
    decimal Amount,
    PaymentStatus Status,
    DateTime CreatedAt,
    DateTime? PaidAt,
    DateTime? ConfirmedAt,
    int DaysOpen
);
