using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data;

public class PokerHubDbContext : IdentityDbContext<User>
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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Apply all configurations from assembly
        builder.ApplyConfigurationsFromAssembly(typeof(PokerHubDbContext).Assembly);
    }
}
