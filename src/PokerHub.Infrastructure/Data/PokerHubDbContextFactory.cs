using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PokerHub.Infrastructure.Data;

public class PokerHubDbContextFactory : IDesignTimeDbContextFactory<PokerHubDbContext>
{
    public PokerHubDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PokerHubDbContext>();

        // This connection string is only used for design-time operations like migrations
        // The actual connection string will be configured in appsettings.json
        optionsBuilder.UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=PokerHub_Design;Trusted_Connection=True;");

        return new PokerHubDbContext(optionsBuilder.Options);
    }
}
