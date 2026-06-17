using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PokerHub.Application.Services;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Tests;

/// <summary>
/// Cobre o cálculo de prêmios por posição exposto no <c>TournamentDetailDto.Prizes</c>
/// (Passo 2 / Parte A). Garante que a engine ÚNICA de premiação (a mesma da finalização)
/// é reusada nos DOIS modos — estrutura custom "50,30,20" e tabela da liga — e nos DOIS
/// métodos que produzem o detalhe (GetTournamentDetailAsync e GetTournamentByInviteCodeAsync).
/// </summary>
public class TournamentServiceTests
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

    /// <summary>
    /// Cria uma liga + torneio com <paramref name="checkedInPlayers"/> jogadores com check-in,
    /// cada um com buy-in <paramref name="buyIn"/>. Prize pool resultante = checkedIn × buyIn.
    /// </summary>
    private static (Guid leagueId, Guid tournamentId, string inviteCode) SeedTournament(
        PokerHubDbContext ctx,
        string? prizeStructure,
        bool usePrizeTable,
        int checkedInPlayers = 4,
        decimal buyIn = 50m,
        string inviteCode = "TVCODE01")
    {
        var leagueId = Guid.NewGuid();
        var tournamentId = Guid.NewGuid();

        ctx.Leagues.Add(new League
        {
            Id = leagueId,
            Name = "Liga TV",
            InviteCode = "LIGATV",
            OrganizerId = "org-user-id",
            JackpotPercentage = 0,
            CreatedAt = DateTime.UtcNow
        });

        ctx.Tournaments.Add(new Tournament
        {
            Id = tournamentId,
            LeagueId = leagueId,
            Name = "Torneio TV",
            ScheduledDateTime = DateTime.UtcNow.AddHours(-1),
            BuyIn = buyIn,
            StartingStack = 10000,
            PrizeStructure = prizeStructure,
            UsePrizeTable = usePrizeTable,
            InviteCode = inviteCode,
            Status = TournamentStatus.InProgress,
            CurrentLevel = 1,
            CreatedAt = DateTime.UtcNow
        });

        for (var i = 0; i < checkedInPlayers; i++)
        {
            var playerId = Guid.NewGuid();
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
                IsCheckedIn = true,
                CheckedInAt = DateTime.UtcNow
            });
        }

        ctx.SaveChanges();
        return (leagueId, tournamentId, inviteCode);
    }

    // ── Modo custom ("50,30,20") ────────────────────────────────────────────────

    [Fact]
    public async Task GetTournamentDetailAsync_CustomPrizeStructure_ReturnsPercentageBasedPrizes()
    {
        var dbName = $"{nameof(GetTournamentDetailAsync_CustomPrizeStructure_ReturnsPercentageBasedPrizes)}_{Guid.NewGuid()}";
        await using var ctx = CreateInMemoryContext(dbName);

        // 4 × 50 = 200 de prize pool; "50,30,20" sem jackpot ⇒ 100 / 60 / 40
        var (_, tournamentId, _) = SeedTournament(ctx, prizeStructure: "50,30,20", usePrizeTable: false);

        var detail = await CreateService(ctx).GetTournamentDetailAsync(tournamentId);

        Assert.NotNull(detail);
        Assert.Equal(200m, detail!.PrizePool);
        Assert.Equal(3, detail.Prizes.Count);

        Assert.Equal(1, detail.Prizes[0].Position);
        Assert.Equal(100m, detail.Prizes[0].Amount);
        Assert.Equal(50m, detail.Prizes[0].Percentage);

        Assert.Equal(2, detail.Prizes[1].Position);
        Assert.Equal(60m, detail.Prizes[1].Amount);
        Assert.Equal(30m, detail.Prizes[1].Percentage);

        Assert.Equal(3, detail.Prizes[2].Position);
        Assert.Equal(40m, detail.Prizes[2].Amount);
        Assert.Equal(20m, detail.Prizes[2].Percentage);
    }

    // ── Modo tabela da liga ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetTournamentDetailAsync_LeaguePrizeTable_ReturnsTablePrizes()
    {
        var dbName = $"{nameof(GetTournamentDetailAsync_LeaguePrizeTable_ReturnsTablePrizes)}_{Guid.NewGuid()}";
        await using var ctx = CreateInMemoryContext(dbName);

        // pool = 200; tabela para 200 ⇒ 120 / 50 / 30 (percentuais derivados 60 / 25 / 15)
        var (leagueId, tournamentId, _) = SeedTournament(ctx, prizeStructure: "50,30,20", usePrizeTable: true);

        var prizeTableId = Guid.NewGuid();
        ctx.LeaguePrizeTables.Add(new LeaguePrizeTable
        {
            Id = prizeTableId,
            LeagueId = leagueId,
            Name = "Tabela 200",
            PrizePoolTotal = 200m,
            JackpotAmount = 0m,
            CreatedAt = DateTime.UtcNow,
            Entries =
            {
                new LeaguePrizeTableEntry { Id = Guid.NewGuid(), LeaguePrizeTableId = prizeTableId, Position = 1, PrizeAmount = 120m },
                new LeaguePrizeTableEntry { Id = Guid.NewGuid(), LeaguePrizeTableId = prizeTableId, Position = 2, PrizeAmount = 50m },
                new LeaguePrizeTableEntry { Id = Guid.NewGuid(), LeaguePrizeTableId = prizeTableId, Position = 3, PrizeAmount = 30m },
            }
        });
        await ctx.SaveChangesAsync();

        var detail = await CreateService(ctx).GetTournamentDetailAsync(tournamentId);

        Assert.NotNull(detail);
        Assert.Equal(200m, detail!.PrizePool);
        Assert.Equal(3, detail.Prizes.Count);

        Assert.Equal(120m, detail.Prizes[0].Amount);
        Assert.Equal(60m, detail.Prizes[0].Percentage);
        Assert.Equal(50m, detail.Prizes[1].Amount);
        Assert.Equal(25m, detail.Prizes[1].Percentage);
        Assert.Equal(30m, detail.Prizes[2].Amount);
        Assert.Equal(15m, detail.Prizes[2].Percentage);
    }

    // ── by-invite usa o MESMO mapeamento (DOIS métodos) ─────────────────────────

    [Fact]
    public async Task GetTournamentByInviteCodeAsync_ReturnsDetailWithPrizes()
    {
        var dbName = $"{nameof(GetTournamentByInviteCodeAsync_ReturnsDetailWithPrizes)}_{Guid.NewGuid()}";
        await using var ctx = CreateInMemoryContext(dbName);

        var (_, _, inviteCode) = SeedTournament(ctx, prizeStructure: "50,30,20", usePrizeTable: false, inviteCode: "INVITE99");

        var detail = await CreateService(ctx).GetTournamentByInviteCodeAsync(inviteCode);

        Assert.NotNull(detail);
        Assert.Equal(200m, detail!.PrizePool);
        Assert.Equal(3, detail.Prizes.Count);
        Assert.Equal(100m, detail.Prizes[0].Amount);
        Assert.Equal(50m, detail.Prizes[0].Percentage);
        // players[] também presente no detalhe via by-invite (alimenta o modo TV)
        Assert.Equal(4, detail.Players.Count);
    }

    [Fact]
    public async Task GetTournamentDetailAsync_EmptyPrizePool_ReturnsNoPrizes()
    {
        var dbName = $"{nameof(GetTournamentDetailAsync_EmptyPrizePool_ReturnsNoPrizes)}_{Guid.NewGuid()}";
        await using var ctx = CreateInMemoryContext(dbName);

        // Nenhum jogador com check-in ⇒ prize pool 0 ⇒ lista de prêmios vazia (sem divisão por zero)
        var (_, tournamentId, _) = SeedTournament(ctx, prizeStructure: "50,30,20", usePrizeTable: false, checkedInPlayers: 0);

        var detail = await CreateService(ctx).GetTournamentDetailAsync(tournamentId);

        Assert.NotNull(detail);
        Assert.Equal(0m, detail!.PrizePool);
        Assert.Empty(detail.Prizes);
    }
}
