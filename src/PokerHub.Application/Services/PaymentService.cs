using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly PokerHubDbContext _context;

    public PaymentService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsByTournamentAsync(Guid tournamentId)
    {
        return await _context.Payments
            .Where(p => p.TournamentId == tournamentId)
            .Include(p => p.Tournament)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsByPlayerAsync(Guid playerId)
    {
        return await _context.Payments
            .Where(p => p.FromPlayerId == playerId || p.ToPlayerId == playerId)
            .Include(p => p.Tournament)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsByPlayerAsync(Guid playerId)
    {
        return await _context.Payments
            .Where(p => p.FromPlayerId == playerId && p.Status == PaymentStatus.Pending)
            .Include(p => p.Tournament)
            .Include(p => p.ToPlayer)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PendingDebtDto(
                p.Id,
                p.TournamentId,
                p.Tournament.Name,
                p.Tournament.ScheduledDateTime,
                p.ToPlayerId,
                p.ToPlayer.Name,
                p.ToPlayer.PixKey,
                p.Amount,
                (DateTime.UtcNow - p.CreatedAt).Days
            ))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPendingPaymentsToReceiveAsync(Guid playerId)
    {
        return await _context.Payments
            .Where(p => p.ToPlayerId == playerId && p.Status != PaymentStatus.Confirmed)
            .Include(p => p.Tournament)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    /// <summary>
    /// Calculates and creates optimized payment records for a finished tournament.
    ///
    /// Algorithm:
    /// 1. Calculate balance for each player: Prize - TotalInvestment
    /// 2. Separate into debtors (balance < 0) and creditors (balance > 0)
    /// 3. Sort both by absolute value (largest first)
    /// 4. Match debtors to creditors to minimize number of transactions
    /// 5. Create payment records
    /// </summary>
    public async Task<IReadOnlyList<PaymentDto>> CalculateAndCreatePaymentsAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.Players)
                .ThenInclude(tp => tp.Player)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null || tournament.Status != TournamentStatus.Finished)
            return new List<PaymentDto>();

        // Remove existing payments for this tournament
        var existingPayments = await _context.Payments
            .Where(p => p.TournamentId == tournamentId)
            .ToListAsync();
        _context.Payments.RemoveRange(existingPayments);

        // Calculate balances
        var balances = tournament.Players
            .Where(tp => tp.IsCheckedIn)
            .Select(tp => new
            {
                tp.PlayerId,
                tp.Player.Name,
                tp.Player.PixKey,
                Balance = tp.Prize - tp.TotalInvestment(tournament)
            })
            .ToList();

        // Separate into debtors (negative balance) and creditors (positive balance)
        var debtors = balances
            .Where(b => b.Balance < 0)
            .OrderByDescending(b => Math.Abs(b.Balance))
            .Select(b => new { b.PlayerId, b.Name, Amount = Math.Abs(b.Balance) })
            .ToList();

        var creditors = balances
            .Where(b => b.Balance > 0)
            .OrderByDescending(b => b.Balance)
            .Select(b => new { b.PlayerId, b.Name, b.PixKey, Amount = b.Balance })
            .ToList();

        // Create optimized payment records
        var payments = new List<Payment>();
        var debtorAmounts = debtors.ToDictionary(d => d.PlayerId, d => d.Amount);
        var creditorAmounts = creditors.ToDictionary(c => c.PlayerId, c => c.Amount);

        foreach (var debtor in debtors)
        {
            var remainingDebt = debtorAmounts[debtor.PlayerId];

            foreach (var creditor in creditors)
            {
                if (remainingDebt <= 0) break;

                var remainingCredit = creditorAmounts[creditor.PlayerId];
                if (remainingCredit <= 0) continue;

                var paymentAmount = Math.Min(remainingDebt, remainingCredit);

                payments.Add(new Payment
                {
                    Id = Guid.NewGuid(),
                    TournamentId = tournamentId,
                    FromPlayerId = debtor.PlayerId,
                    ToPlayerId = creditor.PlayerId,
                    Amount = paymentAmount,
                    Status = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                });

                remainingDebt -= paymentAmount;
                debtorAmounts[debtor.PlayerId] = remainingDebt;
                creditorAmounts[creditor.PlayerId] = remainingCredit - paymentAmount;
            }
        }

        _context.Payments.AddRange(payments);
        await _context.SaveChangesAsync();

        // Reload with includes for DTO mapping
        var createdPayments = await _context.Payments
            .Where(p => p.TournamentId == tournamentId)
            .Include(p => p.Tournament)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .ToListAsync();

        return createdPayments.Select(p => MapToDto(p)).ToList();
    }

    public async Task<bool> MarkAsPaidAsync(Guid paymentId, Guid fromPlayerId)
    {
        var payment = await _context.Payments.FindAsync(paymentId);
        if (payment == null || payment.FromPlayerId != fromPlayerId)
            return false;

        if (payment.Status != PaymentStatus.Pending)
            return false;

        payment.MarkAsPaid();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ConfirmPaymentAsync(Guid paymentId, Guid toPlayerId)
    {
        var payment = await _context.Payments.FindAsync(paymentId);
        if (payment == null || payment.ToPlayerId != toPlayerId)
            return false;

        if (payment.Status != PaymentStatus.Paid)
            return false;

        payment.Confirm();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<PlayerBalanceDto>> GetTournamentPlayerBalancesAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.Players)
                .ThenInclude(tp => tp.Player)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null)
            return new List<PlayerBalanceDto>();

        return tournament.Players
            .Where(tp => tp.IsCheckedIn)
            .Select(tp => new PlayerBalanceDto(
                tp.PlayerId,
                tp.Player.Name,
                tp.TotalInvestment(tournament),
                tp.Prize,
                tp.Prize - tp.TotalInvestment(tournament)
            ))
            .OrderByDescending(b => b.Balance)
            .ToList();
    }

    private static PaymentDto MapToDto(Payment p)
    {
        return new PaymentDto(
            p.Id,
            p.TournamentId,
            p.Tournament.Name,
            p.FromPlayerId,
            p.FromPlayer.Name,
            p.ToPlayerId,
            p.ToPlayer.Name,
            p.ToPlayer.PixKey,
            p.ToPlayer.PixKeyType,
            p.Amount,
            p.Status,
            p.CreatedAt,
            p.PaidAt,
            p.ConfirmedAt,
            (DateTime.UtcNow - p.CreatedAt).Days
        );
    }
}
