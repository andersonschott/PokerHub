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
                .ThenInclude(t => t.League)
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
                .ThenInclude(t => t.League)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsByPlayerAsync(Guid playerId)
    {
        // Includes jackpot/caixinha (ToPlayerId == null). Status explicit so only truly
        // unclosed payments appear (Confirmed payments must disappear immediately).
        return await _context.Payments
            .Where(p => p.FromPlayerId == playerId
                     && (p.Status == PaymentStatus.Pending || p.Status == PaymentStatus.Paid))
            .Include(p => p.Tournament)
            .Include(p => p.ToPlayer)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PendingDebtDto(
                p.Id,
                p.TournamentId,
                p.Tournament.Name,
                p.Tournament.ScheduledDateTime,
                p.FromPlayerId,
                p.ToPlayerId ?? Guid.Empty,
                p.ToPlayer != null ? p.ToPlayer.Name : "Caixinha",
                p.ToPlayer != null ? p.ToPlayer.PixKey : p.Tournament.League.JackpotPixKey,
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
            .Where(p => p.ToPlayerId == playerId
                     && (p.Status == PaymentStatus.Pending || p.Status == PaymentStatus.Paid))
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
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

        var jackpotAmount = await ResolveJackpotAmountAsync(tournament, tournamentId);

        var playerBalances = tournament.Players
            .Where(tp => tp.IsCheckedIn)
            .Select(tp => new PaymentCalculationEngine.PlayerBalance(
                tp.PlayerId,
                tp.Player.Name,
                FinancialMath.FinancialRound(tp.Prize - tp.TotalInvestment(tournament))))
            .ToList();

        Guid? adminPlayerId = tournament.League.Players
            .FirstOrDefault(p => p.UserId == tournament.League.OrganizerId && p.IsActive)?.Id;

        var calculated = PaymentCalculationEngine.Calculate(playerBalances, jackpotAmount, adminPlayerId);

        var payments = calculated.Select(cp => CreatePayment(
            tournamentId,
            cp.FromPlayerId,
            cp.ToPlayerId,
            cp.Amount,
            cp.IsJackpot ? PaymentType.Jackpot : PaymentType.Poker,
            cp.Description)).ToList();

        await AddExpensePaymentsAsync(payments, tournamentId);

        NetOpposingPayments(payments);

        _context.Payments.AddRange(payments);

        await UpsertJackpotContributionAsync(tournament, jackpotAmount);

        await _context.SaveChangesAsync();

        var createdPayments = await _context.Payments
            .Where(p => p.TournamentId == tournamentId)
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .ToListAsync();

        return createdPayments.Select(p => MapToDto(p)).ToList();
    }

    /// <summary>
    /// Returns the jackpot/caixinha amount for the tournament.
    /// Uses the stored JackpotContribution if it exists; otherwise derives it from
    /// the difference between total investments and total prizes distributed.
    /// </summary>
    private async Task<int> ResolveJackpotAmountAsync(Tournament tournament, Guid tournamentId)
    {
        var jackpotContribution = await _context.JackpotContributions
            .FirstOrDefaultAsync(j => j.TournamentId == tournamentId);

        if (jackpotContribution?.Amount > 0)
            return FinancialMath.FinancialRound(jackpotContribution.Amount);

        // No stored record: derive from prize pool gap
        var checkedIn = tournament.Players.Where(tp => tp.IsCheckedIn).ToList();
        var totalInvestments = checkedIn.Sum(tp => tp.TotalInvestment(tournament));
        var totalPrizes = checkedIn.Sum(tp => tp.Prize);
        var gap = totalInvestments - totalPrizes;
        return gap > 0 ? FinancialMath.FinancialRound(gap) : 0;
    }

    /// <summary>
    /// Upserts the JackpotContribution row for this tournament using the same integer (cents)
    /// value the engine used, so the caixinha extract sum matches the Jackpot Payment rows exactly.
    /// If jackpotAmount is 0, removes any existing contribution for the tournament.
    /// </summary>
    private async Task UpsertJackpotContributionAsync(Tournament tournament, int jackpotAmount)
    {
        var existing = await _context.JackpotContributions
            .FirstOrDefaultAsync(j => j.TournamentId == tournament.Id);

        if (jackpotAmount <= 0)
        {
            if (existing != null)
                _context.JackpotContributions.Remove(existing);
            return;
        }

        var checkedIn = tournament.Players.Where(tp => tp.IsCheckedIn).ToList();
        var buyIns = checkedIn.Count * tournament.BuyIn;
        var rebuys = checkedIn.Sum(p => p.RebuyCount) * (tournament.RebuyValue ?? 0);
        var addons = checkedIn.Count(p => p.HasAddon) * (tournament.AddonValue ?? 0);
        var prizePool = buyIns + rebuys + addons;

        decimal amountDecimal = jackpotAmount;
        decimal percentage = prizePool > 0 ? (amountDecimal / prizePool) * 100 : 0;

        if (existing != null)
        {
            existing.Amount = amountDecimal;
            existing.TournamentPrizePool = prizePool;
            existing.PercentageApplied = percentage;
        }
        else
        {
            _context.JackpotContributions.Add(new JackpotContribution
            {
                Id = Guid.NewGuid(),
                LeagueId = tournament.LeagueId,
                TournamentId = tournament.Id,
                Amount = amountDecimal,
                TournamentPrizePool = prizePool,
                PercentageApplied = percentage,
                CreatedAt = DateTime.UtcNow
            });
        }
    }

    private async Task AddExpensePaymentsAsync(List<Payment> payments, Guid tournamentId)
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
                    // Despesa rateada mantém os centavos: R$ 173 / 5 = R$ 34,60 por pessoa.
                    // Arredondar para inteiro (como no settlement de poker) cobrava R$ 35.
                    var amount = FinancialMath.RoundCents(share.Amount);
                    if (amount > 0)
                    {
                        payments.Add(CreatePayment(tournamentId, share.PlayerId,
                            expense.PaidByPlayerId, amount, PaymentType.Expense,
                            expense.Description, expense.Id));
                    }
                }
            }
        }
    }

    /// <summary>
    /// Nets opposing payments between the same pair of players (A→B and B→A), so only a
    /// single net direction remains. The smaller direction is cancelled entirely and its
    /// total is subtracted from the larger direction's payments (smallest first), removing
    /// any payment that reaches zero. Types are preserved on the surviving payments.
    /// Jackpot payments (ToPlayerId == null) never participate — the caixinha never owes back.
    /// </summary>
    internal static void NetOpposingPayments(List<Payment> payments)
    {
        var pairGroups = payments
            .Where(p => p.ToPlayerId != null)
            .GroupBy(p => p.FromPlayerId.CompareTo(p.ToPlayerId!.Value) < 0
                ? (Low: p.FromPlayerId, High: p.ToPlayerId!.Value)
                : (Low: p.ToPlayerId!.Value, High: p.FromPlayerId))
            .ToList();

        foreach (var group in pairGroups)
        {
            var forward = group.Where(p => p.FromPlayerId == group.Key.Low).ToList();
            var reverse = group.Where(p => p.FromPlayerId == group.Key.High).ToList();
            if (forward.Count == 0 || reverse.Count == 0) continue;

            var forwardTotal = forward.Sum(p => p.Amount);
            var reverseTotal = reverse.Sum(p => p.Amount);

            var (smaller, larger) = forwardTotal <= reverseTotal ? (forward, reverse) : (reverse, forward);
            var offset = Math.Min(forwardTotal, reverseTotal);

            foreach (var cancelled in smaller)
                payments.Remove(cancelled);

            foreach (var payment in larger.OrderBy(p => p.Amount))
            {
                if (offset <= 0) break;
                var cut = Math.Min(payment.Amount, offset);
                payment.Amount -= cut;
                offset -= cut;
                if (payment.Amount == 0)
                    payments.Remove(payment);
            }
        }
    }

    private static Payment CreatePayment(Guid tournamentId, Guid fromPlayerId, Guid? toPlayerId, decimal amount, PaymentType type, string? description = null, Guid? expenseId = null)
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

    public async Task<(bool Success, string Message)> AdminMarkAsPaidAsync(Guid paymentId, string userId)
    {
        var payment = await _context.Payments
            .Include(p => p.Tournament)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return (false, "Pagamento não encontrado.");

        var hasPermission = await HasPaymentManagementPermissionAsync(payment.TournamentId, userId);
        if (!hasPermission)
            return (false, "Sem permissão para gerenciar este pagamento.");

        if (payment.Status != PaymentStatus.Pending)
            return (false, "Pagamento não está pendente.");

        payment.MarkAsPaid();
        await _context.SaveChangesAsync();
        return (true, "Pagamento marcado como pago.");
    }

    public async Task<(bool Success, string Message)> AdminConfirmPaymentAsync(Guid paymentId, string userId)
    {
        var payment = await _context.Payments
            .Include(p => p.Tournament)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return (false, "Pagamento não encontrado.");

        var hasPermission = await HasPaymentManagementPermissionAsync(payment.TournamentId, userId);
        if (!hasPermission)
            return (false, "Sem permissão para gerenciar este pagamento.");

        if (payment.Status == PaymentStatus.Confirmed)
            return (false, "Pagamento já está confirmado.");

        payment.Confirm();
        await _context.SaveChangesAsync();
        return (true, "Pagamento confirmado com sucesso.");
    }

    private async Task<bool> HasPaymentManagementPermissionAsync(Guid tournamentId, string userId)
    {
        // Use SQL comparison (case-insensitive) to avoid C# string comparison issues
        var isOrganizer = await _context.Leagues
            .AnyAsync(l => l.Tournaments.Any(t => t.Id == tournamentId) && l.OrganizerId == userId);
        if (isOrganizer) return true;

        var isDelegate = await _context.TournamentDelegates
            .AnyAsync(td => td.TournamentId == tournamentId && td.UserId == userId);
        return isDelegate;
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

    public async Task<PaymentDto?> GetPaymentByIdAsync(Guid paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Tournament)
                .ThenInclude(t => t.League)
            .Include(p => p.FromPlayer)
            .Include(p => p.ToPlayer)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        return payment is null ? null : MapToDto(payment);
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
            isJackpot ? p.Tournament.League?.JackpotPixKey : p.ToPlayer!.PixKey,
            isJackpot ? p.Tournament.League?.JackpotPixKeyType : p.ToPlayer!.PixKeyType,
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
