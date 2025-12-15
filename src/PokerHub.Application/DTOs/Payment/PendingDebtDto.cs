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
    int DaysOpen
);
