using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PokerHub.Infrastructure.Data;

public class PokerHubDbContextFactory : IDesignTimeDbContextFactory<PokerHubDbContext>
{
    // Identity's model uses the application service provider, not SchemaVersion's
    // virtual getter. Match the runtime store options when scaffolding migrations.
    private static readonly IServiceProvider DesignServices = new ServiceCollection()
        .Configure<IdentityOptions>(options => options.Stores.SchemaVersion = IdentitySchemaVersions.Version3)
        .BuildServiceProvider();

    public PokerHubDbContext CreateDbContext(string[] args)
    {
        // Never fall back to settings from the discontinued Blazor host.
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "Set ConnectionStrings__DefaultConnection explicitly before running EF tools. " +
                "For the local database, use: bash scripts/dev.sh migrate");

        var optionsBuilder = new DbContextOptionsBuilder<PokerHubDbContext>();
        optionsBuilder.UseSqlServer(connectionString).UseApplicationServiceProvider(DesignServices);

        return new PokerHubDbContext(optionsBuilder.Options);
    }
}
