using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Tests;

public class FinancialConcurrencyTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<(Guid tournamentId, Guid a, Guid b)> SeedAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new { Name = "Organizer", Email = $"race-{Guid.NewGuid()}@test.local", Password = "TestPass!123" });
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<Auth>())!;
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();
        var league = new League { Id = Guid.NewGuid(), OrganizerId = auth.UserId, Name = "Concurrent league", InviteCode = Guid.NewGuid().ToString("N")[..8] };
        var t = new Tournament { Id = Guid.NewGuid(), LeagueId = league.Id, Name = "Concurrent tournament", BuyIn = 100, StartingStack = 1000,
            Status = TournamentStatus.InProgress, CurrentLevel = 1, RebuyValue = 50, RebuyLimitType = RebuyLimitType.Level, RebuyLimitLevel = 5 };
        var a = new Player { Id = Guid.NewGuid(), LeagueId = league.Id, Name = "A", UserId = auth.UserId };
        var b = new Player { Id = Guid.NewGuid(), LeagueId = league.Id, Name = "B" };
        db.Leagues.Add(league); db.Tournaments.Add(t); db.Players.AddRange(a,b);
        db.TournamentPlayers.AddRange(new TournamentPlayer { Id = Guid.NewGuid(), TournamentId = t.Id, PlayerId = a.Id, IsCheckedIn = true },new TournamentPlayer { Id = Guid.NewGuid(), TournamentId = t.Id, PlayerId = b.Id, IsCheckedIn = true });
        await db.SaveChangesAsync();
        return (t.Id,a.Id,b.Id);
    }
    private sealed record Auth(string UserId);

    [Fact]
    public async Task StaleTimerStatusCannotReopenFinishedTournament()
    {
        var (id, _, _) = await SeedAsync();
        using var s1 = factory.Services.CreateScope(); using var s2 = factory.Services.CreateScope();
        var first = s1.ServiceProvider.GetRequiredService<PokerHubDbContext>();
        var stale = s2.ServiceProvider.GetRequiredService<PokerHubDbContext>();
        var finish = await first.Tournaments.SingleAsync(t => t.Id == id);
        var pause = await stale.Tournaments.SingleAsync(t => t.Id == id);
        finish.Status = TournamentStatus.Finished; await first.SaveChangesAsync();
        pause.Status = TournamentStatus.Paused;
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => stale.SaveChangesAsync());
        Assert.Equal(TournamentStatus.Finished, await first.Tournaments.AsNoTracking().Where(t => t.Id == id).Select(t => t.Status).SingleAsync());
    }

    [Fact]
    public async Task ConcurrentMarkPaidCannotDowngradeConfirmedPayment()
    {
        var (id,a,b) = await SeedAsync();
        using var setup = factory.Services.CreateScope();
        var db = setup.ServiceProvider.GetRequiredService<PokerHubDbContext>();
        var payment = new Payment { Id = Guid.NewGuid(), TournamentId = id, FromPlayerId = a, ToPlayerId = b, Amount = 10, Status = PaymentStatus.Pending };
        db.Payments.Add(payment); await db.SaveChangesAsync();
        using var s1 = factory.Services.CreateScope(); using var s2 = factory.Services.CreateScope();
        var mark = s1.ServiceProvider.GetRequiredService<IPaymentService>().MarkAsPaidAsync(payment.Id,a);
        var confirm = s2.ServiceProvider.GetRequiredService<IPaymentService>().ConfirmPaymentAsync(payment.Id,b);
        await Task.WhenAll(mark,confirm);
        db.ChangeTracker.Clear();
        var saved = await db.Payments.SingleAsync(p => p.Id == payment.Id);
        Assert.Equal(PaymentStatus.Confirmed,saved.Status); Assert.NotNull(saved.PaidAt); Assert.NotNull(saved.ConfirmedAt);
    }

    [Fact]
    public async Task FinishAndRebuySerializeBeforeCalculatingPrizes()
    {
        var (id,a,b) = await SeedAsync();
        using var s1 = factory.Services.CreateScope(); using var s2 = factory.Services.CreateScope();
        var finishing = s1.ServiceProvider.GetRequiredService<ITournamentService>().FinishTournamentAsync(id,[(a,1),(b,2)]);
        var rebuying = Task.Run(async () =>
        {
            try { return await s2.ServiceProvider.GetRequiredService<ITournamentService>().AddRebuyAsync(id,b); }
            catch (PokerHub.Application.Exceptions.BusinessRuleException) { return false; }
        });
        await Task.WhenAll(finishing, rebuying);
        var finished = await finishing;
        var rebought = await rebuying;
        Assert.True(finished.Success, finished.Message);
        using var check = factory.Services.CreateScope();
        var db = check.ServiceProvider.GetRequiredService<PokerHubDbContext>();
        var tournament = await db.Tournaments.Include(t => t.Players).SingleAsync(t => t.Id == id);
        Assert.Equal(TournamentStatus.Finished,tournament.Status);
        Assert.Equal(tournament.Players.Sum(p => p.TotalInvestment(tournament)),tournament.Players.Sum(p => p.Prize));
        Assert.Equal(rebought ? 1 : 0,tournament.Players.Sum(p => p.RebuyCount));
    }
    [Fact]
    public async Task MixedAuthorizationBatchIsRejectedBeforeAnyPaymentChanges()
    {
        var first = await SeedAsync(); var second = await SeedAsync();
        using var setup = factory.Services.CreateScope();
        var db = setup.ServiceProvider.GetRequiredService<PokerHubDbContext>();
        var userId = await db.Tournaments.Where(t => t.Id == first.tournamentId).Select(t => t.League.OrganizerId).SingleAsync();
        db.TournamentDelegates.Add(new TournamentDelegate { Id = Guid.NewGuid(), TournamentId = second.tournamentId, UserId = userId, Permissions = DelegatePermissions.CheckIn, AssignedBy = userId });
        var a = new Payment { Id = Guid.NewGuid(), TournamentId = first.tournamentId, FromPlayerId = first.a, ToPlayerId = first.b, Amount = 10 };
        var b = new Payment { Id = Guid.NewGuid(), TournamentId = second.tournamentId, FromPlayerId = second.a, ToPlayerId = second.b, Amount = 10 };
        db.Payments.AddRange(a,b); await db.SaveChangesAsync();
        var payments = setup.ServiceProvider.GetRequiredService<IPaymentService>();
        await Assert.ThrowsAsync<PokerHub.Application.Exceptions.BusinessRuleException>(() => payments.BulkConfirmPaymentsAsync([a.Id,b.Id],userId));
        db.ChangeTracker.Clear();
        Assert.Equal(2,await db.Payments.CountAsync(p => (p.Id == a.Id || p.Id == b.Id) && p.Status == PaymentStatus.Pending));
    }

}
