using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PokerHub.Application.Services;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Tests;

/// <summary>
/// O detalhe do torneio carrega quem pode operar a mesa (dono da liga ou delegado) —
/// a MESMA regra dos guards de endpoint. Antes a SPA rededuzia isso de dois GETs
/// (liga + delegados); qualquer um deles falhando rebaixava o organizador a membro e
/// o botão de desfazer check-in simplesmente sumia da tela.
/// </summary>
public class TournamentDetailPermissionsTests
{
    private const string OrganizerId = "user-organizador";
    private const string DelegateId = "user-delegado";
    private const string MemberId = "user-membro";

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

    private static Guid SeedTournamentWithDelegate(PokerHubDbContext ctx)
    {
        var leagueId = Guid.NewGuid();
        var tournamentId = Guid.NewGuid();

        ctx.Leagues.Add(new League
        {
            Id = leagueId,
            Name = "Liga Permissões",
            InviteCode = "LIGAPERM",
            OrganizerId = OrganizerId,
            JackpotPercentage = 0,
            CreatedAt = DateTime.UtcNow
        });

        ctx.Tournaments.Add(new Tournament
        {
            Id = tournamentId,
            LeagueId = leagueId,
            Name = "Semana 30",
            ScheduledDateTime = DateTime.UtcNow,
            BuyIn = 60m,
            StartingStack = 10000,
            InviteCode = "PERMCODE",
            Status = TournamentStatus.InProgress,
            CurrentLevel = 1,
            CreatedAt = DateTime.UtcNow
        });

        ctx.TournamentDelegates.Add(new TournamentDelegate
        {
            Id = Guid.NewGuid(),
            TournamentId = tournamentId,
            UserId = DelegateId,
            Permissions = DelegatePermissions.All,
            AssignedAt = DateTime.UtcNow,
            AssignedBy = OrganizerId
        });

        ctx.SaveChanges();
        return tournamentId;
    }

    [Theory]
    [InlineData(OrganizerId, true, true)]   // dono da liga
    [InlineData(DelegateId, false, true)]   // delegado do torneio
    [InlineData(MemberId, false, false)]    // membro comum
    public async Task GetTournamentDetailAsync_ExpoeQuemPodeOperar(
        string userId, bool esperaOrganizador, bool esperaOperar)
    {
        await using var ctx = CreateInMemoryContext($"{nameof(GetTournamentDetailAsync_ExpoeQuemPodeOperar)}_{userId}_{Guid.NewGuid()}");
        var tournamentId = SeedTournamentWithDelegate(ctx);

        var detail = await CreateService(ctx).GetTournamentDetailAsync(tournamentId, userId);

        Assert.NotNull(detail);
        Assert.Equal(esperaOrganizador, detail!.IsOrganizer);
        Assert.Equal(esperaOperar, detail.CanOperate);
    }

    [Fact]
    public async Task GetTournamentDetailAsync_SemUsuario_NaoLiberaOperacao()
    {
        // Modo TV / convite público: chamada anônima nunca opera a mesa.
        await using var ctx = CreateInMemoryContext($"{nameof(GetTournamentDetailAsync_SemUsuario_NaoLiberaOperacao)}_{Guid.NewGuid()}");
        var tournamentId = SeedTournamentWithDelegate(ctx);

        var detail = await CreateService(ctx).GetTournamentDetailAsync(tournamentId);

        Assert.NotNull(detail);
        Assert.False(detail!.IsOrganizer);
        Assert.False(detail.CanOperate);
    }

    [Fact]
    public async Task GetTournamentByInviteCodeAsync_NaoLiberaOperacao()
    {
        await using var ctx = CreateInMemoryContext($"{nameof(GetTournamentByInviteCodeAsync_NaoLiberaOperacao)}_{Guid.NewGuid()}");
        SeedTournamentWithDelegate(ctx);

        var detail = await CreateService(ctx).GetTournamentByInviteCodeAsync("PERMCODE");

        Assert.NotNull(detail);
        Assert.False(detail!.CanOperate);
    }
}
