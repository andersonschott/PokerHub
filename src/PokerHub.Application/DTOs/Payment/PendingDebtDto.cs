using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Payment;

public record PendingDebtDto(
    Guid PaymentId,
    Guid TournamentId,
    string TournamentName,
    DateTime TournamentDate,
    Guid CreditorPlayerId,
    string CreditorPlayerName,
    string? CreditorPixKey,
    decimal Amount,
    int DaysOpen,
    PaymentType Type = PaymentType.Poker,
    string? Description = null
);
