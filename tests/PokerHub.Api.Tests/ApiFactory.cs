using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Tests;

/// <summary>
/// WebApplicationFactory usando SQLite in-memory (conexão única mantida aberta —
/// o banco vive enquanto a conexão viver). EnsureCreated no lugar de migrations.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "unused-overridden-below",
                ["Jwt:Issuer"] = "pokerhub-test",
                ["Jwt:Audience"] = "pokerhub-api-test",
                ["Jwt:SigningKey"] = "test-signing-key-with-32-plus-characters!",
                ["Jwt:AccessTokenLifetimeMinutes"] = "15",
                ["Jwt:RefreshTokenLifetimeDays"] = "30"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove all EF-related registrations to avoid multiple provider conflict.
            var descriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<PokerHubDbContext>)
                         || d.ServiceType == typeof(PokerHubDbContext)
                         || (d.ServiceType.FullName?.Contains("EntityFrameworkCore") == true
                             && d.ServiceType.FullName.Contains("IDbContextOptions")))
                .ToList();
            foreach (var d in descriptors) services.Remove(d);

            _connection.Open();
            services.AddDbContext<PokerHubDbContext>(options =>
                options.UseSqlite(_connection)
                       .EnableServiceProviderCaching(false));

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            scope.ServiceProvider.GetRequiredService<PokerHubDbContext>().Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection.Dispose();
    }
}
