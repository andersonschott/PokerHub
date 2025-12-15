using PokerHub.Application.DTOs.Payment;

namespace PokerHub.Application.Interfaces;

public interface IPaymentService
{
    Task<IReadOnlyList<PaymentDto>> GetPaymentsByTournamentAsync(Guid tournamentId);
    Task<IReadOnlyList<PaymentDto>> GetPaymentsByPlayerAsync(Guid playerId);
    Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsByPlayerAsync(Guid playerId);
    Task<IReadOnlyList<PaymentDto>> GetPendingPaymentsToReceiveAsync(Guid playerId);

    /// <summary>
    /// Calculates and creates payment records for a finished tournament.
    /// Uses an optimized algorithm to minimize the number of transactions.
    /// </summary>
    Task<IReadOnlyList<PaymentDto>> CalculateAndCreatePaymentsAsync(Guid tournamentId);

    /// <summary>
    /// Debtor marks payment as paid.
    /// </summary>
    Task<bool> MarkAsPaidAsync(Guid paymentId, Guid fromPlayerId);

    /// <summary>
    /// Creditor confirms receipt of payment.
    /// </summary>
    Task<bool> ConfirmPaymentAsync(Guid paymentId, Guid toPlayerId);

    /// <summary>
    /// Get player balances for a tournament (for display purposes).
    /// </summary>
    Task<IReadOnlyList<PlayerBalanceDto>> GetTournamentPlayerBalancesAsync(Guid tournamentId);
}
