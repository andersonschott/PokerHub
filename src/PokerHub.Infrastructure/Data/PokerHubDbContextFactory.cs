using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace PokerHub.Infrastructure.Data;

public class PokerHubDbContextFactory : IDesignTimeDbContextFactory<PokerHubDbContext>
{
    public PokerHubDbContext CreateDbContext(string[] args)
    {
        // Build configuration to read from appsettings.json
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../PokerHub.Web"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");

        var optionsBuilder = new DbContextOptionsBuilder<PokerHubDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new PokerHubDbContext(optionsBuilder.Options);
    }
}
