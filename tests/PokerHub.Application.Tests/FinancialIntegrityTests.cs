using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PokerHub.Application.DTOs.Expense;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Application.Exceptions;
using PokerHub.Application.Services;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Tests;

public class FinancialIntegrityTests
{
    private static (PokerHubDbContext db, Tournament t, Player[] players) Seed(int count = 2)
    {
        var db = new PokerHubDbContext(new DbContextOptionsBuilder<PokerHubDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var league = new League { Id = Guid.NewGuid(), Name = "Liga", OrganizerId = "owner" };
        var t = new Tournament { Id = Guid.NewGuid(), LeagueId = league.Id, Name = "Torneio", BuyIn = 100,
            StartingStack = 1000, Status = TournamentStatus.InProgress, AllowCheckInUntilLevel = 4,
            CurrentLevel = 1, RebuyValue = 50, RebuyLimitType = RebuyLimitType.Level, RebuyLimitLevel = 3 };
        var players = Enumerable.Range(0, count).Select(i => new Player { Id = Guid.NewGuid(), LeagueId = league.Id, Name = $"P{i}" }).ToArray();
        db.Leagues.Add(league); db.Tournaments.Add(t); db.Players.AddRange(players);
        db.TournamentPlayers.AddRange(players.Select(p => new TournamentPlayer { Id = Guid.NewGuid(), TournamentId = t.Id, PlayerId = p.Id, IsCheckedIn = true }));
        db.SaveChanges();
        return (db, t, players);
    }
    private static TournamentService Tournaments(PokerHubDbContext db) => new(db, new JackpotService(db), new PrizeTableService(db), new PaymentService(db), NullLogger<TournamentService>.Instance);

    [Fact]
    public async Task FixedPrizes_AreAmounts_AndFinishedHistoryDoesNotChangeWithSettings()
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        t.PrizeDistributionType = PrizeDistributionType.Fixed; t.PrizeStructure = "130,50";
        (await db.Leagues.FindAsync(t.LeagueId))!.JackpotPercentage = 10;
        await db.SaveChangesAsync();
        var result = await Tournaments(db).FinishTournamentAsync(t.Id, [(p[0].Id, 1), (p[1].Id, 2)]);
        Assert.True(result.Success, result.Message);
        var amounts = await db.TournamentPlayers.OrderBy(x => x.Position).Select(x => x.Prize).ToListAsync();
        Assert.Equal(new[] { 130m, 50m }, amounts);
        Assert.Equal(20m, await db.JackpotContributions.SumAsync(x => x.Amount));
        (await db.Leagues.FindAsync(t.LeagueId))!.JackpotPercentage = 50;
        (await db.Tournaments.FindAsync(t.Id))!.PrizeStructure = "999,999";
        await db.SaveChangesAsync();
        var detail = await Tournaments(db).GetTournamentDetailAsync(t.Id);
        Assert.Equal(amounts, detail!.Prizes.Select(x => x.Amount));
    }

    [Theory]
    [InlineData("300,50")]
    [InlineData("100,50")]
    public async Task FixedPrizeMismatch_BlocksFinishWithoutChangingResults(string structure)
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        t.PrizeDistributionType = PrizeDistributionType.Fixed; t.PrizeStructure = structure; await db.SaveChangesAsync();
        var result = await Tournaments(db).FinishTournamentAsync(t.Id, [(p[0].Id, 1), (p[1].Id, 2)]);
        Assert.False(result.Success);
        Assert.Equal(TournamentStatus.InProgress, (await db.Tournaments.FindAsync(t.Id))!.Status);
        Assert.All(await db.TournamentPlayers.ToListAsync(), x => { Assert.Null(x.Position); Assert.Equal(0, x.Prize); });
    }

    [Theory]
    [InlineData("duplicate")]
    [InlineData("foreign")]
    [InlineData("negative")]
    [InlineData("mismatch")]
    public async Task InvalidCustomFinish_IsRejectedBeforeAnyMutation(string invalid)
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        var prizes = new List<PlayerPositionForPrizeDto> { new(p[0].Id, "P0", 1, 150), new(p[1].Id, "P1", 2, 50) };
        if (invalid == "duplicate") prizes[1] = prizes[1] with { Position = 1 };
        if (invalid == "foreign") prizes[1] = prizes[1] with { PlayerId = Guid.NewGuid() };
        if (invalid == "negative") prizes[1] = prizes[1] with { Prize = -50 };
        if (invalid == "mismatch") prizes[1] = prizes[1] with { Prize = 49.99m };
        var result = await Tournaments(db).FinishTournamentWithCustomPrizesAsync(t.Id, new(prizes, 0), "owner");
        Assert.False(result.Success);
        Assert.All(await db.TournamentPlayers.ToListAsync(), x => Assert.Equal(0, x.Prize));
    }

    [Fact]
    public void PercentageRounding_TinyPool_NeverCreatesNegativePrizes()
    {
        var prizes = PrizeCalculation.Allocate(0.03m, 0, [20,20,20,20,20], PrizeDistributionType.Percentage);
        Assert.Equal(0.03m, prizes.Sum(x => x.Amount));
        Assert.All(prizes, x => Assert.InRange(x.Amount, 0m, 0.01m));
    }

    [Fact]
    public void Settlement_PreservesEachPlayersCents_AndRejectsImbalance()
    {
        var winner = Guid.NewGuid(); var loser = Guid.NewGuid();
        var transfers = PaymentCalculationEngine.Calculate([new(winner, "A", 0.01m),new(loser, "B", -0.02m)], 0.01m, null);
        Assert.Equal(0.02m, transfers.Where(p => p.FromPlayerId == loser).Sum(p => p.Amount));
        Assert.Equal(0.01m, transfers.Where(p => p.ToPlayerId == winner).Sum(p => p.Amount));
        Assert.Throws<BusinessRuleException>(() => PaymentCalculationEngine.Calculate([new(winner, "A", 100),new(loser, "B", -99.99m)], 0, null));
    }

    [Fact]
    public void Settlement_LargeInputs_ConservesEveryBalance()
    {
        var random = new Random(932);
        for (var run = 0; run < 30; run++)
        {
            var balances = Enumerable.Range(0, 35).Select(i => new PaymentCalculationEngine.PlayerBalance(Guid.NewGuid(), $"P{i}", random.Next(1, 10000) / 100m)).ToList();
            balances.Add(new(Guid.NewGuid(), "Debtor", -balances.Sum(p => p.Balance) - 5.43m));
            var transfers = PaymentCalculationEngine.Calculate(balances, 5.43m, null);
            foreach (var player in balances)
                Assert.Equal(player.Balance, transfers.Where(p => p.ToPlayerId == player.PlayerId).Sum(p => p.Amount) - transfers.Where(p => p.FromPlayerId == player.PlayerId).Sum(p => p.Amount));
            Assert.Equal(5.43m, transfers.Where(p => p.IsJackpot).Sum(p => p.Amount));
        }
    }

    [Theory]
    [InlineData(PaymentStatus.Paid)]
    [InlineData(PaymentStatus.Confirmed)]
    public async Task Regeneration_PreservesMovedPaymentsAndTimestamps(PaymentStatus status)
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        t.Status = TournamentStatus.Finished;
        var payment = new Payment { Id = Guid.NewGuid(), TournamentId = t.Id, FromPlayerId = p[1].Id, ToPlayerId = p[0].Id,
            Amount = 100, Status = status, PaidAt = DateTime.UtcNow.AddMinutes(-10), ConfirmedAt = status == PaymentStatus.Confirmed ? DateTime.UtcNow : null };
        db.Payments.Add(payment); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => new PaymentService(db).CalculateAndCreatePaymentsAsync(t.Id));
        var saved = await db.Payments.SingleAsync();
        Assert.Equal(payment.Id, saved.Id); Assert.Equal(payment.PaidAt, saved.PaidAt); Assert.Equal(payment.ConfirmedAt, saved.ConfirmedAt);
    }

    [Fact]
    public async Task TinyEqualExpense_HasNoNegativeShareAndExactTotal()
    {
        var (db, t, p) = Seed(5); await using var cleanup = db;
        var result = await new TournamentExpenseService(db).CreateExpenseAsync(t.Id,
            new(p[0].Id, "Rateio", 0.03m, ExpenseSplitType.Equal, p.Select(x => new ExpenseShareInput(x.Id, 0)).ToList()));
        Assert.Equal(0.03m, result.Shares.Sum(x => x.Amount));
        Assert.All(result.Shares, x => Assert.InRange(x.Amount, 0m, 0.01m));
    }

    [Fact]
    public async Task InvalidExpenseUpdate_PreservesPreviousShares()
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        var service = new TournamentExpenseService(db);
        var expense = await service.CreateExpenseAsync(t.Id, new(p[0].Id, "Jantar", 100, ExpenseSplitType.Equal,
            p.Select(x => new ExpenseShareInput(x.Id, 0)).ToList()));
        await Assert.ThrowsAsync<BusinessRuleException>(() => service.UpdateExpenseAsync(expense.Id,
            new(p[0].Id, "Inválida", 100, ExpenseSplitType.Custom, [new(p[0].Id, 60), new(p[1].Id, 39.99m)])));
        db.ChangeTracker.Clear();
        Assert.Equal(100m, await db.TournamentExpenseShares.SumAsync(x => x.Amount));
        Assert.Equal("Jantar", (await db.TournamentExpenses.SingleAsync()).Description);
    }

    [Fact]
    public async Task AttendanceAndTerminalGuards_ProtectRankingAndResults()
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        var absent = await db.TournamentPlayers.SingleAsync(x => x.PlayerId == p[1].Id); absent.IsCheckedIn = false;
        t.Status = TournamentStatus.Finished; await db.SaveChangesAsync();
        var ranking = await new RankingService(db).GetLeagueRankingAsync(t.LeagueId);
        Assert.Single(ranking); Assert.Equal(p[0].Id, ranking[0].PlayerId);
        await Assert.ThrowsAsync<BusinessRuleException>(() => Tournaments(db).AddRebuyAsync(t.Id, p[0].Id));
        await Assert.ThrowsAsync<BusinessRuleException>(() => Tournaments(db).CheckInPlayerAsync(t.Id, p[1].Id));
        await Assert.ThrowsAsync<BusinessRuleException>(() => Tournaments(db).SetAddonAsync(t.Id, p[0].Id, true));
    }
    [Fact]
    public async Task PendingSettlementProtectsExpensesFromBecomingStale()
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        var service = new TournamentExpenseService(db);
        var dto = new CreateExpenseDto(p[0].Id, "Jantar", 100, ExpenseSplitType.Equal,
            p.Select(x => new ExpenseShareInput(x.Id, 0)).ToList());
        var expense = await service.CreateExpenseAsync(t.Id, dto);
        db.Payments.Add(new Payment { Id = Guid.NewGuid(), TournamentId = t.Id, FromPlayerId = p[1].Id, ToPlayerId = p[0].Id, Amount = 50, Status = PaymentStatus.Pending });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => service.UpdateExpenseAsync(expense.Id, dto with { TotalAmount = 200 }));
        await Assert.ThrowsAsync<BusinessRuleException>(() => service.DeleteExpenseAsync(expense.Id));
        await Assert.ThrowsAsync<BusinessRuleException>(() => service.CreateExpenseAsync(t.Id, dto));
        Assert.Equal(100m, (await db.TournamentExpenses.SingleAsync()).TotalAmount);
    }

    [Fact]
    public async Task ClosedCheckInAndRebuyWindowsAreEnforcedByService()
    {
        var (db, t, p) = Seed(); await using var cleanup = db;
        t.CurrentLevel = 5;
        var player = await db.TournamentPlayers.SingleAsync(x => x.PlayerId == p[1].Id);
        player.IsCheckedIn = false; await db.SaveChangesAsync();
        await Assert.ThrowsAsync<BusinessRuleException>(() => Tournaments(db).CheckInPlayerAsync(t.Id, p[1].Id));
        await Assert.ThrowsAsync<BusinessRuleException>(() => Tournaments(db).BulkCheckInAsync(t.Id, [p[1].Id]));
        await Assert.ThrowsAsync<BusinessRuleException>(() => Tournaments(db).AddRebuyAsync(t.Id, p[0].Id));
        Assert.False(await db.TournamentPlayers.Where(x => x.PlayerId == p[1].Id).Select(x => x.IsCheckedIn).SingleAsync());
        Assert.Equal(0, await db.TournamentPlayers.SumAsync(x => x.RebuyCount));
    }

}
