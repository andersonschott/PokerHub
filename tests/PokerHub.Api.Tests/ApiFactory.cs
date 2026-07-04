using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Configuration;
using PokerHub.Api.Email;
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
                ["Jwt:RefreshTokenLifetimeDays"] = "30",
                // Limite alto por padrão para não throttlar a bateria de testes de auth
                // (todos partem do mesmo IP/partição). Testes de rate limit sobrescrevem
                // este valor via WithWebHostBuilder.
                ["RateLimit:Auth:PermitLimit"] = "100000",
                ["Email:AppBaseUrl"] = "http://localhost:5173",
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

            // Garante que NENHUM teste dispara email real: troca o SMTP por um fake capturador.
            services.RemoveAll<IPasswordResetEmailSender>();
            services.AddSingleton<CapturingEmailSender>();
            services.AddSingleton<IPasswordResetEmailSender>(
                sp => sp.GetRequiredService<CapturingEmailSender>());

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
