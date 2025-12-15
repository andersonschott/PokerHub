using Microsoft.EntityFrameworkCore;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Web.Services;

/// <summary>
/// Service that "warms up" the database connection on application startup.
/// Azure SQL databases on lower tiers can go into sleep mode and take 30+ seconds to wake up.
/// This service executes a simple query at startup to wake the database before user requests arrive.
/// </summary>
public class DatabaseWarmupService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseWarmupService> _logger;

    public DatabaseWarmupService(IServiceProvider serviceProvider, ILogger<DatabaseWarmupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting database warmup...");

        var maxRetries = 5;
        var retryDelay = TimeSpan.FromSeconds(10);

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

                // Execute a simple query to wake up the database
                var canConnect = await context.Database.CanConnectAsync(cancellationToken);

                if (canConnect)
                {
                    // Execute a lightweight query to fully warm up the connection pool
                    await context.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
                    _logger.LogInformation("Database warmup completed successfully on attempt {Attempt}", attempt);
                    return;
                }

                _logger.LogWarning("Database warmup attempt {Attempt} failed: Cannot connect", attempt);
            }
            catch (Exception ex) when (attempt < maxRetries)
            {
                _logger.LogWarning(ex, "Database warmup attempt {Attempt} failed, retrying in {Delay}s...",
                    attempt, retryDelay.TotalSeconds);
                await Task.Delay(retryDelay, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database warmup failed after {MaxRetries} attempts. Application will continue but first requests may be slow.", maxRetries);
                // Don't throw - let the application start anyway
                return;
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
