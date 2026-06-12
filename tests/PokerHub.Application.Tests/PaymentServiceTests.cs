using Microsoft.EntityFrameworkCore;
using PokerHub.Application.Services;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Tests;

/// <summary>
/// Unit tests for PaymentService methods that are exercised via EF InMemory.
/// EF InMemory is used because the service has direct DbContext dependencies
/// and the methods under test involve only single-table reads (no SQL-specific features).
/// </summary>
public class PaymentServiceTests
{
    // ── helpers ────────────────────────────────────────────────────────────────

    private static PokerHubDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<PokerHubDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w =>
                w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new PokerHubDbContext(options);
    }

    private static (League league, Tournament tournament, Player player) SeedLeagueAndPlayer(
        PokerHubDbContext ctx,
        Guid leagueId,
        Guid tournamentId,
        Guid playerId,
        string playerName = "Player A")
    {
        var league = new League
        {
            Id = leagueId,
            Name = "Test League",
            InviteCode = "CODE",
            OrganizerId = "org-user-id",
            CreatedAt = DateTime.UtcNow
        };

        var tournament = new Tournament
        {
            Id = tournamentId,
            LeagueId = leagueId,
            Name = "Test Tournament",
            ScheduledDateTime = DateTime.UtcNow.AddDays(-1),
            BuyIn = 50m,
            StartingStack = 10000,
            CreatedAt = DateTime.UtcNow
        };

        var player = new Player
        {
            Id = playerId,
            LeagueId = leagueId,
            Name = playerName,
            CreatedAt = DateTime.UtcNow
        };

        ctx.Leagues.Add(league);
        ctx.Tournaments.Add(tournament);
        ctx.Players.Add(player);
        ctx.SaveChanges();

        return (league, tournament, player);
    }

    // ── GetPaymentByIdAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetPaymentByIdAsync_ExistingId_ReturnsPaymentDto()
    {
        var dbName = $"{nameof(GetPaymentByIdAsync_ExistingId_ReturnsPaymentDto)}_{Guid.NewGuid()}";
        await using var ctx = CreateInMemoryContext(dbName);

        var leagueId = Guid.NewGuid();
        var tournamentId = Guid.NewGuid();
        var fromPlayerId = Guid.NewGuid();
        var paymentId = Guid.NewGuid();

        SeedLeagueAndPlayer(ctx, leagueId, tournamentId, fromPlayerId, "Alice");

        ctx.Payments.Add(new Payment
        {
            Id = paymentId,
            TournamentId = tournamentId,
            FromPlayerId = fromPlayerId,
            ToPlayerId = null, // jackpot payment
            Amount = 150,
            Type = PaymentType.Jackpot,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var service = new PaymentService(ctx);
        var result = await service.GetPaymentByIdAsync(paymentId);

        Assert.NotNull(result);
        Assert.Equal(paymentId, result.Id);
        Assert.Equal(tournamentId, result.TournamentId);
        Assert.Equal(fromPlayerId, result.FromPlayerId);
        Assert.Equal(150m, result.Amount);
        Assert.Equal(PaymentStatus.Pending, result.Status);
    }

    [Fact]
    public async Task GetPaymentByIdAsync_UnknownId_ReturnsNull()
    {
        var dbName = $"{nameof(GetPaymentByIdAsync_UnknownId_ReturnsNull)}_{Guid.NewGuid()}";
        await using var ctx = CreateInMemoryContext(dbName);

        var service = new PaymentService(ctx);
        var result = await service.GetPaymentByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetPaymentByIdAsync_PlayerToPlayerPayment_ReturnsCorrectParties()
    {
        var dbName = $"{nameof(GetPaymentByIdAsync_PlayerToPlayerPayment_ReturnsCorrectParties)}_{Guid.NewGuid()}";
        await using var ctx = CreateInMemoryContext(dbName);

        var leagueId = Guid.NewGuid();
        var tournamentId = Guid.NewGuid();
        var fromPlayerId = Guid.NewGuid();
        var toPlayerId = Guid.NewGuid();
        var paymentId = Guid.NewGuid();

        SeedLeagueAndPlayer(ctx, leagueId, tournamentId, fromPlayerId, "Debtor");

        ctx.Players.Add(new Player
        {
            Id = toPlayerId,
            LeagueId = leagueId,
            Name = "Creditor",
            CreatedAt = DateTime.UtcNow
        });

        ctx.Payments.Add(new Payment
        {
            Id = paymentId,
            TournamentId = tournamentId,
            FromPlayerId = fromPlayerId,
            ToPlayerId = toPlayerId,
            Amount = 200,
            Type = PaymentType.Poker,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var service = new PaymentService(ctx);
        var result = await service.GetPaymentByIdAsync(paymentId);

        Assert.NotNull(result);
        Assert.Equal(fromPlayerId, result.FromPlayerId);
        Assert.Equal(toPlayerId, result.ToPlayerId);
        Assert.Equal(200m, result.Amount);
        Assert.False(result.IsJackpotContribution);
    }
}
