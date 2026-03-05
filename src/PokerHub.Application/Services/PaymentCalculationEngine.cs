using PokerHub.Domain.Enums;

namespace PokerHub.Application.Services;

/// <summary>
/// Pure stateless calculation engine for tournament payment settlement.
/// No EF/infrastructure dependencies — fully unit-testable.
/// </summary>
internal static class PaymentCalculationEngine
{
    internal record PlayerBalance(Guid PlayerId, string Name, int Balance);
    internal record CalculatedPayment(Guid FromPlayerId, Guid? ToPlayerId, int Amount, bool IsJackpot, string? Description = null);

    /// <summary>
    /// Calculates the minimum set of payments to settle all balances.
    /// </summary>
    /// <param name="playerBalances">Net balance per player (positive = to receive, negative = to pay).</param>
    /// <param name="jackpotAmount">Amount to be sent to the jackpot/caixinha fund (0 if none).</param>
    /// <param name="adminPlayerId">Organizer player ID; they pay jackpot before any other match (Phase 0).</param>
    internal static List<CalculatedPayment> Calculate(
        IReadOnlyList<PlayerBalance> playerBalances,
        int jackpotAmount,
        Guid? adminPlayerId)
    {
        var debtors = playerBalances
            .Where(b => b.Balance < 0)
            .Select(b => new DebtorState(b.PlayerId, b.Name, Math.Abs(b.Balance)))
            .ToList();

        var creditors = playerBalances
            .Where(b => b.Balance > 0)
            .Select(b => new CreditorState(b.PlayerId, b.Name, b.Balance, isJackpot: false))
            .ToList();

        if (jackpotAmount > 0)
            creditors.Add(new CreditorState(null, "Caixinha", jackpotAmount, isJackpot: true));

        AdjustRoundingDifference(debtors, creditors);

        var payments = new List<CalculatedPayment>();

        ExecutePhase0AdminJackpot(debtors, creditors, adminPlayerId, payments);
        ExecutePhase1PerfectMatches(debtors, creditors, payments);
        ExecutePhase2SingleCreditorAbsorption(debtors, creditors, payments);
        ExecutePhase2bSubsetSumMatches(debtors, creditors, payments);
        ExecutePhase3GreedyMatching(debtors, creditors, payments);

        return payments;
    }

    // ── Mutable state kept in private classes to avoid re-indexing ──────────

    private sealed class DebtorState(Guid playerId, string name, int amount)
    {
        public Guid PlayerId { get; } = playerId;
        public string Name { get; } = name;
        public int Remaining { get; set; } = amount;
    }

    private sealed class CreditorState(Guid? playerId, string name, int amount, bool isJackpot)
    {
        public Guid? PlayerId { get; } = playerId;
        public string Name { get; } = name;
        public int Remaining { get; set; } = amount;
        public bool IsJackpot { get; } = isJackpot;
    }

    // ── Rounding correction ──────────────────────────────────────────────────

    private static void AdjustRoundingDifference(List<DebtorState> debtors, List<CreditorState> creditors)
    {
        var totalDebt = debtors.Sum(d => d.Remaining);
        var totalCredit = creditors.Sum(c => c.Remaining);
        var diff = totalCredit - totalDebt;

        if (diff > 0 && debtors.Count > 0)
        {
            // More credit than debt → spread excess onto the largest debtor
            debtors.OrderByDescending(d => d.Remaining).First().Remaining += diff;
        }
        else if (diff < 0 && creditors.Count > 0)
        {
            // More debt than credit → spread excess onto the largest non-jackpot creditor
            var largest = creditors.Where(c => !c.IsJackpot).OrderByDescending(c => c.Remaining).FirstOrDefault();
            if (largest != null)
                largest.Remaining += Math.Abs(diff);
        }
    }

    // ── Phase 0: Admin pays jackpot first ────────────────────────────────────

    private static void ExecutePhase0AdminJackpot(
        List<DebtorState> debtors, List<CreditorState> creditors,
        Guid? adminPlayerId, List<CalculatedPayment> payments)
    {
        if (!adminPlayerId.HasValue) return;

        var admin = debtors.FirstOrDefault(d => d.PlayerId == adminPlayerId.Value);
        if (admin == null || admin.Remaining <= 0) return;

        var caixinha = creditors.FirstOrDefault(c => c.IsJackpot);
        if (caixinha == null || caixinha.Remaining <= 0) return;

        var amount = Math.Min(admin.Remaining, caixinha.Remaining);
        payments.Add(new CalculatedPayment(adminPlayerId.Value, null, amount, IsJackpot: true, "Caixinha"));
        admin.Remaining -= amount;
        caixinha.Remaining -= amount;
    }

    // ── Phase 1: Perfect matches (debtor == creditor exactly) ────────────────

    private static void ExecutePhase1PerfectMatches(
        List<DebtorState> debtors, List<CreditorState> creditors,
        List<CalculatedPayment> payments)
    {
        foreach (var debtor in debtors.OrderBy(d => d.Remaining))
        {
            if (debtor.Remaining <= 0) continue;

            var match = creditors.FirstOrDefault(c => c.Remaining == debtor.Remaining && c.Remaining > 0);
            if (match == null) continue;

            payments.Add(new CalculatedPayment(debtor.PlayerId, match.PlayerId, debtor.Remaining,
                match.IsJackpot, match.IsJackpot ? "Caixinha" : null));
            debtor.Remaining = 0;
            match.Remaining = 0;
        }
    }

    // ── Phase 2: Single creditor can absorb entire remaining debt ────────────

    private static void ExecutePhase2SingleCreditorAbsorption(
        List<DebtorState> debtors, List<CreditorState> creditors,
        List<CalculatedPayment> payments)
    {
        foreach (var debtor in debtors.OrderByDescending(d => d.Remaining))
        {
            if (debtor.Remaining <= 0) continue;

            var best = creditors
                .Where(c => c.Remaining >= debtor.Remaining)
                .OrderBy(c => c.Remaining)
                .FirstOrDefault();

            if (best == null) continue;

            payments.Add(new CalculatedPayment(debtor.PlayerId, best.PlayerId, debtor.Remaining,
                best.IsJackpot, best.IsJackpot ? "Caixinha" : null));
            best.Remaining -= debtor.Remaining;
            debtor.Remaining = 0;
        }
    }

    // ── Phase 2b: Subset-sum exact match (one debtor, N creditors, exact total) ─
    // Eliminates splits by finding a subset of creditors that sums exactly to
    // the debtor's amount. Practical for small inputs (typically ≤ 15 creditors).

    private static void ExecutePhase2bSubsetSumMatches(
        List<DebtorState> debtors, List<CreditorState> creditors,
        List<CalculatedPayment> payments)
    {
        foreach (var debtor in debtors.OrderByDescending(d => d.Remaining))
        {
            if (debtor.Remaining <= 0) continue;

            var active = creditors.Where(c => c.Remaining > 0).ToList();
            var subset = FindExactSubset(active, debtor.Remaining);
            if (subset == null) continue;

            foreach (var creditor in subset)
            {
                payments.Add(new CalculatedPayment(debtor.PlayerId, creditor.PlayerId, creditor.Remaining,
                    creditor.IsJackpot, creditor.IsJackpot ? "Caixinha" : null));
                debtor.Remaining -= creditor.Remaining;
                creditor.Remaining = 0;
            }
        }
    }

    /// <summary>
    /// Returns a subset of <paramref name="creditors"/> whose Remaining amounts sum exactly
    /// to <paramref name="target"/>, or null if none exists.
    /// Uses recursive backtracking — safe for ≤ 20 creditors.
    /// </summary>
    private static List<CreditorState>? FindExactSubset(List<CreditorState> creditors, int target)
        => FindSubsetRecursive(creditors, 0, target, []);

    private static List<CreditorState>? FindSubsetRecursive(
        List<CreditorState> creditors, int index, int remaining, List<CreditorState> current)
    {
        if (remaining == 0) return current;
        if (index >= creditors.Count || remaining < 0) return null;

        for (var i = index; i < creditors.Count; i++)
        {
            var candidate = creditors[i];
            if (candidate.Remaining > remaining) continue; // prune: can't overshoot

            var result = FindSubsetRecursive(creditors, i + 1,
                remaining - candidate.Remaining, [.. current, candidate]);
            if (result != null) return result;
        }

        return null;
    }

    // ── Phase 3: Greedy split of remaining debts across creditors ────────────

    private static void ExecutePhase3GreedyMatching(
        List<DebtorState> debtors, List<CreditorState> creditors,
        List<CalculatedPayment> payments)
    {
        foreach (var debtor in debtors.OrderByDescending(d => d.Remaining))
        {
            if (debtor.Remaining <= 0) continue;

            foreach (var creditor in creditors.OrderByDescending(c => c.Remaining))
            {
                if (debtor.Remaining <= 0) break;
                if (creditor.Remaining <= 0) continue;

                var amount = Math.Min(debtor.Remaining, creditor.Remaining);
                payments.Add(new CalculatedPayment(debtor.PlayerId, creditor.PlayerId, amount,
                    creditor.IsJackpot, creditor.IsJackpot ? "Caixinha" : null));
                debtor.Remaining -= amount;
                creditor.Remaining -= amount;
            }
        }
    }
}
