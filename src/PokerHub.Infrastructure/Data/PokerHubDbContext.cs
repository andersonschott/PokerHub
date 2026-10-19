using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data;

public class PokerHubDbContext : IdentityDbContext<User>, IDataProtectionKeyContext
{
    public PokerHubDbContext(DbContextOptions<PokerHubDbContext> options) : base(options)
    {
    }

    public DbSet<League> Leagues => Set<League>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<TournamentPlayer> TournamentPlayers => Set<TournamentPlayer>();
    public DbSet<BlindLevel> BlindLevels => Set<BlindLevel>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<TournamentExpense> TournamentExpenses => Set<TournamentExpense>();
    public DbSet<TournamentExpenseShare> TournamentExpenseShares => Set<TournamentExpenseShare>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<JackpotContribution> JackpotContributions => Set<JackpotContribution>();
    public DbSet<JackpotUsage> JackpotUsages => Set<JackpotUsage>();
    public DbSet<LeaguePrizeTable> LeaguePrizeTables => Set<LeaguePrizeTable>();
    public DbSet<LeaguePrizeTableEntry> LeaguePrizeTableEntries => Set<LeaguePrizeTableEntry>();
    public DbSet<PlayerSeasonStats> PlayerSeasonStats => Set<PlayerSeasonStats>();
    public DbSet<TournamentDelegate> TournamentDelegates => Set<TournamentDelegate>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OperationLog> OperationLogs => Set<OperationLog>();
    public string? OperationActorId { get; set; }

    /// <summary>Chaves do ASP.NET DataProtection persistidas no banco (sobrevivem a restart/scale do container).</summary>
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Timer updates read the status before persisting. Never let a stale timer
        // overwrite a concurrent finish/cancel or publish a change after closure.
        builder.Entity<Tournament>().Property(t => t.Status).IsConcurrencyToken();

        builder.Entity<OperationLog>(entity =>
        {
            entity.Property(e => e.ScopeType).HasMaxLength(32);
            entity.Property(e => e.Action).HasMaxLength(160);
            entity.Property(e => e.ActorId).HasMaxLength(450);
            entity.HasIndex(e => new { e.ScopeId, e.CreatedAt });
        });

        // Apply all configurations from assembly
        builder.ApplyConfigurationsFromAssembly(typeof(PokerHubDbContext).Assembly);
    }
}
