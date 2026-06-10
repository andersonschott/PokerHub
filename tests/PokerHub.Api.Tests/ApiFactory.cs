using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using PokerHub.Infrastructure.Data;
using Testcontainers.MsSql;

namespace PokerHub.Api.Tests;

/// <summary>
/// WebApplicationFactory backed by a real SQL Server 2022 container via Testcontainers.
/// Uses Database.Migrate() so all migrations (including AddRefreshTokens) are exercised.
/// The container is started lazily and thread-safely because ConfigureWebHost runs before
/// xUnit's IAsyncLifetime.InitializeAsync.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MsSqlContainer _sqlContainer = new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-latest")
        .WithPassword("YourStrong!Passw0rd123")
        .WithEnvironment("ACCEPT_EULA", "Y")
        .Build();

    private bool _containerStarted;
    private readonly object _lock = new();

    private string GetConnectionStringSafe()
    {
        EnsureContainerStarted();
        return _sqlContainer.GetConnectionString();
    }

    private void EnsureContainerStarted()
    {
        if (_containerStarted) return;
        lock (_lock)
        {
            if (_containerStarted) return;
            _sqlContainer.StartAsync().GetAwaiter().GetResult();
            _containerStarted = true;
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = GetConnectionStringSafe(),
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

            services.AddDbContext<PokerHubDbContext>(options =>
                options.UseSqlServer(
                    GetConnectionStringSafe(),
                    sqlOptions => sqlOptions.EnableRetryOnFailure(3))
                       .EnableServiceProviderCaching(false)
                       .ConfigureWarnings(w =>
                           w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            scope.ServiceProvider.GetRequiredService<PokerHubDbContext>().Database.Migrate();
        });
    }

    public Task InitializeAsync()
    {
        EnsureContainerStarted();
        return Task.CompletedTask;
    }

    public new async Task DisposeAsync()
    {
        await _sqlContainer.DisposeAsync();
        await base.DisposeAsync();
    }
}
