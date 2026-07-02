using PokerHub.Application.Services;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;

namespace PokerHub.Application.Tests;

/// <summary>
/// Tests for PaymentService.NetOpposingPayments — the final netting phase that collapses
/// opposing transfers between the same pair of players into a single net direction.
/// </summary>
public class NetOpposingPaymentsTests
{
    private static readonly Guid PlayerA = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid PlayerB = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid PlayerC = Guid.Parse("cccccccc-0000-0000-0000-000000000003");

    private static Payment Make(Guid from, Guid? to, decimal amount, PaymentType type = PaymentType.Poker)
        => new()
        {
            Id = Guid.NewGuid(),
            TournamentId = Guid.NewGuid(),
            FromPlayerId = from,
            ToPlayerId = to,
            Amount = amount,
            Type = type,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

    [Fact]
    public void OpposingPair_CancelsSmallerAndReducesLarger()
    {
        // Guilherme deve 43 (despesa) a Thiago; Thiago deve 6 (despesa) a Guilherme.
        var big = Make(PlayerA, PlayerB, 43, PaymentType.Expense);
        var small = Make(PlayerB, PlayerA, 6, PaymentType.Expense);
        var payments = new List<Payment> { big, small };

        PaymentService.NetOpposingPayments(payments);

        var survivor = Assert.Single(payments);
        Assert.Same(big, survivor);
        Assert.Equal(37, survivor.Amount);
        Assert.Equal(PaymentType.Expense, survivor.Type);
    }

    [Fact]
    public void OpposingPair_DifferentTypes_PreservesTypeOfSurvivor()
    {
        var poker = Make(PlayerA, PlayerB, 100, PaymentType.Poker);
        var expense = Make(PlayerB, PlayerA, 30, PaymentType.Expense);
        var payments = new List<Payment> { poker, expense };

        PaymentService.NetOpposingPayments(payments);

        var survivor = Assert.Single(payments);
        Assert.Equal(PaymentType.Poker, survivor.Type);
        Assert.Equal(70, survivor.Amount);
    }

    [Fact]
    public void OpposingPair_EqualTotals_RemovesBoth()
    {
        var payments = new List<Payment>
        {
            Make(PlayerA, PlayerB, 50),
            Make(PlayerB, PlayerA, 50, PaymentType.Expense)
        };

        PaymentService.NetOpposingPayments(payments);

        Assert.Empty(payments);
    }

    [Fact]
    public void MultiplePaymentsPerDirection_ReducesSmallestFirstAndRemovesZeroed()
    {
        // A→B: 100 (poker) + 10 (despesa) = 110; B→A: 25 → sobra 85 no lado maior.
        var poker = Make(PlayerA, PlayerB, 100, PaymentType.Poker);
        var expense = Make(PlayerA, PlayerB, 10, PaymentType.Expense);
        var reverse = Make(PlayerB, PlayerA, 25, PaymentType.Expense);
        var payments = new List<Payment> { poker, expense, reverse };

        PaymentService.NetOpposingPayments(payments);

        // Abate primeiro o menor (10 → zera e sai); resto (15) abate do poker.
        var survivor = Assert.Single(payments);
        Assert.Same(poker, survivor);
        Assert.Equal(85, survivor.Amount);
    }

    [Fact]
    public void NoReverseDirection_LeavesPaymentsUntouched()
    {
        var payments = new List<Payment>
        {
            Make(PlayerA, PlayerB, 40),
            Make(PlayerC, PlayerB, 60)
        };

        PaymentService.NetOpposingPayments(payments);

        Assert.Equal(2, payments.Count);
        Assert.Equal(40, payments[0].Amount);
        Assert.Equal(60, payments[1].Amount);
    }

    [Fact]
    public void JackpotPayments_NeverParticipateInNetting()
    {
        var jackpot = Make(PlayerA, null, 60, PaymentType.Jackpot);
        var poker = Make(PlayerA, PlayerB, 30);
        var payments = new List<Payment> { jackpot, poker };

        PaymentService.NetOpposingPayments(payments);

        Assert.Equal(2, payments.Count);
        Assert.Contains(jackpot, payments);
        Assert.Equal(60, jackpot.Amount);
    }

    [Fact]
    public void MultiplePairs_EachNetsIndependently()
    {
        var ab = Make(PlayerA, PlayerB, 100);
        var ba = Make(PlayerB, PlayerA, 40, PaymentType.Expense);
        var ac = Make(PlayerA, PlayerC, 20);
        var ca = Make(PlayerC, PlayerA, 20, PaymentType.Expense);
        var payments = new List<Payment> { ab, ba, ac, ca };

        PaymentService.NetOpposingPayments(payments);

        var survivor = Assert.Single(payments);
        Assert.Same(ab, survivor);
        Assert.Equal(60, survivor.Amount);
    }
}
