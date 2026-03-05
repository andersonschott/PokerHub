namespace PokerHub.Application.DTOs.Payment;

public record PaymentCalculationDto(
    Guid FromPlayerId,
    string FromPlayerName,
    Guid ToPlayerId,
    string ToPlayerName,
    string? ToPlayerPixKey,
    decimal Amount
);

public record PlayerBalanceDto(
    Guid PlayerId,
    string PlayerName,
    decimal TotalInvestment,
    decimal Prize,
    decimal Balance
);
