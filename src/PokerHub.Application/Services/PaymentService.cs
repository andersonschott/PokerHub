using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.Helpers;
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
            .Where(p => p.FromPlayerId == playerId && p.Status != PaymentStatus.Confirmed && p.ToPlayerId != null)
            .Include(p => p.Tournament)
            .Include(p => p.ToPlayer)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PendingDebtDto(
                p.Id,
                p.TournamentId,
                p.Tournament.Name,
                p.Tournament.ScheduledDateTime,
                p.FromPlayerId,
                p.ToPlayerId!.Value,
                p.ToPlayer!.Name,
                p.ToPlayer!.PixKey,
                p.Amount,
                (DateTime.UtcNow - p.CreatedAt).Days,
                p.Type,
                p.Description,
                p.Status
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
    /// Algorithm: balance calculation -> rounding -> admin jackpot -> perfect matches -> absorption -> greedy -> expenses
    /// </summary>
    public async Task<IReadOnlyList<PaymentDto>> CalculateAndCreatePaymentsAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.Players)
                .ThenInclude(tp => tp.Player)
            .Include(t => t.League)
                .ThenInclude(l => l.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null || tournament.Status != TournamentStatus.Finished)
            return new List<PaymentDto>();

        // Remove existing payments for this tournament
        var existingPayments = await _context.Payments
            .Where(p => p.TournamentId == tournamentId)
            .ToListAsync();
        _context.Payments.RemoveRange(existingPayments);

        var jackpotContribution = await _context.JackpotContributions
            .FirstOrDefaultAsync(j => j.TournamentId == tournamentId);

        var ctx = InitializeBalances(tournament, FinancialMath.FinancialRound(jackpotContribution?.Amount ?? 0));
        AdjustRoundingDifference(ctx);

        // Phase 0 runs before Phase 1 by design: admin is directed to jackpot
        // even if they have a perfect match with another player
        ExecutePhase0AdminJackpot(ctx, tournament);
        ExecutePhase1PerfectMatches(ctx);
        ExecutePhase2SingleCreditorAbsorption(ctx);
        ExecutePhase3GreedyMatching(ctx);
        await CreateExpensePayments(ctx, tournamentId);

        _context.Payments.AddRange(ctx.Payments);
        await _context.SaveChangesAsync();

        var createdPayments = await _context.Payments
            .Where(p => p.TournamentId == tournamentId)
            .Include(p => p.Tournament)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .ToListAsync();

        return createdPayments.Select(p => MapToDto(p)).ToList();
    }

    private static PaymentCalculationContext InitializeBalances(Tournament tournament, int jackpotAmount)
    {
        var balances = tournament.Players
            .Where(tp => tp.IsCheckedIn)
            .Select(tp => new
            {
                tp.PlayerId,
                tp.Player.Name,
                Balance = FinancialMath.FinancialRound(tp.Prize - tp.TotalInvestment(tournament))
            })
            .ToList();

        var debtorList = balances
            .Where(b => b.Balance < 0)
            .Select(b => new Debtor(b.PlayerId, b.Name, Math.Abs(b.Balance)))
            .ToList();

        var creditorList = balances
            .Where(b => b.Balance > 0)
            .Select(b => new Creditor(b.PlayerId, b.Name, b.Balance, false))
            .ToList();

        if (jackpotAmount > 0)
            creditorList.Add(new Creditor(null, "Caixinha", jackpotAmount, true));

        return new PaymentCalculationContext(
            tournament.Id,
            debtorList,
            creditorList,
            debtorList.ToDictionary(d => d.PlayerId, d => d.Amount),
            creditorList.Select((c, i) => new { Index = i, c.Amount }).ToDictionary(x => x.Index, x => x.Amount),
            new List<Payment>()
        );
    }

    private static void AdjustRoundingDifference(PaymentCalculationContext ctx)
    {
        var totalDebt = ctx.DebtorAmounts.Values.Sum();
        var totalCredit = ctx.CreditorAmounts.Values.Sum();
        var roundingDiff = totalCredit - totalDebt;

        if (roundingDiff > 0 && ctx.Debtors.Any())
        {
            var largestDebtor = ctx.Debtors.OrderByDescending(d => d.Amount).First();
            ctx.DebtorAmounts[largestDebtor.PlayerId] += roundingDiff;
        }
        else if (roundingDiff < 0 && ctx.Creditors.Any())
        {
            var largestCreditorIdx = ctx.Creditors
                .Select((c, i) => new { Creditor = c, Index = i })
                .Where(x => !x.Creditor.IsJackpot)
                .OrderByDescending(x => x.Creditor.Amount)
                .FirstOrDefault()?.Index ?? 0;
            ctx.CreditorAmounts[largestCreditorIdx] += Math.Abs(roundingDiff);
        }
    }

    private static void ExecutePhase0AdminJackpot(PaymentCalculationContext ctx, Tournament tournament)
    {
        Guid? adminPlayerId = tournament.League.Players
            .FirstOrDefault(p => p.UserId == tournament.League.OrganizerId && p.IsActive)?.Id;

        if (!adminPlayerId.HasValue || !ctx.DebtorAmounts.ContainsKey(adminPlayerId.Value) ||
            ctx.DebtorAmounts[adminPlayerId.Value] <= 0)
            return;

        var caixinhaIdx = ctx.Creditors
            .Select((c, i) => new { Creditor = c, Index = i })
            .FirstOrDefault(x => x.Creditor.IsJackpot);

        if (caixinhaIdx == null || ctx.CreditorAmounts[caixinhaIdx.Index] <= 0)
            return;

        var paymentAmount = Math.Min(
            ctx.DebtorAmounts[adminPlayerId.Value],
            ctx.CreditorAmounts[caixinhaIdx.Index]);

        if (paymentAmount > 0)
        {
            ctx.Payments.Add(CreatePayment(ctx.TournamentId, adminPlayerId.Value, null,
                paymentAmount, PaymentType.Jackpot, "Caixinha"));
            ctx.DebtorAmounts[adminPlayerId.Value] -= paymentAmount;
            ctx.CreditorAmounts[caixinhaIdx.Index] -= paymentAmount;
        }
    }

    private static void ExecutePhase1PerfectMatches(PaymentCalculationContext ctx)
    {
        foreach (var debtor in ctx.Debtors.OrderBy(d => d.Amount))
        {
            if (ctx.DebtorAmounts[debtor.PlayerId] <= 0) continue;

            var match = ctx.Creditors
                .Select((c, i) => new { Creditor = c, Index = i })
                .FirstOrDefault(x => ctx.CreditorAmounts[x.Index] == ctx.DebtorAmounts[debtor.PlayerId] && ctx.CreditorAmounts[x.Index] > 0);

            if (match != null)
            {
                AddPaymentFromMatch(ctx, debtor.PlayerId, match.Creditor, match.Index, ctx.DebtorAmounts[debtor.PlayerId]);
                ctx.DebtorAmounts[debtor.PlayerId] = 0;
                ctx.CreditorAmounts[match.Index] = 0;
            }
        }
    }

    private static void ExecutePhase2SingleCreditorAbsorption(PaymentCalculationContext ctx)
    {
        foreach (var debtor in ctx.Debtors.OrderByDescending(d => ctx.DebtorAmounts[d.PlayerId]))
        {
            var debt = ctx.DebtorAmounts[debtor.PlayerId];
            if (debt <= 0) continue;

            var best = ctx.Creditors
                .Select((c, i) => new { Creditor = c, Index = i })
                .Where(x => ctx.CreditorAmounts[x.Index] >= debt)
                .OrderBy(x => ctx.CreditorAmounts[x.Index])
                .FirstOrDefault();

            if (best != null)
            {
                AddPaymentFromMatch(ctx, debtor.PlayerId, best.Creditor, best.Index, debt);
                ctx.DebtorAmounts[debtor.PlayerId] = 0;
                ctx.CreditorAmounts[best.Index] -= debt;
            }
        }
    }

    private static void ExecutePhase3GreedyMatching(PaymentCalculationContext ctx)
    {
        foreach (var debtor in ctx.Debtors.OrderByDescending(d => ctx.DebtorAmounts[d.PlayerId]))
        {
            var remaining = ctx.DebtorAmounts[debtor.PlayerId];
            if (remaining <= 0) continue;

            foreach (var cm in ctx.Creditors.Select((c, i) => new { Creditor = c, Index = i })
                         .OrderByDescending(x => ctx.CreditorAmounts[x.Index]))
            {
                if (remaining <= 0) break;
                var credit = ctx.CreditorAmounts[cm.Index];
                if (credit <= 0) continue;

                var paymentAmount = Math.Min(remaining, credit);
                AddPaymentFromMatch(ctx, debtor.PlayerId, cm.Creditor, cm.Index, paymentAmount);
                remaining -= paymentAmount;
                ctx.DebtorAmounts[debtor.PlayerId] = remaining;
                ctx.CreditorAmounts[cm.Index] = credit - paymentAmount;
            }
        }
    }

    private async Task CreateExpensePayments(PaymentCalculationContext ctx, Guid tournamentId)
    {
        var expenses = await _context.TournamentExpenses
            .Include(e => e.Shares)
            .Where(e => e.TournamentId == tournamentId)
            .ToListAsync();

        foreach (var expense in expenses)
        {
            foreach (var share in expense.Shares)
            {
                if (share.PlayerId != expense.PaidByPlayerId)
                {
                    var amount = FinancialMath.FinancialRound(share.Amount);
                    if (amount > 0)
                    {
                        ctx.Payments.Add(CreatePayment(tournamentId, share.PlayerId,
                            expense.PaidByPlayerId, amount, PaymentType.Expense,
                            expense.Description, expense.Id));
                    }
                }
            }
        }
    }

    private static void AddPaymentFromMatch(PaymentCalculationContext ctx, Guid debtorPlayerId,
        Creditor creditor, int creditorIndex, int amount)
    {
        var type = creditor.IsJackpot ? PaymentType.Jackpot : PaymentType.Poker;
        ctx.Payments.Add(CreatePayment(ctx.TournamentId, debtorPlayerId, creditor.PlayerId,
            amount, type, creditor.IsJackpot ? "Caixinha" : null));
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
    private record PaymentCalculationContext(
        Guid TournamentId,
        List<Debtor> Debtors,
        List<Creditor> Creditors,
        Dictionary<Guid, int> DebtorAmounts,
        Dictionary<int, int> CreditorAmounts,
        List<Payment> Payments);

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

        if (payment.Status == PaymentStatus.Confirmed)
            return false;

        payment.Confirm();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<(bool Success, string Message)> AdminMarkAsPaidAsync(Guid paymentId, string organizerUserId)
    {
        var payment = await _context.Payments
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return (false, "Pagamento não encontrado.");

        if (payment.Tournament.League.OrganizerId != organizerUserId)
            return (false, "Sem permissão para gerenciar este pagamento.");

        if (payment.Status != PaymentStatus.Pending)
            return (false, "Pagamento não está pendente.");

        payment.MarkAsPaid();
        await _context.SaveChangesAsync();
        return (true, "Pagamento marcado como pago.");
    }

    public async Task<(bool Success, string Message)> AdminConfirmPaymentAsync(Guid paymentId, string organizerUserId)
    {
        var payment = await _context.Payments
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return (false, "Pagamento não encontrado.");

        if (payment.Tournament.League.OrganizerId != organizerUserId)
            return (false, "Sem permissão para gerenciar este pagamento.");

        if (payment.Status == PaymentStatus.Confirmed)
            return (false, "Pagamento já está confirmado.");

        payment.Confirm();
        await _context.SaveChangesAsync();
        return (true, "Pagamento confirmado com sucesso.");
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

    public async Task<bool> HasPendingDebtsAsync(Guid playerId)
    {
        return await _context.Payments
            .AnyAsync(p => p.FromPlayerId == playerId &&
                          p.Status != PaymentStatus.Confirmed &&
                          p.ToPlayerId != null);
    }

    public async Task<bool> HasPendingCreditsAsync(Guid playerId)
    {
        return await _context.Payments
            .AnyAsync(p => p.ToPlayerId == playerId &&
                          p.Status != PaymentStatus.Confirmed);
    }

    public async Task<int> BulkConfirmPaymentsAsync(IList<Guid> paymentIds, string userId)
    {
        var count = await _context.Payments
            .Where(p => paymentIds.Contains(p.Id) && p.Status != PaymentStatus.Confirmed)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, PaymentStatus.Confirmed)
                .SetProperty(p => p.ConfirmedAt, DateTime.UtcNow)
                .SetProperty(p => p.PaidAt, p => p.PaidAt ?? DateTime.UtcNow));
        return count;
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
