using PokerHub.Application.Services;

namespace PokerHub.Application.Tests;

/// <summary>
/// Unit tests for PaymentCalculationEngine.
///
/// Reference scenario (from manual calculation image):
///   Players (net balance after prize distribution):
///     Diego      +570  (invested 60, prize 630)
///     Thiago     +170  (invested 120, prize 290)
///     Guilherme  +130  (invested 360, prize 490)
///     Antonio    -120  (invested 120, prize 0)
///     Edu        -180  (invested 180, prize 0)
///     Marco      -300  (invested 300, prize 0)
///     Schott     -420  (invested 420, prize 0)
///   Caixinha: 150 (totalInvestments 1560 - totalPrizes 1410)
///
///   Expected settlement (manual):
///     DIEGO     receives 570  (150 from Marco + 420 from Schott)
///     THIAGO    receives 170  (150 from Marco + 20 from Antonio)
///     GUILHERME receives 130  (100 from Antonio + 30 from Edu)
///     CAIXINHA  receives 150  (150 from Edu)
/// </summary>
public class PaymentCalculationEngineTests
{
    // Player IDs for the reference scenario
    private static readonly Guid DiegoId = Guid.Parse("00000001-0000-0000-0000-000000000000");
    private static readonly Guid ThiagoId = Guid.Parse("00000002-0000-0000-0000-000000000000");
    private static readonly Guid GuilhermeId = Guid.Parse("00000003-0000-0000-0000-000000000000");
    private static readonly Guid AntonioId = Guid.Parse("00000004-0000-0000-0000-000000000000");
    private static readonly Guid EduId = Guid.Parse("00000005-0000-0000-0000-000000000000");
    private static readonly Guid MarcoId = Guid.Parse("00000006-0000-0000-0000-000000000000");
    private static readonly Guid SchottId = Guid.Parse("00000007-0000-0000-0000-000000000000");

    private static readonly IReadOnlyList<PaymentCalculationEngine.PlayerBalance> ReferenceBalances =
    [
        new(DiegoId,     "Diego",    570),
        new(ThiagoId,    "Thiago",   170),
        new(GuilhermeId, "Guilherme", 130),
        new(AntonioId,   "Antonio", -120),
        new(EduId,       "Edu",     -180),
        new(MarcoId,     "Marco",   -300),
        new(SchottId,    "Schott",  -420),
    ];

    // ── Creditor totals ──────────────────────────────────────────────────────

    [Fact]
    public void Calculate_ReferenceScenario_DiegoReceivesCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(570, results.Where(p => p.ToPlayerId == DiegoId).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_ReferenceScenario_ThiagoReceivesCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(170, results.Where(p => p.ToPlayerId == ThiagoId).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_ReferenceScenario_GuilhermeReceivesCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(130, results.Where(p => p.ToPlayerId == GuilhermeId).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_ReferenceScenario_CaixinhaReceivesCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(150, results.Where(p => p.IsJackpot).Sum(p => p.Amount));
    }

    // ── Debtor totals ────────────────────────────────────────────────────────

    [Fact]
    public void Calculate_ReferenceScenario_AntonioPaysCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(120, results.Where(p => p.FromPlayerId == AntonioId).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_ReferenceScenario_EduPaysCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(180, results.Where(p => p.FromPlayerId == EduId).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_ReferenceScenario_MarcoPaysCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(300, results.Where(p => p.FromPlayerId == MarcoId).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_ReferenceScenario_SchottPaysCorrectTotal()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.Equal(420, results.Where(p => p.FromPlayerId == SchottId).Sum(p => p.Amount));
    }

    // ── All-in-one assertion ─────────────────────────────────────────────────

    [Fact]
    public void Calculate_ReferenceScenario_AllTotalsCorrect()
    {
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);

        // Each creditor receives their full balance
        Assert.Equal(570, results.Where(p => p.ToPlayerId == DiegoId).Sum(p => p.Amount));
        Assert.Equal(170, results.Where(p => p.ToPlayerId == ThiagoId).Sum(p => p.Amount));
        Assert.Equal(130, results.Where(p => p.ToPlayerId == GuilhermeId).Sum(p => p.Amount));
        Assert.Equal(150, results.Where(p => p.IsJackpot).Sum(p => p.Amount));

        // Each debtor pays their full debt
        Assert.Equal(120, results.Where(p => p.FromPlayerId == AntonioId).Sum(p => p.Amount));
        Assert.Equal(180, results.Where(p => p.FromPlayerId == EduId).Sum(p => p.Amount));
        Assert.Equal(300, results.Where(p => p.FromPlayerId == MarcoId).Sum(p => p.Amount));
        Assert.Equal(420, results.Where(p => p.FromPlayerId == SchottId).Sum(p => p.Amount));
    }

    // ── Edge cases ───────────────────────────────────────────────────────────

    [Fact]
    public void Calculate_NoCaixinha_NoJackpotPaymentGenerated()
    {
        // Tournament where 100% of prize pool is distributed (no jackpot)
        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        var balances = new List<PaymentCalculationEngine.PlayerBalance>
        {
            new(p1, "Winner", 100),
            new(p2, "Loser", -100),
        };

        var results = PaymentCalculationEngine.Calculate(balances, jackpotAmount: 0, adminPlayerId: null);

        Assert.DoesNotContain(results, r => r.IsJackpot);
        Assert.Single(results);
        Assert.Equal(100, results[0].Amount);
        Assert.Equal(p2, results[0].FromPlayerId);
        Assert.Equal(p1, results[0].ToPlayerId);
    }

    [Fact]
    public void Calculate_PerfectMatch_ProducesOneSinglePayment()
    {
        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        var balances = new List<PaymentCalculationEngine.PlayerBalance>
        {
            new(p1, "Winner", 200),
            new(p2, "Loser", -200),
        };

        var results = PaymentCalculationEngine.Calculate(balances, jackpotAmount: 0, adminPlayerId: null);

        Assert.Single(results);
        Assert.Equal(200, results[0].Amount);
    }

    [Fact]
    public void Calculate_TwoDebtorsOneCreditor_BothDebtorsPay()
    {
        var creditor = Guid.NewGuid();
        var d1 = Guid.NewGuid();
        var d2 = Guid.NewGuid();
        var balances = new List<PaymentCalculationEngine.PlayerBalance>
        {
            new(creditor, "Creditor", 300),
            new(d1, "Debtor1", -100),
            new(d2, "Debtor2", -200),
        };

        var results = PaymentCalculationEngine.Calculate(balances, jackpotAmount: 0, adminPlayerId: null);

        Assert.Equal(100, results.Where(p => p.FromPlayerId == d1).Sum(p => p.Amount));
        Assert.Equal(200, results.Where(p => p.FromPlayerId == d2).Sum(p => p.Amount));
        Assert.Equal(300, results.Where(p => p.ToPlayerId == creditor).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_AdminIsDebtor_PaysJackpotFirst()
    {
        var admin = Guid.NewGuid();
        var player = Guid.NewGuid();
        // Admin owes 250; jackpot needs 100; player needs 150
        var balances = new List<PaymentCalculationEngine.PlayerBalance>
        {
            new(player, "Winner", 150),
            new(admin, "Admin", -250),
        };

        var results = PaymentCalculationEngine.Calculate(balances, jackpotAmount: 100, adminPlayerId: admin);

        // Admin should pay jackpot first
        var jackpotPayment = results.FirstOrDefault(p => p.IsJackpot);
        Assert.NotNull(jackpotPayment);
        Assert.Equal(admin, jackpotPayment!.FromPlayerId);
        Assert.Equal(100, jackpotPayment.Amount);

        // Then admin pays remaining 150 to winner
        Assert.Equal(150, results.Where(p => p.FromPlayerId == admin && !p.IsJackpot).Sum(p => p.Amount));
        Assert.Equal(150, results.Where(p => p.ToPlayerId == player).Sum(p => p.Amount));
    }

    [Fact]
    public void Calculate_EmptyInput_ReturnsEmpty()
    {
        var results = PaymentCalculationEngine.Calculate([], jackpotAmount: 0, adminPlayerId: null);
        Assert.Empty(results);
    }

    [Fact]
    public void Calculate_OnlyCaixinha_AllDebtorsPay()
    {
        // No player prize winners; all money goes to caixinha
        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        var balances = new List<PaymentCalculationEngine.PlayerBalance>
        {
            new(p1, "P1", -60),
            new(p2, "P2", -90),
        };

        var results = PaymentCalculationEngine.Calculate(balances, jackpotAmount: 150, adminPlayerId: null);

        Assert.All(results, r => Assert.True(r.IsJackpot));
        Assert.Equal(150, results.Sum(p => p.Amount));
    }

    // ── Optimization: transaction count ─────────────────────────────────────

    [Fact]
    public void Calculate_ReferenceScenario_ProducesAtMost6Transactions()
    {
        // Optimal: Marco(300)→Thiago(170)+Guilherme(130)  [Phase 2b subset-sum]
        //          Edu(180)→Caixinha(150)+Diego(30)         [Phase 2b subset-sum]
        //          Schott(420)→Diego(420)                   [Phase 2]
        //          Antonio(120)→Diego(120)                  [Phase 2]
        //          = 6 transactions total
        var results = PaymentCalculationEngine.Calculate(ReferenceBalances, jackpotAmount: 150, adminPlayerId: null);
        Assert.True(results.Count <= 6, $"Expected ≤6 transactions but got {results.Count}: " +
            string.Join(", ", results.Select(r => $"{r.FromPlayerId}→{r.ToPlayerId}:{r.Amount}")));
    }

    [Fact]
    public void Calculate_RoundingScenario_TotalsStillBalance()
    {
        // Scenario where prize percentages cause rounding (e.g., 3 players, 70/30 split)
        // Investments: 3 × 60 = 180; prizes rounded: 126 + 54 = 180
        var winner = Guid.NewGuid();
        var second = Guid.NewGuid();
        var loser = Guid.NewGuid();
        var balances = new List<PaymentCalculationEngine.PlayerBalance>
        {
            new(winner, "Winner", 66),   // prize 126 - invested 60
            new(second, "Second", -6),   // prize 54 - invested 60
            new(loser, "Loser", -60),    // prize 0 - invested 60
        };

        var results = PaymentCalculationEngine.Calculate(balances, jackpotAmount: 0, adminPlayerId: null);

        var totalPaid = results.Sum(p => p.Amount);
        var totalReceived = results.Where(p => p.ToPlayerId == winner).Sum(p => p.Amount);
        Assert.Equal(totalPaid, totalReceived); // all payments go to winner
        Assert.Equal(66, totalReceived);
    }
}
