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
        // Filter out jackpot payments (ToPlayerId == null) - those are not player-to-player debts
        return await _context.Payments
            .Where(p => p.FromPlayerId == playerId && p.Status == PaymentStatus.Pending && p.ToPlayerId != null)
            .Include(p => p.Tournament)
            .Include(p => p.ToPlayer)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PendingDebtDto(
                p.Id,
                p.TournamentId,
                p.Tournament.Name,
                p.Tournament.ScheduledDateTime,
                p.ToPlayerId!.Value,
                p.ToPlayer!.Name,
                p.ToPlayer!.PixKey,
                p.Amount,
                (DateTime.UtcNow - p.CreatedAt).Days,
                p.Type,
                p.Description
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
    /// Optimized Algorithm:
    /// 1. Calculate balance for each player: Prize - TotalInvestment
    /// 2. Round to integers (no cents)
    /// 3. Separate into debtors (balance &lt; 0) and creditors (balance &gt; 0)
    /// 4. Add jackpot as a "virtual creditor" (Caixinha)
    /// 5. Prioritize single-transaction payments:
    ///    a. Find perfect matches (debt == credit)
    ///    b. Find creditor that can absorb entire debt
    ///    c. Traditional matching for remainders
    /// </summary>
    public async Task<IReadOnlyList<PaymentDto>> CalculateAndCreatePaymentsAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.Players)
                .ThenInclude(tp => tp.Player)
            .Include(t => t.League)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null || tournament.Status != TournamentStatus.Finished)
            return new List<PaymentDto>();

        // Remove existing payments for this tournament
        var existingPayments = await _context.Payments
            .Where(p => p.TournamentId == tournamentId)
            .ToListAsync();
        _context.Payments.RemoveRange(existingPayments);

        // Get jackpot contribution for this tournament
        var jackpotContribution = await _context.JackpotContributions
            .FirstOrDefaultAsync(j => j.TournamentId == tournamentId);
        var jackpotAmount = (int)Math.Round(jackpotContribution?.Amount ?? 0, MidpointRounding.AwayFromZero);

        // Calculate balances and round to integers
        var balances = tournament.Players
            .Where(tp => tp.IsCheckedIn)
            .Select(tp => new
            {
                tp.PlayerId,
                tp.Player.Name,
                tp.Player.PixKey,
                Balance = (int)Math.Round(tp.Prize - tp.TotalInvestment(tournament), MidpointRounding.AwayFromZero)
            })
            .ToList();

        // Separate into debtors (negative balance) and creditors (positive balance)
        var debtorList = balances
            .Where(b => b.Balance < 0)
            .Select(b => new Debtor(b.PlayerId, b.Name, Math.Abs(b.Balance)))
            .ToList();

        var creditorList = balances
            .Where(b => b.Balance > 0)
            .Select(b => new Creditor(b.PlayerId, b.Name, b.Balance, false))
            .ToList();

        // Add jackpot as a "virtual creditor" (Caixinha)
        if (jackpotAmount > 0)
        {
            creditorList.Add(new Creditor(null, "Caixinha", jackpotAmount, true));
        }

        // Working dictionaries for amounts (use index for creditors since PlayerId can be null)
        var debtorAmounts = debtorList.ToDictionary(d => d.PlayerId, d => d.Amount);
        var creditorAmounts = creditorList.Select((c, i) => new { Index = i, c.Amount }).ToDictionary(x => x.Index, x => x.Amount);

        // Adjust for rounding differences
        var totalDebt = debtorAmounts.Values.Sum();
        var totalCredit = creditorAmounts.Values.Sum();
        var roundingDiff = totalCredit - totalDebt;

        if (roundingDiff > 0 && debtorList.Any())
        {
            // Credit is larger - add difference to largest debtor
            var largestDebtor = debtorList.OrderByDescending(d => d.Amount).First();
            debtorAmounts[largestDebtor.PlayerId] += roundingDiff;
        }
        else if (roundingDiff < 0 && creditorList.Any())
        {
            // Debt is larger - add difference to largest creditor (prefer non-jackpot)
            var largestCreditorIdx = creditorList
                .Select((c, i) => new { Creditor = c, Index = i })
                .Where(x => !x.Creditor.IsJackpot)
                .OrderByDescending(x => x.Creditor.Amount)
                .FirstOrDefault()?.Index ?? 0;
            creditorAmounts[largestCreditorIdx] += Math.Abs(roundingDiff);
        }

        var payments = new List<Payment>();

        // Phase 1: Find perfect matches (debt == credit)
        foreach (var debtor in debtorList.OrderBy(d => d.Amount))
        {
            if (debtorAmounts[debtor.PlayerId] <= 0) continue;

            var perfectMatchIdx = creditorList
                .Select((c, i) => new { Creditor = c, Index = i })
                .FirstOrDefault(x => creditorAmounts[x.Index] == debtorAmounts[debtor.PlayerId] && creditorAmounts[x.Index] > 0);

            if (perfectMatchIdx != null)
            {
                var amount = debtorAmounts[debtor.PlayerId];
                var creditor = perfectMatchIdx.Creditor;
                var type = creditor.IsJackpot ? PaymentType.Jackpot : PaymentType.Poker;
                payments.Add(CreatePayment(tournamentId, debtor.PlayerId, creditor.PlayerId, amount, type, creditor.IsJackpot ? "Caixinha" : null));
                debtorAmounts[debtor.PlayerId] = 0;
                creditorAmounts[perfectMatchIdx.Index] = 0;
            }
        }

        // Phase 2: For remaining debtors, find a single creditor that can absorb the entire debt
        foreach (var debtor in debtorList.OrderByDescending(d => debtorAmounts[d.PlayerId]))
        {
            var debt = debtorAmounts[debtor.PlayerId];
            if (debt <= 0) continue;

            // Find smallest creditor that can absorb the entire debt
            var bestCreditorMatch = creditorList
                .Select((c, i) => new { Creditor = c, Index = i })
                .Where(x => creditorAmounts[x.Index] >= debt)
                .OrderBy(x => creditorAmounts[x.Index])
                .FirstOrDefault();

            if (bestCreditorMatch != null)
            {
                var creditor = bestCreditorMatch.Creditor;
                var type = creditor.IsJackpot ? PaymentType.Jackpot : PaymentType.Poker;
                payments.Add(CreatePayment(tournamentId, debtor.PlayerId, creditor.PlayerId, debt, type, creditor.IsJackpot ? "Caixinha" : null));
                debtorAmounts[debtor.PlayerId] = 0;
                creditorAmounts[bestCreditorMatch.Index] -= debt;
            }
        }

        // Phase 3: Traditional matching for remaining debts (greedy)
        foreach (var debtor in debtorList.OrderByDescending(d => debtorAmounts[d.PlayerId]))
        {
            var remaining = debtorAmounts[debtor.PlayerId];
            if (remaining <= 0) continue;

            foreach (var creditorMatch in creditorList.Select((c, i) => new { Creditor = c, Index = i }).OrderByDescending(x => creditorAmounts[x.Index]))
            {
                if (remaining <= 0) break;

                var credit = creditorAmounts[creditorMatch.Index];
                if (credit <= 0) continue;

                var paymentAmount = Math.Min(remaining, credit);
                if (paymentAmount > 0)
                {
                    var creditor = creditorMatch.Creditor;
                    var type = creditor.IsJackpot ? PaymentType.Jackpot : PaymentType.Poker;
                    payments.Add(CreatePayment(tournamentId, debtor.PlayerId, creditor.PlayerId, paymentAmount, type, creditor.IsJackpot ? "Caixinha" : null));
                    remaining -= paymentAmount;
                    debtorAmounts[debtor.PlayerId] = remaining;
                    creditorAmounts[creditorMatch.Index] = credit - paymentAmount;
                }
            }
        }

        // Phase 4: Create payments for expenses (direct 1:1 payments)
        var expenses = await _context.TournamentExpenses
            .Include(e => e.Shares)
            .Where(e => e.TournamentId == tournamentId)
            .ToListAsync();

        foreach (var expense in expenses)
        {
            foreach (var share in expense.Shares)
            {
                // If the player is not the one who paid, create a payment
                if (share.PlayerId != expense.PaidByPlayerId)
                {
                    var amount = (int)Math.Round(share.Amount, MidpointRounding.AwayFromZero);
                    if (amount > 0)
                    {
                        payments.Add(CreatePayment(
                            tournamentId,
                            share.PlayerId,           // From: who owes
                            expense.PaidByPlayerId,   // To: who paid
                            amount,
                            PaymentType.Expense,
                            expense.Description,      // e.g., "Pizza", "Cerveja"
                            expense.Id                // Reference to expense
                        ));
                    }
                }
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

    private static Payment CreatePayment(Guid tournamentId, Guid fromPlayerId, Guid? toPlayerId, int amount, PaymentType type, string? description = null, Guid? expenseId = null)
    {
        return new Payment
        {
            Id = Guid.NewGuid(),
            TournamentId = tournamentId,
            FromPlayerId = fromPlayerId,
            ToPlayerId = toPlayerId,
            Amount = amount,
            Type = type,
            Status = PaymentStatus.Pending,
            Description = description,
            ExpenseId = expenseId,
            CreatedAt = DateTime.UtcNow
        };
    }

    private record Debtor(Guid PlayerId, string Name, int Amount);
    private record Creditor(Guid? PlayerId, string Name, int Amount, bool IsJackpot);

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

    public async Task<bool> AdminMarkAsPaidAsync(Guid paymentId, string organizerUserId)
    {
        var payment = await _context.Payments
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return false;

        // Verify user is the league organizer
        if (payment.Tournament.League.OrganizerId != organizerUserId)
            return false;

        if (payment.Status != PaymentStatus.Pending)
            return false;

        payment.MarkAsPaid();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AdminConfirmPaymentAsync(Guid paymentId, string organizerUserId)
    {
        var payment = await _context.Payments
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return false;

        // Verify user is the league organizer
        if (payment.Tournament.League.OrganizerId != organizerUserId)
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

        var balances = tournament.Players
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

        return balances;
    }

    public async Task<decimal> GetJackpotContributionAsync(Guid tournamentId)
    {
        var jackpot = await _context.JackpotContributions
            .FirstOrDefaultAsync(j => j.TournamentId == tournamentId);
        return jackpot?.Amount ?? 0;
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsForOrganizerAsync(string organizerUserId)
    {
        return await _context.Payments
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .Where(p => p.Tournament.League.OrganizerId == organizerUserId && p.Status != PaymentStatus.Confirmed)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    private static PaymentDto MapToDto(Payment p)
    {
        // Handle legacy payments: check ToPlayerId == null for old jackpot payments
        // that were created before the Type field was added
        var isJackpot = p.Type == PaymentType.Jackpot || p.ToPlayerId == null;
        return new PaymentDto(
            p.Id,
            p.TournamentId,
            p.Tournament.Name,
            p.FromPlayerId,
            p.FromPlayer.Name,
            p.ToPlayerId,
            isJackpot ? (p.Description ?? "Caixinha") : p.ToPlayer!.Name,
            isJackpot ? null : p.ToPlayer!.PixKey,
            isJackpot ? null : p.ToPlayer!.PixKeyType,
            p.Amount,
            p.Status,
            p.Type,
            p.CreatedAt,
            p.PaidAt,
            p.ConfirmedAt,
            (DateTime.UtcNow - p.CreatedAt).Days,
            p.Description,
            p.ExpenseId,
            isJackpot
        );
    }
}
