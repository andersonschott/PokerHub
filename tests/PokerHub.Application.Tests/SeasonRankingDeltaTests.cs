using Microsoft.EntityFrameworkCore;
using PokerHub.Application.Services;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Tests;

/// <summary>
/// Cobre os novos campos do ranking (novo card do jogador na classificação):
/// <c>Delta</c> — movimento de posição desde o último torneio da temporada — e
/// <c>RecentResults</c> — últimos 5 resultados (antigo → recente) para os dots de forma.
/// No ranking geral (acumulado) não existe movimento: <c>Delta</c> deve ser null.
/// </summary>
public class SeasonRankingDeltaTests
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

    private static Guid SeedLeague(PokerHubDbContext ctx)
    {
        var leagueId = Guid.NewGuid();
        ctx.Leagues.Add(new League
        {
            Id = leagueId,
            Name = "Liga Delta",
            InviteCode = "DELTA01",
            OrganizerId = "org-user-id",
            CreatedAt = DateTime.UtcNow
        });
        return leagueId;
    }

    private static Guid SeedSeason(PokerHubDbContext ctx, Guid leagueId)
    {
        var seasonId = Guid.NewGuid();
        ctx.Seasons.Add(new Season
        {
            Id = seasonId,
            LeagueId = leagueId,
            Name = "Temporada 1",
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 12, 31),
            IsActive = true
        });
        return seasonId;
    }

    private static Guid SeedPlayer(PokerHubDbContext ctx, Guid leagueId, string name)
    {
        var playerId = Guid.NewGuid();
        ctx.Players.Add(new Player { Id = playerId, LeagueId = leagueId, Name = name });
        return playerId;
    }

    private static void SeedFinishedTournament(
        PokerHubDbContext ctx,
        Guid leagueId,
        DateTime date,
        params (Guid PlayerId, int Position, decimal Prize)[] results)
    {
        var tournamentId = Guid.NewGuid();
        ctx.Tournaments.Add(new Tournament
        {
            Id = tournamentId,
            LeagueId = leagueId,
            Name = $"Torneio {date:dd/MM}",
            ScheduledDateTime = date,
            BuyIn = 50m,
            StartingStack = 5000,
            Status = TournamentStatus.Finished,
            InviteCode = $"T{date:ddMMyy}{results.Length}"
        });

        foreach (var r in results)
        {
            ctx.TournamentPlayers.Add(new TournamentPlayer
            {
                Id = Guid.NewGuid(),
                TournamentId = tournamentId,
                PlayerId = r.PlayerId,
                IsCheckedIn = true,
                Position = r.Position,
                Prize = r.Prize
            });
        }
    }

    [Fact]
    public async Task SeasonRanking_Delta_ReflectsMovementSinceLastTournament()
    {
        using var ctx = CreateInMemoryContext(nameof(SeasonRanking_Delta_ReflectsMovementSinceLastTournament));
        var leagueId = SeedLeague(ctx);
        var seasonId = SeedSeason(ctx, leagueId);
        var ana = SeedPlayer(ctx, leagueId, "Ana");
        var bia = SeedPlayer(ctx, leagueId, "Bia");
        var caio = SeedPlayer(ctx, leagueId, "Caio");

        // T1: Ana campeã (+50), Bia fora (-50). Ranking pós-T1: Ana 1ª, Bia 2ª.
        SeedFinishedTournament(ctx, leagueId, new DateTime(2026, 1, 10),
            (ana, 1, 100m), (bia, 2, 0m));
        // T2 (último): Bia campeã (+70 → total +20), Ana fora (total 0),
        // Caio estreia fora (-50). Ranking atual: Bia 1ª, Ana 2ª, Caio 3º.
        SeedFinishedTournament(ctx, leagueId, new DateTime(2026, 1, 17),
            (bia, 1, 120m), (ana, 2, 0m), (caio, 3, 0m));
        await ctx.SaveChangesAsync();

        var ranking = await new SeasonService(ctx).GetSeasonRankingAsync(seasonId);

        var biaRow = ranking.Single(r => r.PlayerId == bia);
        var anaRow = ranking.Single(r => r.PlayerId == ana);
        var caioRow = ranking.Single(r => r.PlayerId == caio);

        Assert.Equal(1, biaRow.Position);
        Assert.Equal(2, anaRow.Position);
        Assert.Equal(3, caioRow.Position);

        Assert.Equal(1, biaRow.Delta);   // subiu: era 2ª antes do último torneio
        Assert.Equal(-1, anaRow.Delta);  // desceu: era 1ª
        Assert.Equal(0, caioRow.Delta);  // estreante conta como "manteve"
    }

    [Fact]
    public async Task SeasonRanking_RecentResults_AreLastFiveOldestToNewest()
    {
        using var ctx = CreateInMemoryContext(nameof(SeasonRanking_RecentResults_AreLastFiveOldestToNewest));
        var leagueId = SeedLeague(ctx);
        var seasonId = SeedSeason(ctx, leagueId);
        var ana = SeedPlayer(ctx, leagueId, "Ana");

        // 6 torneios: o 1º (posição 6) deve ficar de fora dos últimos 5.
        for (var i = 0; i < 6; i++)
        {
            SeedFinishedTournament(ctx, leagueId, new DateTime(2026, 2, 1).AddDays(i * 7),
                (ana, 6 - i, i >= 4 ? 100m : 0m));
        }
        await ctx.SaveChangesAsync();

        var ranking = await new SeasonService(ctx).GetSeasonRankingAsync(seasonId);
        var row = Assert.Single(ranking);

        Assert.NotNull(row.RecentResults);
        Assert.Equal(5, row.RecentResults!.Count);
        // Posições dos 5 últimos, do mais antigo ao mais novo (o 6º lugar caiu fora).
        Assert.Equal(new int?[] { 5, 4, 3, 2, 1 }, row.RecentResults.Select(r => r.Position).ToArray());
        Assert.Equal(new[] { 0m, 0m, 0m, 100m, 100m }, row.RecentResults.Select(r => r.Prize).ToArray());
    }

    [Fact]
    public async Task LeagueRanking_HidesDelta_ButExposesRecentResults()
    {
        using var ctx = CreateInMemoryContext(nameof(LeagueRanking_HidesDelta_ButExposesRecentResults));
        var leagueId = SeedLeague(ctx);
        var ana = SeedPlayer(ctx, leagueId, "Ana");
        var bia = SeedPlayer(ctx, leagueId, "Bia");

        SeedFinishedTournament(ctx, leagueId, new DateTime(2026, 3, 6),
            (ana, 1, 100m), (bia, 2, 0m));
        await ctx.SaveChangesAsync();

        var ranking = await new RankingService(ctx).GetLeagueRankingAsync(leagueId);

        Assert.All(ranking, r => Assert.Null(r.Delta)); // geral/acumulado: sem movimento
        var anaRow = ranking.Single(r => r.PlayerId == ana);
        var result = Assert.Single(anaRow.RecentResults!);
        Assert.Equal(1, result.Position);
        Assert.Equal(100m, result.Prize);
    }
}
