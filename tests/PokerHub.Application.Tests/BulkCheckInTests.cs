using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PokerHub.Application.Services;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Tests;

/// <summary>
/// Regressão do check-in em lote: gravar só o <c>CheckedInAt</c> deixava o jogador em
/// "meio check-in" — fora do prize pool, das despesas e da caixinha (que leem
/// <c>IsCheckedIn</c>), e com o toggle da SPA mostrando "Check-in" em vez de
/// "Confirmado", o que impedia desfazer o check-in.
/// </summary>
public class BulkCheckInTests
{
    private static PokerHubDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<PokerHubDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w =>
                w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new PokerHubDbContext(options);
    }

    private static TournamentService CreateService(PokerHubDbContext ctx) =>
        new(
            ctx,
            new JackpotService(ctx),
            new PrizeTableService(ctx),
            new PaymentService(ctx),
            NullLogger<TournamentService>.Instance);

    /// <summary>Liga + torneio agendado com jogadores inscritos e sem check-in.</summary>
    private static (Guid tournamentId, List<Guid> playerIds) SeedTournament(
        PokerHubDbContext ctx,
        int players = 3)
    {
        var leagueId = Guid.NewGuid();
        var tournamentId = Guid.NewGuid();

        ctx.Leagues.Add(new League
        {
            Id = leagueId,
            Name = "Liga Bulk",
            InviteCode = "LIGABULK",
            OrganizerId = "org-user-id",
            JackpotPercentage = 0,
            CreatedAt = DateTime.UtcNow
        });

        ctx.Tournaments.Add(new Tournament
        {
            Id = tournamentId,
            LeagueId = leagueId,
            Name = "Torneio Bulk",
            ScheduledDateTime = DateTime.UtcNow.AddHours(1),
            BuyIn = 60m,
            StartingStack = 10000,
            InviteCode = "BULKCODE",
            Status = TournamentStatus.Scheduled,
            CreatedAt = DateTime.UtcNow
        });

        var playerIds = new List<Guid>();
        for (var i = 0; i < players; i++)
        {
            var playerId = Guid.NewGuid();
            playerIds.Add(playerId);

            ctx.Players.Add(new Player
            {
                Id = playerId,
                LeagueId = leagueId,
                Name = $"Player {i + 1}",
                CreatedAt = DateTime.UtcNow
            });
            ctx.TournamentPlayers.Add(new TournamentPlayer
            {
                Id = Guid.NewGuid(),
                TournamentId = tournamentId,
                PlayerId = playerId,
                IsCheckedIn = false,
                CheckedInAt = null
            });
        }

        ctx.SaveChanges();
        return (tournamentId, playerIds);
    }

    [Fact]
    public async Task BulkCheckInAsync_MarcaIsCheckedIn_ENaoSoOCheckedInAt()
    {
        await using var ctx = CreateInMemoryContext($"{nameof(BulkCheckInAsync_MarcaIsCheckedIn_ENaoSoOCheckedInAt)}_{Guid.NewGuid()}");
        var (tournamentId, playerIds) = SeedTournament(ctx);

        var count = await CreateService(ctx).BulkCheckInAsync(tournamentId, playerIds);

        Assert.Equal(playerIds.Count, count);

        var rows = await ctx.TournamentPlayers
            .Where(tp => tp.TournamentId == tournamentId)
            .ToListAsync();

        Assert.All(rows, tp => Assert.True(tp.IsCheckedIn));
        Assert.All(rows, tp => Assert.NotNull(tp.CheckedInAt));
    }

    [Fact]
    public async Task BulkCheckInAsync_NaoRecontaQuemJaEstaConfirmado()
    {
        await using var ctx = CreateInMemoryContext($"{nameof(BulkCheckInAsync_NaoRecontaQuemJaEstaConfirmado)}_{Guid.NewGuid()}");
        var (tournamentId, playerIds) = SeedTournament(ctx);

        var service = CreateService(ctx);
        await service.BulkCheckInAsync(tournamentId, playerIds);

        var count = await service.BulkCheckInAsync(tournamentId, playerIds);

        Assert.Equal(0, count);
    }

    [Fact]
    public async Task BulkCheckInAsync_ReparaRegistroComCheckedInAtSemFlag()
    {
        await using var ctx = CreateInMemoryContext($"{nameof(BulkCheckInAsync_ReparaRegistroComCheckedInAtSemFlag)}_{Guid.NewGuid()}");
        var (tournamentId, playerIds) = SeedTournament(ctx, players: 1);

        // Estado deixado pelo bug: data preenchida, flag falsa.
        var legado = await ctx.TournamentPlayers.SingleAsync(tp => tp.TournamentId == tournamentId);
        legado.CheckedInAt = DateTime.UtcNow.AddMinutes(-30);
        legado.IsCheckedIn = false;
        await ctx.SaveChangesAsync();

        var count = await CreateService(ctx).BulkCheckInAsync(tournamentId, playerIds);

        Assert.Equal(1, count);
        Assert.True((await ctx.TournamentPlayers.SingleAsync(tp => tp.TournamentId == tournamentId)).IsCheckedIn);
    }
}
